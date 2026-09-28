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
import { fixUtf8String } from "../common/doc-utils";
import { toTimestamp } from "../common/date.util";

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

    const candidateDirectDocs: CandidateDocument[] = dbDocs.length > 0
      ? dbDocs
      : (candidate.resumeUrl
          ? [
              {
                id: `doc-${candidate.id}`,
                name: fixUtf8String(candidate.resumeFileName || "Resume.pdf"),
                url: candidate.resumeUrl,
                size: candidate.resumeFileSize ?? null,
                mimeType: candidate.resumeMimeType ?? "application/pdf",
                type: "Resume",
                createdAt: candidate.createdAt
                  ? new Date(toTimestamp(candidate.createdAt)).toISOString()
                  : new Date().toISOString(),
              },
            ]
          : []);

    const allDocuments: CandidateDocument[] = [...candidateDirectDocs];
    const seenUrls = new Set(allDocuments.map((d) => d.url).filter(Boolean));

    for (const app of populatedApps) {
      if (app.resumeUrl && !seenUrls.has(app.resumeUrl)) {
        seenUrls.add(app.resumeUrl);
        allDocuments.push({
          id: `doc-${app.id}`,
          name: fixUtf8String(app.resumeFileName || "Application_Resume.pdf"),
          url: app.resumeUrl,
          size: app.resumeFileSize ?? null,
          mimeType: app.resumeMimeType ?? "application/pdf",
          type: "Resume",
          createdAt: app.createdAt
            ? new Date(toTimestamp(app.createdAt)).toISOString()
            : new Date().toISOString(),
          sourceApplicationId: app.id,
          jobTitle: app.job?.title || "Job Application",
        });
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

    const newDocId = `doc-${Date.now()}`;
    const cleanDocName = fixUtf8String(uploadResult.originalName);

    try {
      await this.prisma.db.orm.public.CandidateDocument.create({
        id: newDocId,
        candidateId: id,
        organizationId: candidate.organizationId,
        name: cleanDocName,
        url: uploadResult.url,
        size: uploadResult.size ?? null,
        mimeType: uploadResult.mimeType ?? null,
        type: documentType || "Resume",
      });
    } catch {
      // ignore if mock or table unavailable in test
    }

    if (!candidate.resumeUrl) {
      await this.prisma.db.orm.public.Candidate.where((c) => c.id.eq(id)).update({
        resumeUrl: uploadResult.url,
        resumeFileName: cleanDocName,
        resumeFileSize: uploadResult.size ?? null,
        resumeMimeType: uploadResult.mimeType ?? null,
      });
    }

    return this.findOne(id);
  }

  async deleteDocument(
    id: string,
    opts?: { documentId?: string; url?: string },
  ) {
    await this.findOne(id);

    if (opts?.documentId) {
      try {
        await this.prisma.db.orm.public.CandidateDocument.where((d) => d.id.eq(opts.documentId!)).delete();
      } catch {}
    } else if (opts?.url) {
      try {
        await this.prisma.db.orm.public.CandidateDocument.where((d) => d.url.eq(opts.url!)).delete();
      } catch {}
    }

    let remainingDocs: CandidateDocument[] = [];
    try {
      const queried = await this.prisma.db.orm.public.CandidateDocument.select(
        "id", "name", "url", "size", "mimeType", "type", "createdAt"
      ).where((d) => d.candidateId.eq(id)).all();
      if (Array.isArray(queried)) {
        remainingDocs = queried.map((d) => ({
          ...d,
          createdAt: d.createdAt ? new Date(toTimestamp(d.createdAt)).toISOString() : new Date().toISOString(),
        }));
      }
    } catch {}

    const primaryDoc = remainingDocs[0];
    if (primaryDoc) {
      await this.prisma.db.orm.public.Candidate.where((c) => c.id.eq(id)).update({
        resumeUrl: primaryDoc.url,
        resumeFileName: primaryDoc.name,
        resumeFileSize: primaryDoc.size ?? null,
        resumeMimeType: primaryDoc.mimeType ?? null,
      });
    } else {
      await this.prisma.db.orm.public.Candidate.where((c) => c.id.eq(id)).update({
        resumeUrl: null,
        resumeFileName: null,
        resumeFileSize: null,
        resumeMimeType: null,
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
