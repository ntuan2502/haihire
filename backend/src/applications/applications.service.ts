import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MinioService } from "../minio/minio.service";
import { PrismaService } from "../prisma.service";
import { CreateApplicationDto } from "./dto/create-application.dto";
import { UpdateStageDto } from "./dto/update-stage.dto";
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

export function extractDocsFromNotes(
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

export function packDocsIntoNotes(
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
      "candidateId",
      "jobId",
      "stage",
      "matchScore",
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

    const candidateIds = [...new Set(applications.map((a) => a.candidateId))];
    const candidates = await this.prisma.db.orm.public.Candidate.select(
      "id",
      "name",
      "firstName",
      "lastName",
      "gender",
      "dateOfBirth",
      "email",
      "phone",
      "resumeUrl",
      "resumeFileName",
      "resumeFileSize",
      "resumeMimeType",
    ).all();
    const candidateMap = new Map(candidates.map((c) => [c.id, c]));

    const allInterviews = await this.prisma.db.orm.public.Interview.all();
    const interviewsByApp = new Map<string, any[]>();
    for (const intv of allInterviews) {
      const list = interviewsByApp.get(intv.applicationId) || [];
      let parsedScorecard: any = null;
      if (intv.scorecard) {
        try {
          parsedScorecard = JSON.parse(intv.scorecard);
        } catch {
          parsedScorecard = null;
        }
      }
      list.push({
        ...intv,
        type: fixUtf8String(intv.type),
        linkOrLocation: fixUtf8String(intv.linkOrLocation),
        interviewer: fixUtf8String(intv.interviewer),
        scorecard: parsedScorecard,
        notes: intv.notes ? fixUtf8String(intv.notes) : null,
      });
      interviewsByApp.set(intv.applicationId, list);
    }

    const populated = applications.map((app) => {
      const candidate = candidateMap.get(app.candidateId);
      return {
        ...app,
        candidate,
        candidateName: candidate?.name || "Unknown",
        candidateEmail: candidate?.email || "",
        candidatePhone: candidate?.phone || null,
        resumeUrl: app.resumeUrl || candidate?.resumeUrl || "",
        resumeFileName: app.resumeFileName || candidate?.resumeFileName || "Resume.pdf",
        resumeFileSize: app.resumeFileSize ?? candidate?.resumeFileSize ?? null,
        resumeMimeType: app.resumeMimeType ?? candidate?.resumeMimeType ?? "application/pdf",
        interviews: interviewsByApp.get(app.id) || [],
      };
    });

    return populated.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async findAll(organizationId?: string) {
    if (!organizationId) {
      return [];
    }

    const jobs = await this.prisma.db.orm.public.Job.select(
      "id",
      "title",
      "department",
      "location",
    )
      .where((j) => j.organizationId.eq(organizationId))
      .all();

    const jobMap = new Map(jobs.map((j) => [j.id, j]));
    if (jobMap.size === 0) {
      return [];
    }

    const allApps = await this.prisma.db.orm.public.Application.select(
      "id",
      "candidateId",
      "jobId",
      "stage",
      "matchScore",
      "resumeUrl",
      "resumeFileName",
      "resumeFileSize",
      "resumeMimeType",
      "notes",
      "orderIndex",
      "createdAt",
      "updatedAt",
    ).all();

    const orgApps = allApps.filter((a) => jobMap.has(a.jobId));
    if (orgApps.length === 0) {
      return [];
    }

    const candidates = await this.prisma.db.orm.public.Candidate.select(
      "id",
      "name",
      "firstName",
      "lastName",
      "gender",
      "dateOfBirth",
      "email",
      "phone",
      "resumeUrl",
      "resumeFileName",
      "resumeFileSize",
      "resumeMimeType",
    ).all();
    const candidateMap = new Map(candidates.map((c) => [c.id, c]));

    const allInterviews = await this.prisma.db.orm.public.Interview.all();
    const interviewsByApp = new Map<string, any[]>();
    for (const intv of allInterviews) {
      const list = interviewsByApp.get(intv.applicationId) || [];
      let parsedScorecard: any = null;
      if (intv.scorecard) {
        try {
          parsedScorecard = JSON.parse(intv.scorecard);
        } catch {
          parsedScorecard = null;
        }
      }
      list.push({
        ...intv,
        type: fixUtf8String(intv.type),
        linkOrLocation: fixUtf8String(intv.linkOrLocation),
        interviewer: fixUtf8String(intv.interviewer),
        scorecard: parsedScorecard,
        notes: intv.notes ? fixUtf8String(intv.notes) : null,
      });
      interviewsByApp.set(intv.applicationId, list);
    }

    return orgApps.map((app) => {
      const candidate = candidateMap.get(app.candidateId);
      const job = jobMap.get(app.jobId);
      return {
        ...app,
        job,
        candidate,
        candidateName: candidate?.name || "Unknown",
        candidateEmail: candidate?.email || "",
        candidatePhone: candidate?.phone || null,
        resumeUrl: app.resumeUrl || candidate?.resumeUrl || "",
        resumeFileName: app.resumeFileName || candidate?.resumeFileName || "Resume.pdf",
        resumeFileSize: app.resumeFileSize ?? candidate?.resumeFileSize ?? null,
        resumeMimeType: app.resumeMimeType ?? candidate?.resumeMimeType ?? "application/pdf",
        interviews: interviewsByApp.get(app.id) || [],
      };
    });
  }

  async findOne(id: string) {
    const app = await this.prisma.db.orm.public.Application.select(
      "id",
      "candidateId",
      "jobId",
      "stage",
      "matchScore",
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

    const job = await this.prisma.db.orm.public.Job.select(
      "id",
      "title",
      "department",
      "location",
      "organizationId",
    )
      .where((j) => j.id.eq(app.jobId))
      .first();

    const candidate = await this.prisma.db.orm.public.Candidate.select(
      "id",
      "name",
      "firstName",
      "lastName",
      "gender",
      "dateOfBirth",
      "email",
      "phone",
      "notes",
      "resumeUrl",
      "resumeFileName",
      "resumeFileSize",
      "resumeMimeType",
      "createdAt",
    )
      .where((c) => c.id.eq(app.candidateId))
      .first();

    const allInterviews = await this.prisma.db.orm.public.Interview.all();
    const appInterviews = allInterviews
      .filter((i) => i.applicationId === id)
      .map((intv) => {
        let parsedScorecard: any = null;
        if (intv.scorecard) {
          try {
            parsedScorecard = JSON.parse(intv.scorecard);
          } catch {
            parsedScorecard = null;
          }
        }
        return {
          ...intv,
          type: fixUtf8String(intv.type),
          linkOrLocation: fixUtf8String(intv.linkOrLocation),
          interviewer: fixUtf8String(intv.interviewer),
          scorecard: parsedScorecard,
          notes: intv.notes ? fixUtf8String(intv.notes) : null,
        };
      });

    return {
      ...app,
      job: job || null,
      candidate: candidate || null,
      candidateName: candidate?.name || "Unknown",
      candidateEmail: candidate?.email || "",
      candidatePhone: candidate?.phone || null,
      resumeUrl: app.resumeUrl || candidate?.resumeUrl || "",
      resumeFileName: app.resumeFileName || candidate?.resumeFileName || "Resume.pdf",
      resumeFileSize: app.resumeFileSize ?? candidate?.resumeFileSize ?? null,
      resumeMimeType: app.resumeMimeType ?? candidate?.resumeMimeType ?? "application/pdf",
      interviews: appInterviews,
    };
  }

  async create(dto: CreateApplicationDto, file?: Express.Multer.File) {
    if (!dto.jobId) {
      throw new BadRequestException("Job ID is required to create an application.");
    }

    const job = await this.prisma.db.orm.public.Job.select("id", "title", "status", "organizationId")
      .where((j) => j.id.eq(dto.jobId))
      .first();

    if (!job) {
      throw new NotFoundException(`Job with ID ${dto.jobId} not found`);
    }

    if (job.status !== "PUBLISHED") {
      throw new BadRequestException("This job is not currently accepting applications.");
    }

    // 1. Upload CV to MinIO S3 Object Storage if file is provided
    let uploadResult: { url: string; originalName: string; size: number; mimeType: string } = {
      url: "",
      originalName: "Candidate Resume",
      size: 0,
      mimeType: "application/pdf",
    };

    if (file) {
      uploadResult = await this.minioService.uploadFile(file, "resumes");
    } else if (dto.resumeUrl) {
      uploadResult = {
        url: dto.resumeUrl,
        originalName: dto.resumeFileName || "Candidate Resume",
        size: 0,
        mimeType: "application/pdf",
      };
    }

    // 2. Resolve or create Candidate
    let candidateId = dto.candidateId;

    if (!candidateId) {
      if (!dto.candidateEmail || !dto.candidateName) {
        throw new BadRequestException("Either candidateId or both candidateName and candidateEmail are required.");
      }

      const email = dto.candidateEmail.trim().toLowerCase();
      const orgId = job.organizationId;
      if (!orgId) {
        throw new BadRequestException("Target job does not belong to a valid organization.");
      }

      const existingCandidate = await this.prisma.db.orm.public.Candidate.select("id")
        .where((c) => c.organizationId.eq(orgId))
        .where((c) => c.email.eq(email))
        .first();

      if (existingCandidate) {
        candidateId = existingCandidate.id;
      } else {
        const newCandidate = await this.prisma.db.orm.public.Candidate.create({
          organizationId: orgId,
          name: dto.candidateName.trim(),
          email,
          phone: dto.candidatePhone?.trim() || null,
          notes: dto.notes || null,
          resumeUrl: uploadResult.url || null,
          resumeFileName: uploadResult.originalName || null,
          resumeFileSize: uploadResult.size || null,
          resumeMimeType: uploadResult.mimeType || "application/pdf",
        });
        candidateId = newCandidate.id;
      }
    }

    // 3. Enforce: One application per job per candidate
    const existingApplication = await this.prisma.db.orm.public.Application.select("id")
      .where((a) => a.candidateId.eq(candidateId as string))
      .where((a) => a.jobId.eq(dto.jobId))
      .first();

    if (existingApplication) {
      throw new ConflictException("Candidate has already applied to this job.");
    }

    // 4. Determine highest orderIndex in APPLIED stage for the target job
    const existingInStage = await this.prisma.db.orm.public.Application.select(
      "id",
      "orderIndex",
    )
      .where((a) => a.jobId.eq(dto.jobId))
      .all();

    const maxOrder = existingInStage.reduce(
      (max, item) => Math.max(max, item.orderIndex),
      -1,
    );

    // 5. Save Application record
    const created = await this.prisma.db.orm.public.Application.create({
      candidateId: candidateId as string,
      jobId: dto.jobId,
      stage: "APPLIED",
      resumeUrl: uploadResult.url || null,
      resumeFileName: uploadResult.originalName || null,
      resumeFileSize: uploadResult.size || null,
      resumeMimeType: uploadResult.mimeType || "application/pdf",
      notes: dto.notes || null,
      orderIndex: maxOrder + 1,
    });

    return this.findOne(created.id);
  }

  async updateStage(id: string, dto: UpdateStageDto) {
    await this.findOne(id);

    await this.prisma.db.orm.public.Application.where(
      (a) => a.id.eq(id),
    ).update({
      stage: dto.stage,
      ...(dto.orderIndex !== undefined ? { orderIndex: dto.orderIndex } : {}),
    });

    return this.findOne(id);
  }

  async updateCandidate(id: string, dto: UpdateCandidateDto) {
    const existing = await this.findOne(id);

    // Update candidate profile directly
    if (existing.candidateId) {
      const candidateUpdate: Record<string, any> = {};
      if (dto.candidateName !== undefined) candidateUpdate.name = dto.candidateName;
      if (dto.candidateEmail !== undefined) candidateUpdate.email = dto.candidateEmail.toLowerCase();
      if (dto.candidatePhone !== undefined) candidateUpdate.phone = dto.candidatePhone;
      if (dto.notes !== undefined) candidateUpdate.notes = dto.notes;
      if (dto.resumeUrl !== undefined) candidateUpdate.resumeUrl = dto.resumeUrl;
      if (dto.resumeFileName !== undefined) candidateUpdate.resumeFileName = dto.resumeFileName;

      await this.prisma.db.orm.public.Candidate.where(
        (c) => c.id.eq(existing.candidateId),
      ).update(candidateUpdate);
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
      (a) => a.id.eq(id),
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
        (a) => a.id.eq(id),
      ).update({
        resumeUrl: updatedDocs[0].url,
        resumeFileName: updatedDocs[0].name,
        resumeFileSize: updatedDocs[0].size ?? null,
        resumeMimeType: updatedDocs[0].mimeType ?? null,
        notes: updatedNotes,
      });
    } else {
      await this.prisma.db.orm.public.Application.where(
        (a) => a.id.eq(id),
      ).update({
        resumeUrl: null,
        resumeFileName: null,
        resumeFileSize: null,
        resumeMimeType: null,
        notes: updatedNotes,
      });
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.db.orm.public.Application.where((a) => a.id.eq(id)).delete();
    return { success: true, message: `Application ${id} deleted successfully` };
  }
}
