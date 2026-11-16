import crypto from "node:crypto";
import * as Minio from "minio";
import { env } from "../config/env";

export interface CandidateCvTemplateInput {
  fullName: string;
  email: string;
  phone: string;
  gender?: string | null;
  targetRole?: string;
  experienceYears?: number;
  skills?: string[];
  summary?: string;
}

export interface UploadedSeedCv {
  objectKey: string;
  resumeUrl: string;
  fileName: string;
  sizeBytes: number;
  checksum: string;
}

/**
 * Strips diacritics so standard PDF Type1 Helvetica renders cleanly without missing glyphs.
 */
function toPdfAscii(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .trim();
}

function wrapLines(text: string, maxChars: number): string[] {
  const words = toPdfAscii(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= maxChars) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Generates a valid, viewable single-page A4 PDF 1.4 resume tailored to the candidate.
 */
export function buildCandidateCvPdf(input: CandidateCvTemplateInput): Buffer {
  const name = toPdfAscii(input.fullName) || "Candidate Profile";
  const role = toPdfAscii(input.targetRole || "Software & Product Specialist");
  const contactParts = [
    toPdfAscii(input.email),
    toPdfAscii(input.phone),
    input.gender ? toPdfAscii(input.gender) : "",
    "Vietnam",
  ].filter(Boolean);
  const contactLine = contactParts.join("  |  ");
  const years = input.experienceYears ?? 4;
  const skills = (
    input.skills?.length
      ? input.skills
      : [
          "TypeScript",
          "React / Next.js",
          "Node.js / NestJS",
          "PostgreSQL",
          "System Design",
          "Agile Delivery",
        ]
  )
    .map(toPdfAscii)
    .join("  -  ");
  const summaryText =
    input.summary ||
    `${years}+ years of hands-on experience delivering production ${role} initiatives, collaborating across engineering, product, and hiring teams with strong ownership and measurable impact.`;

  const ops: string[] = [];
  let y = 785;

  const drawText = (
    font: "F1" | "F2",
    size: number,
    x: number,
    yPos: number,
    text: string,
    rgb = "0.10 0.14 0.22",
  ) => {
    ops.push(
      `BT /${font} ${size} Tf ${rgb} rg 1 0 0 1 ${x} ${yPos} Tm (${toPdfAscii(text)}) Tj ET`,
    );
  };

  const drawRule = (yPos: number, rgb = "0.82 0.85 0.90") => {
    ops.push(`0.8 w ${rgb} RG 50 ${yPos} m 545 ${yPos} l S`);
  };

  // Header accent bar
  ops.push("0.14 0.35 0.72 rg 50 806 495 6 re f");
  drawText("F2", 20, 50, y, name, "0.07 0.11 0.18");
  y -= 20;
  drawText("F2", 11, 50, y, role, "0.14 0.35 0.72");
  y -= 16;
  drawText("F1", 9.5, 50, y, contactLine, "0.35 0.40 0.48");
  y -= 14;
  drawRule(y);
  y -= 22;

  const drawSectionHeading = (title: string) => {
    drawText("F2", 11, 50, y, title, "0.14 0.35 0.72");
    y -= 6;
    drawRule(y, "0.88 0.90 0.94");
    y -= 15;
  };

  // Summary
  drawSectionHeading("PROFESSIONAL SUMMARY");
  for (const line of wrapLines(summaryText, 88)) {
    drawText("F1", 10, 50, y, line);
    y -= 14;
  }
  y -= 10;

  // Experience
  drawSectionHeading("WORK EXPERIENCE");
  drawText("F2", 10.5, 50, y, `Senior ${role}  -  HaiHire Partner Tech`);
  drawText("F1", 9.5, 430, y, "2023 - Present", "0.35 0.40 0.48");
  y -= 14;
  for (const bullet of [
    `Led core ${role} deliverables and mentored junior contributors across sprints.`,
    "Improved reliability, latency, and automated test coverage across critical services.",
    "Partnered with cross-functional stakeholders to ship high-priority roadmap milestones.",
  ]) {
    for (const line of wrapLines(`- ${bullet}`, 86)) {
      drawText("F1", 9.5, 58, y, line);
      y -= 13;
    }
  }
  y -= 8;

  drawText("F2", 10.5, 50, y, `${role}  -  VinaCloud Solutions`);
  drawText("F1", 9.5, 430, y, "2020 - 2023", "0.35 0.40 0.48");
  y -= 14;
  for (const bullet of [
    "Designed scalable modules and clean API contracts integrated with PostgreSQL.",
    "Collaborated with QA and DevOps teams to streamline CI/CD releases.",
  ]) {
    for (const line of wrapLines(`- ${bullet}`, 86)) {
      drawText("F1", 9.5, 58, y, line);
      y -= 13;
    }
  }
  y -= 12;

  // Skills
  drawSectionHeading("CORE COMPETENCIES & SKILLS");
  for (const line of wrapLines(skills, 88)) {
    drawText("F1", 10, 50, y, line);
    y -= 14;
  }
  y -= 10;

  // Education
  drawSectionHeading("EDUCATION & LANGUAGES");
  drawText(
    "F2",
    10,
    50,
    y,
    "B.Sc. in Computer Science / Information Systems  -  Hanoi University of Science and Technology",
  );
  y -= 14;
  drawText(
    "F1",
    9.5,
    50,
    y,
    "Languages: Vietnamese (Native), English (Professional Working Proficiency)",
  );

  // Footer
  drawRule(58, "0.88 0.90 0.94");
  drawText(
    "F1",
    8,
    50,
    44,
    `Generated candidate resume for ${name} (${toPdfAscii(input.email)}) - HaiHire ATS`,
    "0.48 0.52 0.58",
  );

  const streamContent = ops.join("\n");
  const streamLen = Buffer.byteLength(streamContent, "utf8");

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n",
    `4 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    "6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
  ];

  const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n", "utf8")];
  let offset = chunks[0].length;
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(offset);
    const buf = Buffer.from(obj, "utf8");
    chunks.push(buf);
    offset += buf.length;
  }

  const xrefStart = offset;
  const xrefLines = [
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`,
    ...offsets
      .slice(1)
      .map((off) => `${String(off).padStart(10, "0")} 00000 n \n`),
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`,
  ];
  chunks.push(Buffer.from(xrefLines.join(""), "utf8"));
  return Buffer.concat(chunks);
}

/**
 * Uploads tailored seed CV PDFs into MinIO under tenants/<orgId>/resumes/ so preview & download work.
 */
export class SeedCvStorage {
  private readonly client: Minio.Client;
  private readonly bucket: string;
  private minioAvailable = true;
  private initialized = false;

  constructor() {
    this.bucket = env.MINIO_BUCKET_NAME || "haihire-resumes";
    this.client = new Minio.Client({
      endPoint: env.MINIO_ENDPOINT || "localhost",
      port: env.MINIO_PORT || 19000,
      useSSL: Boolean(env.MINIO_USE_SSL),
      accessKey: env.MINIO_ACCESS_KEY || "minioadmin",
      secretKey: env.MINIO_SECRET_KEY || "minioadmin",
    });
  }

  async init(): Promise<boolean> {
    if (this.initialized) return this.minioAvailable;
    this.initialized = true;
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket, "us-east-1");
      }
      this.minioAvailable = true;
    } catch (err) {
      this.minioAvailable = false;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `⚠️ MinIO unreachable during seed (${msg}); skipping binary upload and seeding StoredFile metadata only.`,
      );
    }
    return this.minioAvailable;
  }

  async uploadCandidateCv(
    organizationId: string,
    fileName: string,
    template: CandidateCvTemplateInput,
  ): Promise<UploadedSeedCv> {
    await this.init();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const objectKey = `tenants/${organizationId}/resumes/${cleanFileName}`;
    const pdfBuffer = buildCandidateCvPdf(template);
    const checksum = crypto
      .createHash("sha256")
      .update(pdfBuffer)
      .digest("hex");

    if (this.minioAvailable) {
      await this.client.putObject(
        this.bucket,
        objectKey,
        pdfBuffer,
        pdfBuffer.length,
        {
          "Content-Type": "application/pdf",
        },
      );
    }

    return {
      objectKey,
      resumeUrl: `/${this.bucket}/${objectKey}`,
      fileName: cleanFileName,
      sizeBytes: pdfBuffer.length,
      checksum,
    };
  }
}
