import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MinioService } from "../minio/minio.service";
import { PrismaService } from "../prisma.service";
import { CreateApplicationDto } from "./dto/create-application.dto";
import { ApplicationStage, UpdateStageDto } from "./dto/update-stage.dto";
import { UpdateCandidateDto } from "./dto/update-candidate.dto";

export interface ApplicationDocument {
  id: string;
  name: string;
  url: string;
  size?: number | null;
  mimeType?: string | null;
  type?: string;
  createdAt: string;
}

export function fixUtf8String(str?: string | null): string {
  if (!str) return "";
  try {
    const fixed = Buffer.from(str, "latin1").toString("utf8");
    if (fixed && !fixed.includes("\ufffd") && fixed !== str) {
      return fixed.normalize("NFC");
    }
  } catch {
    // ignore
  }
  return str.normalize("NFC");
}

function extractDocsFromNotes(
  notes: string | null,
  fallback?: {
    id: string;
    url: string;
    name: string;
    size?: number | null;
    mimeType?: string | null;
    createdAt?: string | Date;
  },
): ApplicationDocument[] {
  let docs: ApplicationDocument[] = [];
  if (notes) {
    const match = notes.match(/Docs:\s*(\[[^\]]*\])/);
    if (match) {
      try {
        const rawDocs = JSON.parse(match[1]);
        if (Array.isArray(rawDocs)) {
          docs = rawDocs.map((d: any) => ({
            ...d,
            name: fixUtf8String(d.name || "document.pdf"),
          }));
        }
      } catch {
        docs = [];
      }
    }
  }

  if (
    docs.length === 0 &&
    fallback &&
    fallback.url &&
    fallback.url.trim() !== ""
  ) {
    docs.push({
      id: `doc-${fallback.id}`,
      name: fixUtf8String(fallback.name || "Resume.pdf"),
      url: fallback.url,
      size: fallback.size,
      mimeType: fallback.mimeType || "application/pdf",
      type: "Resume",
      createdAt: fallback.createdAt
        ? new Date(fallback.createdAt).toISOString()
        : new Date().toISOString(),
    });
  }

  return docs;
}

function packDocsIntoNotes(
  existingNotes: string | null,
  docs: ApplicationDocument[],
): string {
  const cleanNotes = (existingNotes || "")
    .replace(/Docs:\s*\[[^\]]*\]\|?/gi, "")
    .trim();
  const docsSegment = `Docs:${JSON.stringify(docs)}`;
  if (!cleanNotes) {
    return docsSegment;
  }
  return `${cleanNotes} | ${docsSegment}`;
}

@Injectable()
export class ApplicationsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(MinioService)
    private readonly minioService: MinioService,
  ) {}

  async findByJob(jobId: string) {
    const job = await this.prisma.db.orm.public.Job.select("id", "title")
      .where((j) => j.id.eq(jobId))
      .first();

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    const applications = await this.prisma.db.orm.public.Application.select(
      "id",
      "jobId",
      "candidateName",
      "candidateEmail",
      "candidatePhone",
      "stage",
      "resumeUrl",
      "resumeFileName",
      "resumeFileSize",
      "resumeMimeType",
      "notes",
      "orderIndex",
      "createdAt",
      "updatedAt",
    )
      .where((a) => a.jobId.eq(jobId))
      .all();

    return applications.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async findAll(organizationId?: string) {
    if (!organizationId) {
      return [];
    }

    const jobs = await this.prisma.db.orm.public.Job.select("id")
      .where((j) => j.organizationId.eq(organizationId))
      .all();
    const jobIds = new Set(jobs.map((j) => j.id));

    if (jobIds.size === 0) {
      return [];
    }

    const allApps = await this.prisma.db.orm.public.Application.select(
      "id",
      "jobId",
      "candidateName",
      "candidateEmail",
      "candidatePhone",
      "stage",
      "resumeUrl",
      "resumeFileName",
      "resumeFileSize",
      "resumeMimeType",
      "notes",
      "orderIndex",
      "createdAt",
      "updatedAt",
    ).all();

    return allApps.filter((a) => a.jobId && jobIds.has(a.jobId));
  }

  async findOne(id: string) {
    const app = await this.prisma.db.orm.public.Application.select(
      "id",
      "jobId",
      "candidateName",
      "candidateEmail",
      "candidatePhone",
      "stage",
      "resumeUrl",
      "resumeFileName",
      "resumeFileSize",
      "resumeMimeType",
      "notes",
      "orderIndex",
      "createdAt",
      "updatedAt",
    )
      .where((a) => a.id.eq(id))
      .first();

    if (!app) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }

    let job = null;
    if (app.jobId) {
      job = await this.prisma.db.orm.public.Job.select(
        "id",
        "title",
        "department",
        "location",
      )
        .where((j) => j.id.eq(app.jobId as string))
        .first();
    }

    return {
      ...app,
      job,
    };
  }

  async create(dto: CreateApplicationDto, file?: Express.Multer.File) {
    if (dto.jobId) {
      const job = await this.prisma.db.orm.public.Job.select("id", "title")
        .where((j) => j.id.eq(dto.jobId as string))
        .first();

      if (!job) {
        throw new NotFoundException(`Job with ID ${dto.jobId} not found`);
      }
    }

    // 1. Upload CV to MinIO S3 Object Storage if file is provided
    let uploadResult: { url: string; originalName: string; size: number; mimeType: string } = {
      url: "",
      originalName: "Candidate Profile",
      size: 0,
      mimeType: "application/pdf",
    };

    if (file) {
      uploadResult = await this.minioService.uploadFile(file, "resumes");
    } else if (dto.resumeUrl) {
      uploadResult = {
        url: dto.resumeUrl,
        originalName: dto.resumeFileName || "Candidate Profile",
        size: 0,
        mimeType: "application/pdf",
      };
    }

    // 2. Determine highest orderIndex in APPLIED stage for the target job
    let maxOrder = 0;
    if (dto.jobId) {
      const existingInStage = await this.prisma.db.orm.public.Application.select(
        "id",
        "orderIndex",
      )
        .where((a) => a.jobId.eq(dto.jobId as string))
        .all();

      maxOrder = existingInStage.reduce(
        (max, item) => Math.max(max, item.orderIndex),
        -1,
      );
    }

    // 3. Save Application record in PostgreSQL via Prisma
    const created = await this.prisma.db.orm.public.Application.upsert({
      create: {
        jobId: dto.jobId ?? null,
        candidateName: dto.candidateName,
        candidateEmail: dto.candidateEmail,
        candidatePhone: dto.candidatePhone ?? null,
        stage: "APPLIED",
        resumeUrl: uploadResult.url,
        resumeFileName: uploadResult.originalName,
        resumeFileSize: uploadResult.size,
        resumeMimeType: uploadResult.mimeType,
        notes: dto.notes ?? null,
        orderIndex: maxOrder + 1,
      },
      update: {},
      conflictOn: { id: "00000000-0000-0000-0000-000000000000" },
    });

    return created;
  }

  async updateStage(id: string, dto: UpdateStageDto) {
    await this.findOne(id);

    const updated = await this.prisma.db.orm.public.Application.where(
      (a) => a.id.eq(id),
    ).update({
      stage: dto.stage,
      ...(dto.orderIndex !== undefined ? { orderIndex: dto.orderIndex } : {}),
    });

    return updated;
  }

  async updateCandidate(id: string, dto: UpdateCandidateDto) {
    const existing = await this.findOne(id);

    const updatePayload: Record<string, any> = {};
    if (dto.candidateName !== undefined) updatePayload.candidateName = dto.candidateName;
    if (dto.candidateEmail !== undefined) updatePayload.candidateEmail = dto.candidateEmail;
    if (dto.candidatePhone !== undefined) updatePayload.candidatePhone = dto.candidatePhone;
    if (dto.notes !== undefined) updatePayload.notes = dto.notes;
    if (dto.resumeUrl !== undefined) updatePayload.resumeUrl = dto.resumeUrl;
    if (dto.resumeFileName !== undefined) updatePayload.resumeFileName = dto.resumeFileName;

    // Update target application
    await this.prisma.db.orm.public.Application.where((a) => a.id.eq(id)).update(updatePayload);

    // Synchronize candidate contact info across all records with previous candidate email
    if (dto.candidateName || dto.candidatePhone !== undefined || dto.candidateEmail) {
      const syncPayload: Record<string, any> = {};
      if (dto.candidateName) syncPayload.candidateName = dto.candidateName;
      if (dto.candidatePhone !== undefined) syncPayload.candidatePhone = dto.candidatePhone;
      if (dto.candidateEmail) syncPayload.candidateEmail = dto.candidateEmail;
      if (dto.notes !== undefined) syncPayload.notes = dto.notes;

      await this.prisma.db.orm.public.Application.where(
        (a) => a.candidateEmail.eq(existing.candidateEmail),
      ).update(syncPayload);
    }

    return this.findOne(id);
  }

  async uploadDocument(
    id: string,
    file: Express.Multer.File,
    documentType = "Resume",
  ) {
    const existing = await this.findOne(id);

    if (!file) {
      throw new BadRequestException("No document file provided");
    }

    const cleanOriginalName = fixUtf8String(
      file.originalname || "document.pdf",
    );

    let uploadResult: {
      url: string;
      originalName: string;
      size: number;
      mimeType: string;
    } = {
      url: `/uploads/${Date.now()}-${cleanOriginalName}`,
      originalName: cleanOriginalName,
      size: file.size || 0,
      mimeType: file.mimetype || "application/pdf",
    };

    try {
      uploadResult = await this.minioService.uploadFile(file, "resumes");
      uploadResult.originalName = cleanOriginalName;
    } catch {
      uploadResult = {
        url: `/uploads/${Date.now()}-${cleanOriginalName}`,
        originalName: cleanOriginalName,
        size: file.size,
        mimeType: file.mimetype,
      };
    }

    const currentDocs = extractDocsFromNotes(existing.notes, {
      id: existing.id,
      url: existing.resumeUrl,
      name: existing.resumeFileName,
      size: existing.resumeFileSize,
      mimeType: existing.resumeMimeType,
      createdAt: existing.createdAt,
    });

    const newDoc: ApplicationDocument = {
      id: `doc-${Date.now()}`,
      name: uploadResult.originalName,
      url: uploadResult.url,
      size: uploadResult.size,
      mimeType: uploadResult.mimeType,
      type: documentType || "Resume",
      createdAt: new Date().toISOString(),
    };

    currentDocs.push(newDoc);

    const updatedNotes = packDocsIntoNotes(existing.notes, currentDocs);

    await this.prisma.db.orm.public.Application.where(
      (a) => a.candidateEmail.eq(existing.candidateEmail),
    ).update({
      resumeUrl: currentDocs[0].url,
      resumeFileName: currentDocs[0].name,
      resumeFileSize: currentDocs[0].size ?? null,
      resumeMimeType: currentDocs[0].mimeType ?? null,
      notes: updatedNotes,
    });

    return this.findOne(id);
  }

  async deleteDocument(
    id: string,
    opts?: { documentId?: string; url?: string },
  ) {
    const existing = await this.findOne(id);

    const currentDocs = extractDocsFromNotes(existing.notes, {
      id: existing.id,
      url: existing.resumeUrl,
      name: existing.resumeFileName,
      size: existing.resumeFileSize,
      mimeType: existing.resumeMimeType,
      createdAt: existing.createdAt,
    });

    let updatedDocs: ApplicationDocument[] = [];
    if (opts?.documentId) {
      updatedDocs = currentDocs.filter((d) => d.id !== opts.documentId);
    } else if (opts?.url) {
      updatedDocs = currentDocs.filter((d) => d.url !== opts.url);
    } else {
      updatedDocs = [];
    }

    const updatedNotes = packDocsIntoNotes(existing.notes, updatedDocs);

    if (updatedDocs.length > 0) {
      await this.prisma.db.orm.public.Application.where(
        (a) => a.candidateEmail.eq(existing.candidateEmail),
      ).update({
        resumeUrl: updatedDocs[0].url,
        resumeFileName: updatedDocs[0].name,
        resumeFileSize: updatedDocs[0].size ?? null,
        resumeMimeType: updatedDocs[0].mimeType ?? null,
        notes: updatedNotes,
      });
    } else {
      await this.prisma.db.orm.public.Application.where(
        (a) => a.candidateEmail.eq(existing.candidateEmail),
      ).update({
        resumeUrl: "",
        resumeFileName: "",
        resumeFileSize: null,
        resumeMimeType: null,
        notes: updatedNotes,
      });
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    const app = await this.findOne(id);

    // Check if candidate has other records
    const allCandidateRecords = await this.prisma.db.orm.public.Application.select(
      "id",
      "jobId",
      "candidateEmail",
    )
      .where((a) => a.candidateEmail.eq(app.candidateEmail))
      .all();

    const otherRecords = allCandidateRecords.filter((r) => r.id !== id);

    if (otherRecords.length > 0) {
      // Other applications or talent pool records exist, delete this application record
      await this.prisma.db.orm.public.Application.where((a) => a.id.eq(id)).delete();
    } else {
      // This is the candidate's only record in database.
      // Detach from the job so the application is deleted from the job/applications list,
      // but the candidate is preserved in the Talent Pool.
      await this.prisma.db.orm.public.Application.where((a) => a.id.eq(id)).update({
        jobId: null,
      });
    }

    return { success: true, message: `Application ${id} deleted successfully` };
  }
}
