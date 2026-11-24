import { Inject, Injectable, Optional } from "@nestjs/common";
import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import {
  APP_ERROR_CODES,
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
  formatCandidateDisplayName,
  normalizeCandidatePhone,
  normalizeNameInput,
  type CandidateDuplicateCheckResult,
  type CandidateDuplicateMatch,
  type CandidateDuplicateReason,
  type CheckCandidateDuplicateSchema,
} from "@haihire/shared";
import { computeAuditDiff } from "../../common/audit-diff.util";
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
import { OrganizationsAuditLogService } from "../../organizations/services/organizations-audit-log.service";

function parseCalendarDate(raw?: string | null): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "—") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const noonUtc = new Date(`${trimmed}T12:00:00.000Z`);
    return !isNaN(noonUtc.getTime()) ? noonUtc : null;
  }
  const parsed = new Date(trimmed);
  return !isNaN(parsed.getTime()) ? parsed : null;
}

function toIsoDateKey(raw?: Date | string | null): string | null {
  if (!raw) return null;
  const d = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export interface CandidateListOptions {
  page?: number;
  limit?: number;
  search?: string;
  filter?: string;
  jobId?: string;
  sortBy?: "name" | "email" | "phone" | "applications" | "added";
  sortOrder?: "asc" | "desc";
}

const VALID_CANDIDATE_TAB_FILTERS = new Set([
  "WITH_RESUME",
  "HAS_APPLICATIONS",
  "UNASSIGNED",
]);

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
    @Optional()
    @Inject(OrganizationsAuditLogService)
    private readonly auditLog?: OrganizationsAuditLogService,
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

  private buildHasResumeWhere(): Prisma.CandidateWhereInput {
    return {
      OR: [
        { AND: [{ resumeUrl: { not: null } }, { resumeUrl: { not: "" } }] },
        {
          AND: [
            { resumeFileName: { not: null } },
            { resumeFileName: { not: "" } },
            { resumeFileName: { not: "—" } },
          ],
        },
      ],
    };
  }

  private async countOrgCandidateTabs(targetOrgId: string) {
    const activeAppWhere = {
      organizationId: targetOrgId,
      job: { deletedAt: null },
    };
    const [all, withResume, hasApplications, unassigned] = await Promise.all([
      this.prisma.candidate.count({
        where: { organizationId: targetOrgId, deletedAt: null },
      }),
      this.prisma.candidate.count({
        where: {
          organizationId: targetOrgId,
          deletedAt: null,
          ...this.buildHasResumeWhere(),
        },
      }),
      this.prisma.candidate.count({
        where: {
          organizationId: targetOrgId,
          deletedAt: null,
          applications: { some: activeAppWhere },
        },
      }),
      this.prisma.candidate.count({
        where: {
          organizationId: targetOrgId,
          deletedAt: null,
          applications: { none: activeAppWhere },
        },
      }),
    ]);

    return { all, withResume, hasApplications, unassigned };
  }

  async listPaginated(
    organizationId?: string,
    options?: CandidateListOptions,
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
    const rawLimit = options?.limit && options.limit > 0 ? options.limit : 20;
    const limit = Math.min(rawLimit, 100);
    const page = options?.page && options.page > 0 ? options.page : 1;

    if (!targetOrgId) {
      return {
        data: [],
        total: 0,
        page: 1,
        limit,
        totalPages: 0,
        counts: { all: 0, withResume: 0, hasApplications: 0, unassigned: 0 },
      };
    }

    const where: Prisma.CandidateWhereInput = {
      organizationId: targetOrgId,
      deletedAt: null,
    };

    const andClauses: Prisma.CandidateWhereInput[] = [];
    const activeAppWhere = {
      organizationId: targetOrgId,
      job: { deletedAt: null },
    };

    if (options?.jobId) {
      andClauses.push({
        applications: {
          some: {
            organizationId: targetOrgId,
            jobId: options.jobId,
            job: { deletedAt: null },
          },
        },
      });
    }

    const filterTokens = (options?.filter || "")
      .split(",")
      .map((token) => token.trim().toUpperCase())
      .filter((token) => VALID_CANDIDATE_TAB_FILTERS.has(token));

    if (filterTokens.length > 0) {
      const tabClauses: Prisma.CandidateWhereInput[] = [];
      for (const token of filterTokens) {
        if (token === "WITH_RESUME") {
          tabClauses.push(this.buildHasResumeWhere());
        } else if (token === "HAS_APPLICATIONS") {
          tabClauses.push({ applications: { some: activeAppWhere } });
        } else if (token === "UNASSIGNED") {
          tabClauses.push({ applications: { none: activeAppWhere } });
        }
      }
      if (tabClauses.length === 1) {
        andClauses.push(tabClauses[0]);
      } else if (tabClauses.length > 1) {
        andClauses.push({ OR: tabClauses });
      }
    }

    if (andClauses.length > 0) {
      where.AND = andClauses;
    }

    const hasSearch = Boolean(options?.search && options.search.trim() !== "");
    if (hasSearch && options?.search) {
      const matchedIds = await findMatchingCandidateIds(this.prisma, {
        organizationId: targetOrgId,
        rawSearch: options.search,
        includeNotes: true,
      });
      if (matchedIds.length === 0) {
        const counts = await this.countOrgCandidateTabs(targetOrgId);
        return {
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 1,
          counts,
        };
      }
      where.id = { in: matchedIds };
    }

    const nameOrder = await resolveOrgNameDisplayOrder(
      this.prisma,
      targetOrgId,
    );
    const sortOrder: Prisma.SortOrder =
      options?.sortOrder === "asc" ? "asc" : "desc";

    let orderBy:
      | Prisma.CandidateOrderByWithRelationInput
      | Prisma.CandidateOrderByWithRelationInput[];
    switch (options?.sortBy) {
      case "name":
        orderBy =
          nameOrder === "LAST_FIRST"
            ? [
                { lastName: { sort: sortOrder, nulls: "last" } },
                { firstName: { sort: sortOrder, nulls: "last" } },
                { displayName: { sort: sortOrder, nulls: "last" } },
                { id: "asc" },
              ]
            : [
                { firstName: { sort: sortOrder, nulls: "last" } },
                { lastName: { sort: sortOrder, nulls: "last" } },
                { displayName: { sort: sortOrder, nulls: "last" } },
                { id: "asc" },
              ];
        break;
      case "email":
        orderBy = [{ email: sortOrder }, { id: "asc" }];
        break;
      case "phone":
        orderBy = [
          { phone: { sort: sortOrder, nulls: "last" } },
          { id: "asc" },
        ];
        break;
      case "applications":
        orderBy = [
          { applications: { _count: sortOrder } },
          { createdAt: "desc" },
          { id: "asc" },
        ];
        break;
      case "added":
        orderBy = [{ createdAt: sortOrder }, { id: "asc" }];
        break;
      default:
        orderBy = { createdAt: "desc" };
        break;
    }

    const hasFilters = hasSearch || andClauses.length > 0;
    const [counts, filteredTotal, candidates] = await Promise.all([
      this.countOrgCandidateTabs(targetOrgId),
      hasFilters ? this.prisma.candidate.count({ where }) : Promise.resolve(-1),
      this.prisma.candidate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
    ]);
    const total = hasFilters ? filteredTotal : counts.all;

    const totalPages = Math.ceil(total / limit) || 1;
    const candidateIds = candidates.map((c) => c.id);

    // Fetch applications and notes only for candidates in the current page
    const [allApps, allNotes] =
      candidateIds.length > 0
        ? await Promise.all([
            this.prisma.application.findMany({
              where: {
                candidateId: { in: candidateIds },
                organizationId: targetOrgId,
                job: { deletedAt: null },
              },
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

    let activeApps = allApps;
    if (allApps.length > 0 && typeof this.prisma.job?.findMany === "function") {
      const appJobIds = [...new Set(allApps.map((a) => a.jobId))];
      const activeJobs = await this.prisma.job.findMany({
        where: {
          id: { in: appJobIds },
          organizationId: targetOrgId,
          deletedAt: null,
        },
        select: { id: true },
      });
      const activeJobIds = new Set(activeJobs.map((j) => j.id));
      activeApps = allApps.filter((a) => activeJobIds.has(a.jobId));
    }

    const appsByCandidate = new Map<string, typeof activeApps>();
    for (const app of activeApps) {
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
      counts,
    };
  }

  async create(
    dto: CreateCandidateDto,
    file?: Express.Multer.File,
    defaultOrgId?: string,
    actorId?: string | null,
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

    // Check unique email per organization (ignoring soft-deleted records)
    const existing = await this.prisma.candidate.findFirst({
      where: {
        organizationId: orgId,
        email,
        deletedAt: null,
      },
      select: { id: true, deletedAt: true },
    });

    if (existing && !existing.deletedAt) {
      throw new AppConflictException(
        APP_ERROR_CODES.CANDIDATE_EMAIL_EXISTS,
        "A candidate with this email already exists in your organization",
        { email },
      );
    }

    const dateOfBirth = parseCalendarDate(dto.dateOfBirth);

    const firstName = normalizeNameInput(dto.firstName);
    const lastName = normalizeNameInput(dto.lastName);
    if (!firstName || !lastName) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.CANDIDATE_INFO_REQUIRED,
        "First name and last name are required.",
      );
    }

    let uploadResult: {
      url: string;
      fileName?: string;
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

    const displayName = dto.displayName?.trim() || null;
    const nameOrder = await resolveOrgNameDisplayOrder(this.prisma, orgId);

    let created;
    try {
      created = await this.prisma.candidate.create({
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
    } catch (err: unknown) {
      const cleanupKey = file ? uploadResult.fileName || uploadResult.url : "";
      if (cleanupKey) {
        await this.minioService
          .deleteFile?.(cleanupKey)
          ?.catch(() => undefined);
      }
      if ((err as { code?: string })?.code === "P2002") {
        throw new AppConflictException(
          APP_ERROR_CODES.CANDIDATE_EMAIL_EXISTS,
          "A candidate with this email already exists in your organization",
          { email },
        );
      }
      throw err;
    }

    this.eventsService?.emit({
      type: "CANDIDATES_CHANGED",
      organizationId: orgId,
      data: { candidateId: created.id },
    });

    const formattedName = formatCandidateDisplayName(created, nameOrder);
    try {
      await this.auditLog?.logOrg(
        orgId,
        actorId ?? null,
        AUDIT_ACTIONS.CANDIDATE_CREATED,
        AUDIT_RESOURCES.CANDIDATE,
        { email: created.email },
        undefined,
        {
          targetId: created.id,
          targetLabel: formattedName || created.email,
        },
      );
    } catch {
      // Fail-open audit logging
    }

    return {
      ...created,
      name: formattedName,
    };
  }

  async update(
    id: string,
    dto: UpdateCandidateDto,
    tenantOrgId?: string | null,
    actorId?: string | null,
  ) {
    const existing = await this.profileService.findOne(id, tenantOrgId);

    const beforeSnapshot = {
      firstName: existing.firstName ?? null,
      lastName: existing.lastName ?? null,
      displayName: existing.displayName ?? null,
      email: existing.email ?? null,
      phone: existing.phone ?? null,
      gender: existing.gender ?? null,
      dateOfBirth: toIsoDateKey(existing.dateOfBirth),
      resumeFileName: existing.resumeFileName ?? null,
    };

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
      updatePayload.dateOfBirth = parseCalendarDate(dto.dateOfBirth);
    }
    if (dto.email !== undefined) {
      const normalizedEmail = dto.email.trim().toLowerCase();
      if (normalizedEmail !== (existing.email || "").toLowerCase()) {
        const orgIdForEmail = (existing.organizationId || tenantOrgId) as
          string | undefined;
        const dup = orgIdForEmail
          ? await this.prisma.candidate.findFirst({
              where: {
                organizationId: orgIdForEmail,
                email: normalizedEmail,
                deletedAt: null,
              },
              select: { id: true, deletedAt: true },
            })
          : null;
        if (dup && dup.id !== id && !dup.deletedAt) {
          throw new AppConflictException(
            APP_ERROR_CODES.CANDIDATE_EMAIL_EXISTS,
            "A candidate with this email already exists in your organization",
            { email: normalizedEmail },
          );
        }
      }
      updatePayload.email = normalizedEmail;
    }
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

    try {
      await this.prisma.candidate.update({
        where: { id },
        data: updatePayload,
      });
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === "P2002") {
        const conflictEmail =
          (updatePayload.email as string | undefined) || existing.email || "";
        throw new AppConflictException(
          APP_ERROR_CODES.CANDIDATE_EMAIL_EXISTS,
          "A candidate with this email already exists in your organization",
          { email: conflictEmail },
        );
      }
      throw err;
    }

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

    const updated = await this.profileService.findOne(id, tenantOrgId);
    if (orgId) {
      const afterSnapshot = {
        firstName: updated.firstName ?? null,
        lastName: updated.lastName ?? null,
        displayName: updated.displayName ?? null,
        email: updated.email ?? null,
        phone: updated.phone ?? null,
        gender: updated.gender ?? null,
        dateOfBirth: toIsoDateKey(updated.dateOfBirth),
        resumeFileName: updated.resumeFileName ?? null,
      };
      const changes = computeAuditDiff(beforeSnapshot, afterSnapshot);
      if (changes.length > 0) {
        try {
          await this.auditLog?.logOrg(
            orgId,
            actorId ?? null,
            AUDIT_ACTIONS.CANDIDATE_UPDATED,
            AUDIT_RESOURCES.CANDIDATE,
            { email: updated.email },
            undefined,
            {
              targetId: updated.id,
              targetLabel: updated.name || updated.email,
              changes,
            },
          );
        } catch {
          // Fail-open audit logging
        }
      }
    }

    return updated;
  }

  async remove(
    id: string,
    tenantOrgId?: string | null,
    actorId?: string | null,
  ) {
    const existing = await this.profileService.findOne(id, tenantOrgId);

    // Soft delete within atomic transaction (Two-Tier Deletion Protocol)
    const targetOrg = existing.organizationId || tenantOrgId || undefined;
    await runInTransaction(this.prisma, async (tx) => {
      await tx.candidate.updateMany({
        where: { id, ...(targetOrg ? { organizationId: targetOrg } : {}) },
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
        type: "INTERVIEWS_CHANGED",
        organizationId: orgId,
        data: { candidateId: id },
      });
      this.eventsService?.emit({
        type: "SOURCING_CHANGED",
        organizationId: orgId,
        data: { candidateId: id },
      });

      try {
        await this.auditLog?.logOrg(
          orgId,
          actorId ?? null,
          AUDIT_ACTIONS.CANDIDATE_DELETED,
          AUDIT_RESOURCES.CANDIDATE,
          { email: existing.email },
          undefined,
          {
            targetId: existing.id,
            targetLabel: existing.name || existing.email,
          },
        );
      } catch {
        // Fail-open audit logging
      }
    }

    return { success: true, message: `Candidate ${id} deleted successfully` };
  }

  /**
   * Check for potential duplicate candidates within the active tenant
   * matching email (blocking) or normalized phone / name+DOB (warning).
   */
  async checkDuplicates(
    query: CheckCandidateDuplicateSchema,
    tenantOrgId?: string | null,
  ): Promise<CandidateDuplicateCheckResult> {
    const orgId = tenantOrgId;
    if (!orgId) {
      return {
        hasBlockingDuplicate: false,
        hasWarningDuplicate: false,
        matches: [],
      };
    }

    const rawEmail = query.email?.trim().toLowerCase() || "";
    const normalizedEmail = rawEmail.includes("@") ? rawEmail : null;
    const normalizedPhone = normalizeCandidatePhone(query.phone);
    const normFirst =
      normalizeNameInput(query.firstName)?.toLowerCase() || null;
    const normLast = normalizeNameInput(query.lastName)?.toLowerCase() || null;
    const parsedDob = query.dateOfBirth
      ? parseCalendarDate(query.dateOfBirth)
      : null;
    const dobIsoDay = parsedDob ? parsedDob.toISOString().slice(0, 10) : null;
    const hasNameDob = Boolean(normFirst && normLast && dobIsoDay);

    const orClauses: Prisma.CandidateWhereInput[] = [];
    if (normalizedEmail) {
      orClauses.push({ email: normalizedEmail });
    }
    if (normalizedPhone) {
      orClauses.push({ phone: { endsWith: normalizedPhone.slice(-3) } });
      if (query.phone?.trim()) {
        orClauses.push({ phone: query.phone.trim() });
      }
      orClauses.push({ phone: normalizedPhone });
    }
    if (hasNameDob && dobIsoDay) {
      orClauses.push({
        dateOfBirth: {
          gte: new Date(`${dobIsoDay}T00:00:00.000Z`),
          lte: new Date(`${dobIsoDay}T23:59:59.999Z`),
        },
      });
    }

    if (orClauses.length === 0) {
      return {
        hasBlockingDuplicate: false,
        hasWarningDuplicate: false,
        matches: [],
      };
    }

    const rows = await this.prisma.candidate.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        ...(query.excludeId ? { id: { not: query.excludeId } } : {}),
        OR: orClauses,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        displayName: true,
        email: true,
        phone: true,
        dateOfBirth: true,
      },
      take: 25,
    });

    const nameOrder = await resolveOrgNameDisplayOrder(this.prisma, orgId);
    const matches: CandidateDuplicateMatch[] = [];

    for (const row of rows) {
      const matchReasons: CandidateDuplicateReason[] = [];
      if (
        normalizedEmail &&
        row.email.trim().toLowerCase() === normalizedEmail
      ) {
        matchReasons.push("EMAIL");
      }
      if (
        normalizedPhone &&
        normalizeCandidatePhone(row.phone) === normalizedPhone
      ) {
        matchReasons.push("PHONE");
      }
      const rowDobKey = toIsoDateKey(row.dateOfBirth);
      if (
        hasNameDob &&
        dobIsoDay &&
        rowDobKey === dobIsoDay &&
        normalizeNameInput(row.firstName)?.toLowerCase() === normFirst &&
        normalizeNameInput(row.lastName)?.toLowerCase() === normLast
      ) {
        matchReasons.push("NAME_DOB");
      }

      if (matchReasons.length === 0) continue;

      matches.push({
        id: row.id,
        name: formatCandidateDisplayName(row, nameOrder),
        email: row.email,
        phone: row.phone ?? null,
        dateOfBirth: rowDobKey,
        matchReasons,
        severity: matchReasons.includes("EMAIL") ? "BLOCKING" : "WARNING",
      });
    }

    matches.sort((a, b) =>
      a.severity === b.severity ? 0 : a.severity === "BLOCKING" ? -1 : 1,
    );

    return {
      hasBlockingDuplicate: matches.some((m) => m.severity === "BLOCKING"),
      hasWarningDuplicate: matches.some((m) => m.severity === "WARNING"),
      matches,
    };
  }
}
