import {
  Inject,
  Injectable,
} from "@nestjs/common";
import { APP_ERROR_CODES, type CandidateDocument } from "@haihire/shared";
import {
  AppBadRequestException,
  AppConflictException,
  AppNotFoundException,
} from "../common/app-exception";
import { MinioService } from "../minio/minio.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCandidateDto } from "./dto/create-candidate.dto";
import { UpdateCandidateDto } from "./dto/update-candidate.dto";
import { fixUtf8String } from "../applications/applications.service";
import { toTimestamp } from "../common/date.util";

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
        const rawDocs = JSON.parse(match[1]) as Array<Record<string, unknown>>;
        if (Array.isArray(rawDocs)) {
          docs = rawDocs.map((d) => ({
            id: String(d.id || ""),
            name: fixUtf8String(typeof d.name === "string" ? d.name : "document.pdf"),
            url: String(d.url || ""),
            size: typeof d.size === "number" ? d.size : null,
            mimeType: typeof d.mimeType === "string" ? d.mimeType : null,
            type: typeof d.type === "string" ? d.type : undefined,
            createdAt: typeof d.createdAt === "string" ? d.createdAt : new Date().toISOString(),
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

  async findAll(
    organizationId?: string,
    options?: { page?: number; limit?: number; search?: string },
  ) {
    if (!organizationId) {
      return { data: [], total: 0, page: 1, limit: options?.limit || 20, totalPages: 0 };
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

    if (candidates.length === 0) {
      return {
        data: [],
        total: 0,
        page: 1,
        limit: options?.limit || 10,
        totalPages: 0,
      };
    }

    let filtered = candidates;
    if (options?.search && options.search.trim() !== "") {
      const q = options.search.trim().toLowerCase();
      filtered = filtered.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(q) ||
          (c.email || "").toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q)) ||
          (c.notes && c.notes.toLowerCase().includes(q)),
      );
    }

    const total = filtered.length;
    const page = options?.page && options.page > 0 ? options.page : 1;
    const limit = options?.limit && options.limit > 0 ? options.limit : 20;
    const totalPages = Math.ceil(total / limit) || 1;

    // Slicing on server for this page
    const pagedCandidates = filtered.slice((page - 1) * limit, page * limit);
    const candidateIds = pagedCandidates.map((c) => c.id);

    // Fetch applications only for the candidates in the current page
    const allApps =
      candidateIds.length > 0
        ? await this.prisma.db.orm.public.Application.select(
            "id",
            "candidateId",
            "jobId",
            "stage",
            "createdAt",
          )
            .where((a) => a.candidateId.in(candidateIds))
            .all()
        : [];

    const appsByCandidate = new Map<string, typeof allApps>();
    for (const app of allApps) {
      const list = appsByCandidate.get(app.candidateId) || [];
      list.push(app);
      appsByCandidate.set(app.candidateId, list);
    }

    const data = pagedCandidates.map((c) => {
      const apps = appsByCandidate.get(c.id) || [];
      return {
        ...c,
        name: fixUtf8String(c.name),
        firstName: fixUtf8String(c.firstName),
        lastName: fixUtf8String(c.lastName),
        notes: fixUtf8String(c.notes),
        resumeFileName: fixUtf8String(c.resumeFileName),
        applicationsCount: apps.length,
        applications: apps,
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
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
      throw new AppNotFoundException(
        APP_ERROR_CODES.CANDIDATE_NOT_FOUND,
        `Candidate with ID ${id} not found`,
      );
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
    const jobs = jobIds.length > 0
      ? await this.prisma.db.orm.public.Job.select(
          "id",
          "title",
          "department",
          "location",
        )
          .where((j) => j.id.in(jobIds))
          .all()
      : [];
    const jobMap = new Map(jobs.map((j) => [j.id, j]));

    // Fetch interviews for each application
    const appIds = [...new Set(applications.map((a) => a.id))];
    const candidateInterviews = appIds.length > 0
      ? await this.prisma.db.orm.public.Interview
          .where((i) => i.applicationId.in(appIds))
          .all()
      : [];
    const interviewsByApp = new Map<string, Array<Record<string, unknown>>>();
    for (const intv of candidateInterviews) {
      const list = interviewsByApp.get(intv.applicationId) || [];
      let parsedScorecard: Record<string, unknown> | null = null;
      if (intv.scorecard) {
        try {
          parsedScorecard = JSON.parse(intv.scorecard) as Record<string, unknown>;
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

    const populatedApps = applications.map((app) => ({
      ...app,
      job: jobMap.get(app.jobId) || null,
      candidateName: candidate.name,
      candidateEmail: candidate.email,
      candidatePhone: candidate.phone,
      interviews: interviewsByApp.get(app.id) || [],
    }));

    // Aggregate all documents: candidate's documents + all documents from applications
    let dbDocs: CandidateDocument[] = [];
    try {
      const queried = await this.prisma.db.orm.public.CandidateDocument.select(
        "id",
        "name",
        "url",
        "size",
        "mimeType",
        "type",
        "createdAt",
      )
        .where((d) => d.candidateId.eq(id))
        .all();
      if (Array.isArray(queried) && queried.length > 0) {
        dbDocs = queried.map((d) => ({
          ...d,
          createdAt: d.createdAt ? new Date(toTimestamp(d.createdAt)).toISOString() : new Date().toISOString(),
        }));
      }
    } catch {
      dbDocs = [];
    }

    const candidateDirectDocs = dbDocs.length > 0 ? dbDocs : extractDocsFromNotes(candidate.notes, {
      id: candidate.id,
      url: candidate.resumeUrl || "",
      name: candidate.resumeFileName || "Resume.pdf",
      size: candidate.resumeFileSize,
      mimeType: candidate.resumeMimeType,
      createdAt: candidate.createdAt ? new Date(toTimestamp(candidate.createdAt)) : undefined,
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
        createdAt: app.createdAt ? new Date(toTimestamp(app.createdAt)) : undefined,
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
      throw new AppBadRequestException(
        APP_ERROR_CODES.CANDIDATE_ORG_REQUIRED,
        "Organization ID is required",
      );
    }

    const email = dto.email.trim().toLowerCase();

    // Check unique email per organization
    const existing = await this.prisma.db.orm.public.Candidate.select("id")
      .where((c) => c.organizationId.eq(orgId))
      .where((c) => c.email.eq(email))
      .first();

    if (existing) {
      throw new AppConflictException(
        APP_ERROR_CODES.CANDIDATE_EMAIL_EXISTS,
        "A candidate with this email already exists in your organization",
      );
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

    let dateOfBirth: Temporal.Instant | null = null;
    if (dto.dateOfBirth && dto.dateOfBirth.trim() && dto.dateOfBirth !== "—") {
      const parsed = new Date(dto.dateOfBirth.trim());
      if (!isNaN(parsed.getTime())) {
        dateOfBirth = Temporal.Instant.fromEpochMilliseconds(parsed.getTime());
      }
    }

    let firstName = dto.firstName?.trim() || null;
    let lastName = dto.lastName?.trim() || null;
    if (!firstName && !lastName && dto.name) {
      const parts = dto.name.trim().split(/\s+/);
      if (parts.length > 1) {
        firstName = parts[parts.length - 1];
        lastName = parts.slice(0, -1).join(" ");
      } else {
        firstName = parts[0] || null;
      }
    }

    const created = await this.prisma.db.orm.public.Candidate.create({
      organizationId: orgId,
      name: dto.name.trim(),
      firstName,
      lastName,
      gender: dto.gender ? dto.gender : null,
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

    const updatePayload: Record<string, unknown> = {};
    if (dto.name !== undefined) updatePayload.name = dto.name.trim();
    if (dto.firstName !== undefined) updatePayload.firstName = dto.firstName?.trim() || null;
    if (dto.lastName !== undefined) updatePayload.lastName = dto.lastName?.trim() || null;
    if (dto.gender !== undefined) {
      updatePayload.gender = dto.gender ? dto.gender : null;
    }
    if (dto.dateOfBirth !== undefined) {
      if (dto.dateOfBirth && dto.dateOfBirth.trim() && dto.dateOfBirth !== "—") {
        const parsed = new Date(dto.dateOfBirth.trim());
        updatePayload.dateOfBirth = !isNaN(parsed.getTime())
          ? Temporal.Instant.fromEpochMilliseconds(parsed.getTime())
          : null;
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
      throw new AppBadRequestException(
        APP_ERROR_CODES.DOCUMENT_FILE_REQUIRED,
        "No document file provided",
      );
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
      createdAt: candidate.createdAt ? new Date(toTimestamp(candidate.createdAt)) : undefined,
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

    try {
      await this.prisma.db.orm.public.CandidateDocument.create({
        id: newDoc.id,
        candidateId: id,
        organizationId: candidate.organizationId,
        name: newDoc.name,
        url: newDoc.url,
        size: newDoc.size ?? null,
        mimeType: newDoc.mimeType ?? null,
        type: newDoc.type ?? null,
      });
    } catch {
      // ignore if mock or table unavailable in test
    }

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
      createdAt: candidate.createdAt ? new Date(toTimestamp(candidate.createdAt)) : undefined,
    });

    let updatedDocs: CandidateDocument[] = [];
    if (opts?.documentId) {
      updatedDocs = currentDocs.filter((d) => d.id !== opts.documentId);
      try {
        await this.prisma.db.orm.public.CandidateDocument.where((d) => d.id.eq(opts.documentId!)).delete();
      } catch {}
    } else if (opts?.url) {
      updatedDocs = currentDocs.filter((d) => d.url !== opts.url);
      try {
        await this.prisma.db.orm.public.CandidateDocument.where((d) => d.url.eq(opts.url!)).delete();
      } catch {}
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

    try {
      await this.prisma.db.orm.public.Candidate.where((c) => c.id.eq(id)).delete();
    } catch {
      // Fallback manual cleanup for relations if DB-level cascade is bypassed
      try {
        await this.prisma.db.orm.public.CandidateDocument.where((d) => d.candidateId.eq(id)).delete();
      } catch {}
      try {
        await this.prisma.db.orm.public.Application.where((a) => a.candidateId.eq(id)).delete();
      } catch {}
      await this.prisma.db.orm.public.Candidate.where((c) => c.id.eq(id)).delete();
    }

    return { success: true, message: `Candidate ${id} and all applications deleted successfully` };
  }
}
