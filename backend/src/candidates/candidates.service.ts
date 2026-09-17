import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MinioService } from "../minio/minio.service";
import { PrismaService } from "../prisma.service";
import { CreateCandidateDto } from "./dto/create-candidate.dto";
import { UpdateCandidateDto } from "./dto/update-candidate.dto";
import { fixUtf8String } from "../applications/applications.service";

export interface CandidateDocument {
  id: string;
  name: string;
  url: string;
  size?: number | null;
  mimeType?: string | null;
  type?: string;
  createdAt: string;
  sourceApplicationId?: string;
  jobTitle?: string;
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
): CandidateDocument[] {
  let docs: CandidateDocument[] = [];
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
  docs: CandidateDocument[],
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
export class CandidatesService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(MinioService)
    private readonly minioService: MinioService,
  ) {}

  async findAll(organizationId?: string) {
    if (!organizationId) {
      return [];
    }

    const candidates = await this.prisma.db.orm.public.Candidate.select(
      "id",
      "organizationId",
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
      "updatedAt",
    )
      .where((c) => c.organizationId.eq(organizationId))
      .all();

    // Fetch all applications for these candidates
    const candidateIds = new Set(candidates.map((c) => c.id));
    const allApps = await this.prisma.db.orm.public.Application.select(
      "id",
      "candidateId",
      "jobId",
      "stage",
      "createdAt",
    ).all();

    const appsByCandidate = new Map<string, typeof allApps>();
    for (const app of allApps) {
      if (candidateIds.has(app.candidateId)) {
        const list = appsByCandidate.get(app.candidateId) || [];
        list.push(app);
        appsByCandidate.set(app.candidateId, list);
      }
    }

    return candidates.map((c) => {
      const apps = appsByCandidate.get(c.id) || [];
      return {
        ...c,
        applicationsCount: apps.length,
        applications: apps,
      };
    });
  }

  async findOne(id: string) {
    const candidate = await this.prisma.db.orm.public.Candidate.select(
      "id",
      "organizationId",
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
      "updatedAt",
    )
      .where((c) => c.id.eq(id))
      .first();

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }

    // Fetch all applications for this candidate
    const applications = await this.prisma.db.orm.public.Application.select(
      "id",
      "candidateId",
      "jobId",
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
      .where((a) => a.candidateId.eq(id))
      .all();

    // Fetch jobs for each application
    const jobIds = [...new Set(applications.map((a) => a.jobId))];
    const jobs = await this.prisma.db.orm.public.Job.select(
      "id",
      "title",
      "department",
      "location",
    ).all();
    const jobMap = new Map(jobs.map((j) => [j.id, j]));

    const populatedApps = applications.map((app) => ({
      ...app,
      job: jobMap.get(app.jobId) || null,
      candidateName: candidate.name,
      candidateEmail: candidate.email,
      candidatePhone: candidate.phone,
    }));

    // Aggregate all documents: candidate's documents + all documents from applications
    const candidateDirectDocs = extractDocsFromNotes(candidate.notes, {
      id: candidate.id,
      url: candidate.resumeUrl || "",
      name: candidate.resumeFileName || "Resume.pdf",
      size: candidate.resumeFileSize,
      mimeType: candidate.resumeMimeType,
      createdAt: candidate.createdAt,
    });

    const allDocuments: CandidateDocument[] = [...candidateDirectDocs];
    const seenUrls = new Set(allDocuments.map((d) => d.url).filter(Boolean));

    for (const app of populatedApps) {
      const appDocs = extractDocsFromNotes(app.notes, {
        id: app.id,
        url: app.resumeUrl || "",
        name: app.resumeFileName || "Application_Resume.pdf",
        size: app.resumeFileSize,
        mimeType: app.resumeMimeType,
        createdAt: app.createdAt,
      });

      for (const d of appDocs) {
        if (d.url && !seenUrls.has(d.url)) {
          seenUrls.add(d.url);
          allDocuments.push({
            ...d,
            sourceApplicationId: app.id,
            jobTitle: app.job?.title || "Job Application",
          });
        }
      }
    }

    return {
      ...candidate,
      applications: populatedApps,
      applicationsCount: populatedApps.length,
      allDocuments,
    };
  }

  async create(
    dto: CreateCandidateDto,
    file?: Express.Multer.File,
    defaultOrgId?: string,
  ) {
    const orgId = dto.organizationId || defaultOrgId;
    if (!orgId) {
      throw new BadRequestException("Organization ID is required");
    }

    const email = dto.email.trim().toLowerCase();

    // Check unique email per organization
    const existing = await this.prisma.db.orm.public.Candidate.select("id")
      .where((c) => c.organizationId.eq(orgId))
      .where((c) => c.email.eq(email))
      .first();

    if (existing) {
      throw new ConflictException("A candidate with this email already exists in your organization");
    }

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

    let dateOfBirth: Date | null = null;
    if (dto.dateOfBirth && dto.dateOfBirth.trim() && dto.dateOfBirth !== "—") {
      const parsed = new Date(dto.dateOfBirth.trim());
      if (!isNaN(parsed.getTime())) {
        dateOfBirth = parsed;
      }
    }

    let firstName = dto.firstName?.trim() || null;
    let lastName = dto.lastName?.trim() || null;
    if (!firstName && !lastName && dto.name) {
      const parts = dto.name.trim().split(/\s+/);
      if (parts.length > 1) {
        firstName = parts[0];
        lastName = parts.slice(1).join(" ");
      } else {
        firstName = parts[0] || null;
      }
    }

    const created = await this.prisma.db.orm.public.Candidate.create({
      organizationId: orgId,
      name: dto.name.trim(),
      firstName,
      lastName,
      gender: dto.gender && dto.gender !== "Not specified" && dto.gender !== "—" ? dto.gender : null,
      dateOfBirth,
      email,
      phone: dto.phone?.trim() || null,
      notes: dto.notes || null,
      resumeUrl: uploadResult.url || null,
      resumeFileName: uploadResult.originalName || null,
      resumeFileSize: uploadResult.size || null,
      resumeMimeType: uploadResult.mimeType || "application/pdf",
    });

    return created;
  }

  async update(id: string, dto: UpdateCandidateDto) {
    await this.findOne(id);

    const updatePayload: Record<string, any> = {};
    if (dto.name !== undefined) updatePayload.name = dto.name.trim();
    if (dto.firstName !== undefined) updatePayload.firstName = dto.firstName?.trim() || null;
    if (dto.lastName !== undefined) updatePayload.lastName = dto.lastName?.trim() || null;
    if (dto.gender !== undefined) {
      updatePayload.gender = dto.gender && dto.gender !== "Not specified" && dto.gender !== "—" ? dto.gender : null;
    }
    if (dto.dateOfBirth !== undefined) {
      if (dto.dateOfBirth && dto.dateOfBirth.trim() && dto.dateOfBirth !== "—") {
        const parsed = new Date(dto.dateOfBirth.trim());
        updatePayload.dateOfBirth = !isNaN(parsed.getTime()) ? parsed : null;
      } else {
        updatePayload.dateOfBirth = null;
      }
    }
    if (dto.email !== undefined) updatePayload.email = dto.email.trim().toLowerCase();
    if (dto.phone !== undefined) updatePayload.phone = dto.phone?.trim() || null;
    if (dto.notes !== undefined) updatePayload.notes = dto.notes;
    if (dto.resumeUrl !== undefined) updatePayload.resumeUrl = dto.resumeUrl;
    if (dto.resumeFileName !== undefined) updatePayload.resumeFileName = dto.resumeFileName;

    await this.prisma.db.orm.public.Candidate.where((c) => c.id.eq(id)).update(updatePayload);
    return this.findOne(id);
  }

  async uploadDocument(
    id: string,
    file: Express.Multer.File,
    documentType = "Resume",
  ) {
    const candidate = await this.findOne(id);

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

    const currentDocs = extractDocsFromNotes(candidate.notes, {
      id: candidate.id,
      url: candidate.resumeUrl || "",
      name: candidate.resumeFileName || "document.pdf",
      size: candidate.resumeFileSize,
      mimeType: candidate.resumeMimeType,
      createdAt: candidate.createdAt,
    });

    const newDoc: CandidateDocument = {
      id: `doc-${Date.now()}`,
      name: uploadResult.originalName,
      url: uploadResult.url,
      size: uploadResult.size,
      mimeType: uploadResult.mimeType,
      type: documentType || "Resume",
      createdAt: new Date().toISOString(),
    };

    currentDocs.push(newDoc);
    const updatedNotes = packDocsIntoNotes(candidate.notes, currentDocs);

    await this.prisma.db.orm.public.Candidate.where((c) => c.id.eq(id)).update({
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
    const candidate = await this.findOne(id);

    const currentDocs = extractDocsFromNotes(candidate.notes, {
      id: candidate.id,
      url: candidate.resumeUrl || "",
      name: candidate.resumeFileName || "document.pdf",
      size: candidate.resumeFileSize,
      mimeType: candidate.resumeMimeType,
      createdAt: candidate.createdAt,
    });

    let updatedDocs: CandidateDocument[] = [];
    if (opts?.documentId) {
      updatedDocs = currentDocs.filter((d) => d.id !== opts.documentId);
    } else if (opts?.url) {
      updatedDocs = currentDocs.filter((d) => d.url !== opts.url);
    } else {
      updatedDocs = [];
    }

    const updatedNotes = packDocsIntoNotes(candidate.notes, updatedDocs);

    if (updatedDocs.length > 0) {
      await this.prisma.db.orm.public.Candidate.where((c) => c.id.eq(id)).update({
        resumeUrl: updatedDocs[0].url,
        resumeFileName: updatedDocs[0].name,
        resumeFileSize: updatedDocs[0].size ?? null,
        resumeMimeType: updatedDocs[0].mimeType ?? null,
        notes: updatedNotes,
      });
    } else {
      await this.prisma.db.orm.public.Candidate.where((c) => c.id.eq(id)).update({
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

    // Delete all associated applications first
    await this.prisma.db.orm.public.Application.where((a) => a.candidateId.eq(id)).delete();

    // Delete candidate
    await this.prisma.db.orm.public.Candidate.where((c) => c.id.eq(id)).delete();

    return { success: true, message: `Candidate ${id} and all applications deleted successfully` };
  }
}
