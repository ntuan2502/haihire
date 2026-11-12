import { Inject, Injectable, Optional } from "@nestjs/common";
import crypto from "node:crypto";
import {
  APP_ERROR_CODES,
  formatCandidateDisplayName,
  normalizeNameInput,
} from "@haihire/shared";
import { resolveOrgNameDisplayOrder } from "../../common/candidate-name.util";
import { findMatchingCandidateIds } from "../../common/person-search.util";
import {
  AppBadRequestException,
  AppConflictException,
  AppForbiddenException,
} from "../../common/app-exception";
import { MinioService } from "../../minio/minio.service";
import { PrismaService, runInTransaction } from "../../prisma/prisma.service";
import { CandidatesProfileService } from "./candidates-profile.service";
import { CreateCandidateDto } from "../dto/create-candidate.dto";
import { UpdateCandidateDto } from "../dto/update-candidate.dto";
import { validateUploadedFile } from "../../common/upload-utils";
import { toInstant, toTimestamp } from "../../common/date.util";
import { EventsService } from "../../events/events.service";

@Injectable()
export class CandidatesCrudService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(MinioService)
    private readonly minioService: MinioService,
    @Inject(CandidatesProfileService)
    private readonly profileService: CandidatesProfileService,
    @Optional()
    @Inject(EventsService)
    private readonly eventsService?: EventsService,
  ) {}

  private assertValidTenantResumeUrl(resumeUrl: string, orgId: string): void {
    if (!resumeUrl || !resumeUrl.trim()) return;
    const safeTenant = orgId.trim().replace(/[^a-zA-Z0-9_-]/g, "");
    const objName = this.minioService.extractObjectName(resumeUrl);
    if (objName.startsWith("tenants/")) {
      const expectedPrefix = `tenants/${safeTenant}/`;
      if (!objName.startsWith(expectedPrefix)) {
        throw new AppForbiddenException(
          APP_ERROR_CODES.FORBIDDEN,
          "Cross-tenant resume reference is not permitted",
        );
      }
    }
  }

  async findAll(
    organizationId?: string,
    options?: { page?: number; limit?: number; search?: string },
    tenantOrgId?: string | null,
  ) {
    if (organizationId && tenantOrgId && organizationId !== tenantOrgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.CANDIDATE_ORG_MISMATCH,
        "Access denied: cannot access candidates from another organization.",
        { organizationId },
      );
    }
    const targetOrgId = tenantOrgId || organizationId || undefined;
    if (!targetOrgId) {
      return {
        data: [],
        total: 0,
        page: 1,
        limit: options?.limit || 20,
        totalPages: 0,
      };
    }

    const where: Record<string, unknown> = {
      organizationId: targetOrgId,
      deletedAt: null,
    };

    const page = options?.page && options.page > 0 ? options.page : 1;
    const limit = options?.limit && options.limit > 0 ? options.limit : 20;

    if (options?.search && options.search.trim() !== "") {
      const matchedIds = await findMatchingCandidateIds(this.prisma, {
        organizationId: targetOrgId,
        rawSearch: options.search,
        includeNotes: true,
      });
      if (matchedIds.length === 0) {
        return {
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 1,
        };
      }
      where.id = { in: matchedIds };
    }

    const [total, candidates, nameOrder] = await Promise.all([
      this.prisma.candidate.count({ where }),
      this.prisma.candidate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      resolveOrgNameDisplayOrder(this.prisma, targetOrgId),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;
    const candidateIds = candidates.map((c) => c.id);

    // Fetch applications and notes only for candidates in the current page
    const [allApps, allNotes] =
      candidateIds.length > 0
        ? await Promise.all([
            this.prisma.application.findMany({
              where: { candidateId: { in: candidateIds } },
              select: {
                id: true,
                candidateId: true,
                jobId: true,
                stage: true,
                createdAt: true,
              },
            }),
            this.prisma.candidateNote.findMany({
              where: {
                candidateId: { in: candidateIds },
                organizationId: targetOrgId,
              },
              select: {
                id: true,
                candidateId: true,
                content: true,
                authorName: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
            }),
          ])
        : [[], []];

    const appsByCandidate = new Map<string, typeof allApps>();
    for (const app of allApps) {
      const list = appsByCandidate.get(app.candidateId) || [];
      list.push(app);
      appsByCandidate.set(app.candidateId, list);
    }

    const sortedNotes = [...allNotes].sort(
      (a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt),
    );
    const notesSummaryByCandidate = new Map<
      string,
      {
        latestNote: {
          id: string;
          content: string;
          authorName: string;
          createdAt: string;
        };
        notesCount: number;
      }
    >();
    for (const note of sortedNotes) {
      const existingSummary = notesSummaryByCandidate.get(note.candidateId);
      if (existingSummary) {
        existingSummary.notesCount += 1;
      } else {
        notesSummaryByCandidate.set(note.candidateId, {
          latestNote: {
            id: note.id,
            content: note.content,
            authorName: note.authorName,
            createdAt: note.createdAt
              ? new Date(toTimestamp(note.createdAt)).toISOString()
              : new Date().toISOString(),
          },
          notesCount: 1,
        });
      }
    }

    const data = candidates.map((c) => {
      const apps = appsByCandidate.get(c.id) || [];
      const noteSummary = notesSummaryByCandidate.get(c.id);
      return {
        ...c,
        name: formatCandidateDisplayName(c, nameOrder),
        firstName: c.firstName,
        lastName: c.lastName,
        displayName: c.displayName ?? null,
        resumeFileName: c.resumeFileName,
        applicationsCount: apps.length,
        applications: apps,
        latestNote: noteSummary?.latestNote ?? null,
        notesCount: noteSummary?.notesCount ?? 0,
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

  async create(
    dto: CreateCandidateDto,
    file?: Express.Multer.File,
    defaultOrgId?: string,
  ) {
    if (
      defaultOrgId &&
      dto.organizationId &&
      dto.organizationId !== defaultOrgId
    ) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "Cross-tenant candidate creation is not permitted",
      );
    }
    const orgId = defaultOrgId || dto.organizationId;
    if (!orgId) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.CANDIDATE_ORG_REQUIRED,
        "Organization ID is required",
      );
    }

    const email = dto.email.trim().toLowerCase();

    // Check unique email per organization
    const existing = await this.prisma.candidate.findFirst({
      where: {
        organizationId: orgId,
        email,
      },
      select: { id: true },
    });

    if (existing) {
      throw new AppConflictException(
        APP_ERROR_CODES.CANDIDATE_EMAIL_EXISTS,
        "A candidate with this email already exists in your organization",
      );
    }

    let uploadResult: {
      url: string;
      originalName: string;
      size: number;
      mimeType: string;
    } = {
      url: "",
      originalName: "Candidate Profile",
      size: 0,
      mimeType: "application/pdf",
    };

    if (file) {
      validateUploadedFile(file);
      uploadResult = await this.minioService.uploadFile(file, "resumes", orgId);
    } else if (dto.resumeUrl) {
      this.assertValidTenantResumeUrl(dto.resumeUrl, orgId);
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

    const firstName = normalizeNameInput(dto.firstName);
    const lastName = normalizeNameInput(dto.lastName);
    if (!firstName || !lastName) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.CANDIDATE_INFO_REQUIRED,
        "First name and last name are required.",
      );
    }
    const displayName = dto.displayName?.trim() || null;
    const nameOrder = await resolveOrgNameDisplayOrder(this.prisma, orgId);

    const created = await this.prisma.candidate.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: orgId,
        firstName,
        lastName,
        displayName,
        gender: dto.gender ? dto.gender : null,
        dateOfBirth,
        email,
        phone: dto.phone?.trim() || null,
        resumeUrl: uploadResult.url || null,
        resumeFileName: uploadResult.originalName || null,
        resumeFileSize: uploadResult.size || null,
        resumeMimeType: uploadResult.mimeType || "application/pdf",
        updatedAt: toInstant(),
      },
    });

    this.eventsService?.emit({
      type: "CANDIDATES_CHANGED",
      organizationId: orgId,
      data: { candidateId: created.id },
    });

    return {
      ...created,
      name: formatCandidateDisplayName(created, nameOrder),
    };
  }

  async update(
    id: string,
    dto: UpdateCandidateDto,
    tenantOrgId?: string | null,
  ) {
    const existing = await this.profileService.findOne(id, tenantOrgId);

    const updatePayload: Record<string, unknown> = {};
    if (dto.firstName !== undefined) {
      const trimmed = normalizeNameInput(dto.firstName);
      if (!trimmed) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.CANDIDATE_INFO_REQUIRED,
          "First name cannot be empty.",
        );
      }
      updatePayload.firstName = trimmed;
    }
    if (dto.lastName !== undefined) {
      const trimmed = normalizeNameInput(dto.lastName);
      if (!trimmed) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.CANDIDATE_INFO_REQUIRED,
          "Last name cannot be empty.",
        );
      }
      updatePayload.lastName = trimmed;
    }
    if (dto.displayName !== undefined) {
      updatePayload.displayName = dto.displayName?.trim() || null;
    }
    if (dto.gender !== undefined) {
      updatePayload.gender = dto.gender ? dto.gender : null;
    }
    if (dto.dateOfBirth !== undefined) {
      if (
        dto.dateOfBirth &&
        dto.dateOfBirth.trim() &&
        dto.dateOfBirth !== "—"
      ) {
        const parsed = new Date(dto.dateOfBirth.trim());
        updatePayload.dateOfBirth = !isNaN(parsed.getTime()) ? parsed : null;
      } else {
        updatePayload.dateOfBirth = null;
      }
    }
    if (dto.email !== undefined)
      updatePayload.email = dto.email.trim().toLowerCase();
    if (dto.phone !== undefined)
      updatePayload.phone = dto.phone?.trim() || null;
    if (dto.resumeUrl !== undefined) {
      if (dto.resumeUrl) {
        this.assertValidTenantResumeUrl(dto.resumeUrl, existing.organizationId);
      }
      updatePayload.resumeUrl = dto.resumeUrl;
    }
    if (dto.resumeFileName !== undefined)
      updatePayload.resumeFileName = dto.resumeFileName;

    await this.prisma.candidate.update({
      where: { id },
      data: updatePayload,
    });

    const orgId = existing.organizationId || tenantOrgId;
    if (orgId) {
      this.eventsService?.emit({
        type: "CANDIDATES_CHANGED",
        organizationId: orgId,
        data: { candidateId: id },
      });
      this.eventsService?.emit({
        type: "APPLICATIONS_CHANGED",
        organizationId: orgId,
        data: { candidateId: id },
      });
    }

    return this.profileService.findOne(id, tenantOrgId);
  }

  async remove(id: string, tenantOrgId?: string | null) {
    const existing = await this.profileService.findOne(id, tenantOrgId);

    // Soft delete within atomic transaction (Two-Tier Deletion Protocol)
    await runInTransaction(this.prisma, async (tx) => {
      await tx.candidate.update({
        where: { id },
        data: {
          deletedAt: toInstant(),
        },
      });
    });

    const orgId = existing.organizationId || tenantOrgId;
    if (orgId) {
      this.eventsService?.emit({
        type: "CANDIDATES_CHANGED",
        organizationId: orgId,
        data: { candidateId: id },
      });
      this.eventsService?.emit({
        type: "APPLICATIONS_CHANGED",
        organizationId: orgId,
        data: { candidateId: id },
      });
      this.eventsService?.emit({
        type: "SOURCING_CHANGED",
        organizationId: orgId,
        data: { candidateId: id },
      });
    }

    return { success: true, message: `Candidate ${id} deleted successfully` };
  }
}
