import { Inject, Injectable, Optional } from "@nestjs/common";
import {
  APP_ERROR_CODES,
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
  extractPlainTextFromHtml,
  formatCandidateDisplayName,
  jobApplicationFormConfigSchema,
  jobScoringConfigSchema,
  normalizeJobApplicationFormConfig,
  normalizeJobScoringConfig,
  type CreateJobSchema,
  type JobApplicationFormConfig,
  type JobScoringConfig,
  type NameDisplayOrder,
  type UpdateJobSchema,
  type UpsertPipelineStagesSchema,
} from "@haihire/shared";
import { sanitizeRichTextHtml } from "../common/html-sanitizer";
import { computeAuditDiff } from "../common/audit-diff.util";
import {
  ApplicationStage,
  ExperienceLevel,
  JobStatus,
  JobType,
  WorkplaceType,
  Prisma,
} from "@prisma/client";
import {
  AppNotFoundException,
  AppForbiddenException,
  AppBadRequestException,
} from "../common/app-exception";
import { PrismaService, runInTransaction } from "../prisma/prisma.service";
import crypto from "node:crypto";
import { toInstant } from "../common/date.util";
import { formatInterviewRecord } from "../interviews/constants";

import { EventsService } from "../events/events.service";
import { attachOrganizationLogoUrl } from "../organizations/organization-logo.util";
import { OrganizationsAuditLogService } from "../organizations/services/organizations-audit-log.service";

@Injectable()
export class JobsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(EventsService)
    private readonly eventsService?: EventsService,
    @Optional()
    @Inject(OrganizationsAuditLogService)
    private readonly auditLog?: OrganizationsAuditLogService,
  ) {}

  private toDateKey(raw?: Date | string | null): string | null {
    if (!raw) return null;
    const d = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }

  async listPaginated(filter?: {
    status?: string;
    department?: string;
    search?: string;
    type?: string;
    experienceLevel?: string;
    workplace?: string;
    sortBy?: string;
    sortOrder?: string;
    organizationId?: string;
    organizationSlug?: string;
    page?: number;
    limit?: number;
    tenantOrgId?: string | null;
  }) {
    const page = filter?.page && filter.page > 0 ? filter.page : 1;
    const limit = filter?.limit && filter.limit > 0 ? filter.limit : 20;

    const userOrgId = filter?.tenantOrgId || undefined;

    if (
      filter?.status &&
      filter.status !== "PUBLISHED" &&
      filter?.organizationId &&
      userOrgId &&
      filter.organizationId !== userOrgId
    ) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.JOB_INVALID_ORGANIZATION,
        "Access denied: cannot view unpublished jobs from another organization.",
        { organizationId: filter.organizationId },
      );
    }

    let targetOrgId = filter?.organizationId || userOrgId || undefined;
    let targetOrg: {
      id: string;
      name: string;
      slug: string;
      logoObjectKey?: string | null;
      logoUpdatedAt?: Date | string | null;
    } | null = null;

    if (filter?.organizationSlug) {
      targetOrg = await this.prisma.organization.findFirst({
        where: { slug: filter.organizationSlug as string },
        select: {
          id: true,
          name: true,
          slug: true,
          logoObjectKey: true,
          logoUpdatedAt: true,
        },
      });
      if (!targetOrg) {
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }
      targetOrgId = targetOrg.id;
    } else if (targetOrgId) {
      targetOrg = await this.prisma.organization.findFirst({
        where: { id: targetOrgId as string },
        select: {
          id: true,
          name: true,
          slug: true,
          logoObjectKey: true,
          logoUpdatedAt: true,
        },
      });
    }

    const isPublic =
      !userOrgId ||
      targetOrgId !== userOrgId ||
      Boolean(filter?.organizationSlug);
    const effectiveStatus = isPublic ? "PUBLISHED" : filter?.status;

    const parseValues = (value: string) =>
      value.split(",").map((item) => item.trim().toUpperCase());
    const statuses = effectiveStatus ? parseValues(effectiveStatus) : undefined;
    if (statuses?.includes("CLOSED")) statuses.push("ARCHIVED");
    const where: Prisma.JobWhereInput = {
      ...(targetOrgId ? { organizationId: targetOrgId } : {}),
      deletedAt: null,
      ...(statuses
        ? {
            status: {
              in: Object.values(JobStatus).filter((value) =>
                statuses.includes(value),
              ),
            },
          }
        : {}),
      ...(filter?.department
        ? { department: { equals: filter.department, mode: "insensitive" } }
        : {}),
      ...(filter?.type
        ? {
            type: {
              in: Object.values(JobType).filter((value) =>
                parseValues(filter.type!).includes(value),
              ),
            },
          }
        : {}),
      ...(filter?.experienceLevel
        ? {
            experienceLevel: {
              in: Object.values(ExperienceLevel).filter((value) =>
                parseValues(filter.experienceLevel!).includes(value),
              ),
            },
          }
        : {}),
      ...(filter?.workplace
        ? {
            workplace: {
              in: Object.values(WorkplaceType).filter((value) =>
                parseValues(filter.workplace!).includes(value),
              ),
            },
          }
        : {}),
      ...(filter?.search
        ? {
            OR: ["title", "department", "location"].map((field) => ({
              [field]: { contains: filter.search, mode: "insensitive" },
            })),
          }
        : {}),
    };
    const sortOrder = filter?.sortOrder === "asc" ? "asc" : "desc";
    const sortByApplicants = filter?.sortBy === "applicants" && !isPublic;
    const orderBy: Prisma.JobOrderByWithRelationInput[] = [
      filter?.sortBy === "title"
        ? { title: sortOrder }
        : { createdAt: sortOrder },
      { id: "asc" },
    ];
    const total = await this.prisma.job.count({ where });
    const totalPages = Math.ceil(total / limit);
    const pagedJobs = await this.prisma.job.findMany({
      where,
      orderBy,
      skip: sortByApplicants ? undefined : (page - 1) * limit,
      take: sortByApplicants ? undefined : limit,
      select: {
        id: true,
        title: true,
        department: true,
        location: true,
        postalCode: true,
        experienceLevel: true,
        workplace: true,
        type: true,
        description: true,
        applicationDeadline: true,
        startDate: true,
        openings: true,
        salaryRange: true,
        salaryMin: true,
        salaryMax: true,
        salaryCurrency: true,
        status: true,
        applicationFormConfig: true,
        scoringConfig: true,
        organizationId: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    if (pagedJobs.length === 0) {
      return { data: [], total, page, limit, totalPages };
    }

    const jobIds = [...new Set(pagedJobs.map((j) => j.id))];
    const jobIdSet = new Set(jobIds);

    // Fetch applications only relevant to these paged jobs
    const allApps =
      !isPublic && jobIds.length > 0
        ? await this.prisma.application.findMany({
            where: {
              jobId: { in: jobIds },
              candidate: { deletedAt: null },
            },
            select: {
              id: true,
              jobId: true,
              stage: true,
              candidateId: true,
            },
          })
        : [];

    const appCandidateIds = [
      ...new Set(allApps.map((a) => a.candidateId).filter(Boolean)),
    ];
    const cands =
      appCandidateIds.length > 0
        ? await this.prisma.candidate.findMany({
            where: {
              id: { in: appCandidateIds },
              ...(targetOrg ? { organizationId: targetOrg.id } : {}),
            },
            select: { id: true, deletedAt: true },
          })
        : [];
    const deletedCandidateIds = new Set(
      cands.filter((c) => Boolean(c.deletedAt)).map((c) => c.id),
    );

    const appCountMap = new Map<
      string,
      { total: number; byStage: Record<string, number> }
    >();
    for (const app of allApps) {
      if (!app.jobId || !jobIdSet.has(app.jobId)) continue;
      if (app.candidateId && deletedCandidateIds.has(app.candidateId)) continue;
      if (!appCountMap.has(app.jobId)) {
        appCountMap.set(app.jobId, { total: 0, byStage: {} });
      }
      const item = appCountMap.get(app.jobId)!;
      item.total += 1;
      item.byStage[app.stage] = (item.byStage[app.stage] || 0) + 1;
    }

    const orderedPagedJobs = sortByApplicants
      ? [...pagedJobs]
          .sort((a, b) => {
            const countA = appCountMap.get(a.id)?.total ?? 0;
            const countB = appCountMap.get(b.id)?.total ?? 0;
            const diff = countA - countB;
            if (diff !== 0) {
              return sortOrder === "asc" ? diff : -diff;
            }
            return a.id.localeCompare(b.id);
          })
          .slice((page - 1) * limit, page * limit)
      : pagedJobs;

    const orgMap = new Map<
      string,
      { id: string; name: string; slug: string; logoUrl: string | null }
    >();
    if (targetOrg) {
      orgMap.set(targetOrg.id, attachOrganizationLogoUrl(targetOrg));
    } else {
      const allOrgs = await this.prisma.organization.findMany({
        where: {
          id: {
            in: [
              ...new Set(
                orderedPagedJobs.flatMap((job) =>
                  job.organizationId ? [job.organizationId] : [],
                ),
              ),
            ],
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          logoObjectKey: true,
          logoUpdatedAt: true,
        },
      });
      for (const o of allOrgs) {
        orgMap.set(o.id, attachOrganizationLogoUrl(o));
      }
    }

    return {
      data: orderedPagedJobs.map((job) => ({
        ...job,
        applicationFormConfig: normalizeJobApplicationFormConfig(
          job.applicationFormConfig,
        ),
        ...(!isPublic
          ? {
              scoringConfig: normalizeJobScoringConfig(
                (job as { scoringConfig?: unknown }).scoringConfig,
              ),
            }
          : {}),
        organization: job.organizationId
          ? (orgMap.get(job.organizationId) ?? null)
          : null,
        applicationsCount: appCountMap.get(job.id)?.total ?? 0,
        applicationsByStage: appCountMap.get(job.id)?.byStage ?? {},
      })),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(
    id: string,
    tenantOrgId?: string | null,
    isPublic = false,
    fullCandidateAccess = true,
  ) {
    const job = await this.prisma.job.findFirst({
      where:
        !isPublic && tenantOrgId ? { id, organizationId: tenantOrgId } : { id },
      select: {
        id: true,
        organizationId: true,
        title: true,
        department: true,
        location: true,
        postalCode: true,
        experienceLevel: true,
        workplace: true,
        type: true,
        description: true,
        applicationDeadline: true,
        startDate: true,
        openings: true,
        salaryRange: true,
        salaryMin: true,
        salaryMax: true,
        salaryCurrency: true,
        status: true,
        applicationFormConfig: true,
        scoringConfig: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    if (!job || job.deletedAt) {
      if (!isPublic && tenantOrgId) {
        const otherOrgJob = await this.prisma.job.findFirst({
          where: { id, deletedAt: null },
          select: { id: true, organizationId: true },
        });
        if (
          otherOrgJob &&
          otherOrgJob.organizationId &&
          otherOrgJob.organizationId !== tenantOrgId
        ) {
          throw new AppForbiddenException(
            APP_ERROR_CODES.JOB_INVALID_ORGANIZATION,
            "Access denied: job belongs to another organization.",
            { id },
          );
        }
      }
      throw new AppNotFoundException(
        APP_ERROR_CODES.JOB_NOT_FOUND,
        `Job with ID ${id} not found`,
        { id },
      );
    }

    if (isPublic && job.status !== "PUBLISHED" && job.status !== "CLOSED") {
      throw new AppNotFoundException(
        APP_ERROR_CODES.JOB_NOT_FOUND,
        `Job with ID ${id} not found`,
        { id },
      );
    }

    let organization: {
      id: string;
      name: string;
      slug: string;
      logoUrl?: string | null;
    } | null = null;
    if (job.organizationId) {
      const orgRow = await this.prisma.organization.findFirst({
        where: { id: job.organizationId as string },
        select: {
          id: true,
          name: true,
          slug: true,
          logoObjectKey: true,
          logoUpdatedAt: true,
          defaultLanguage: true,
          timezone: true,
          dateFormat: true,
          timeFormat: true,
          nameDisplayOrder: true,
          defaultCurrency: true,
        },
      });
      organization = orgRow ? attachOrganizationLogoUrl(orgRow) : null;
    }

    if (isPublic) {
      const { scoringConfig: _omitScoringConfig, ...publicJob } =
        job as typeof job & {
          scoringConfig?: unknown;
        };
      return {
        ...publicJob,
        applicationFormConfig: normalizeJobApplicationFormConfig(
          job.applicationFormConfig,
        ),
        organization,
        applications: [],
        applicationsCount: 0,
      };
    }

    const applications = await this.prisma.application.findMany({
      where: {
        jobId: id,
        candidate: { deletedAt: null },
      },
      select: {
        id: true,
        candidateId: true,
        jobId: true,
        stage: true,
        resumeUrl: true,
        resumeFileName: true,
        resumeFileSize: true,
        resumeMimeType: true,
        orderIndex: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const candidateIds = [...new Set(applications.map((a) => a.candidateId))];
    const candidates =
      candidateIds.length > 0
        ? await this.prisma.candidate.findMany({
            where: {
              id: { in: candidateIds },
              organizationId: job.organizationId,
            },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              email: true,
              phone: true,
              resumeUrl: true,
              resumeFileName: true,
              deletedAt: true,
            },
          })
        : [];
    const candidateMap = new Map(candidates.map((c) => [c.id, c]));
    const deletedCandIds = new Set(
      candidates.filter((c) => Boolean(c.deletedAt)).map((c) => c.id),
    );
    const activeApplications = applications.filter(
      (a) => !deletedCandIds.has(a.candidateId),
    );

    // Fetch interviews for each application
    const appIds = [...new Set(activeApplications.map((a) => a.id))];
    const jobInterviews =
      appIds.length > 0
        ? await this.prisma.interview.findMany({
            where: { applicationId: { in: appIds } },
          })
        : [];
    const interviewsByApp = new Map<string, Array<Record<string, unknown>>>();
    for (const intv of jobInterviews) {
      const list = interviewsByApp.get(intv.applicationId) || [];
      list.push(formatInterviewRecord(intv));
      interviewsByApp.set(intv.applicationId, list);
    }

    const orgOrder: NameDisplayOrder =
      (organization as { nameDisplayOrder?: string } | null)
        ?.nameDisplayOrder === "LAST_FIRST"
        ? "LAST_FIRST"
        : "FIRST_LAST";

    const populatedApps = activeApplications.map((a) => {
      const candidate = candidateMap.get(a.candidateId);
      const resolvedCandidateName = candidate
        ? formatCandidateDisplayName(candidate, orgOrder) || "Unknown"
        : "Unknown";
      if (!fullCandidateAccess) {
        return {
          id: a.id,
          candidateId: a.candidateId,
          jobId: a.jobId,
          stage: a.stage,
          orderIndex: a.orderIndex,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
          candidate: candidate
            ? {
                id: candidate.id,
                name: "[Masked]",
                firstName: "[Masked]",
                lastName: "[Masked]",
                displayName: "[Masked]",
                email: "",
                phone: null,
              }
            : undefined,
          candidateName: "[Masked]",
          candidateEmail: "",
          candidatePhone: null,
          interviews: [],
        };
      }
      return {
        ...a,
        candidate: candidate
          ? {
              ...candidate,
              name: resolvedCandidateName,
            }
          : undefined,
        candidateName: resolvedCandidateName,
        candidateEmail: candidate?.email || "",
        candidatePhone: candidate?.phone || null,
        resumeUrl: a.resumeUrl || candidate?.resumeUrl || "",
        resumeFileName:
          a.resumeFileName || candidate?.resumeFileName || "Resume.pdf",
        interviews: interviewsByApp.get(a.id) || [],
      };
    });

    return {
      ...job,
      applicationFormConfig: normalizeJobApplicationFormConfig(
        job.applicationFormConfig,
      ),
      scoringConfig: normalizeJobScoringConfig(
        (job as { scoringConfig?: unknown }).scoringConfig,
      ),
      organization,
      applications: populatedApps,
      applicationsCount: populatedApps.length,
    };
  }

  async findBySlug(orgSlug: string, jobSlug: string) {
    const org = await this.prisma.organization.findFirst({
      where: { slug: orgSlug },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (!org) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_NOT_FOUND,
        `Organization '${orgSlug}' not found`,
        { slug: orgSlug },
      );
    }

    // First try direct lookup by ID if jobSlug is a UUID
    let matchedJob = await this.prisma.job.findFirst({
      where: {
        organizationId: org.id,
        deletedAt: null,
        status: { in: ["PUBLISHED", "CLOSED"] },
        id: jobSlug,
      },
      select: { id: true },
    });

    if (!matchedJob) {
      const activeJobs = await this.prisma.job.findMany({
        where: {
          organizationId: org.id,
          deletedAt: null,
          status: { in: ["PUBLISHED", "CLOSED"] },
        },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
        },
      });

      const slugify = (str: string) =>
        str
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/đ/g, "d")
          .replace(/Đ/g, "D")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

      const statusRank = (status?: string) => (status === "PUBLISHED" ? 0 : 1);
      const sortedJobs = [...activeJobs].sort((a, b) => {
        const rankDiff = statusRank(a.status) - statusRank(b.status);
        if (rankDiff !== 0) return rankDiff;
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

      const found =
        sortedJobs.find((j) => {
          const titleSlug = slugify(j.title);
          const fullSlug = titleSlug
            ? `${titleSlug}-${j.id.slice(0, 8)}`
            : j.id;
          return fullSlug === jobSlug || jobSlug.endsWith(j.id);
        }) ??
        sortedJobs.find((j) => {
          const titleSlug = slugify(j.title);
          return Boolean(titleSlug && titleSlug === jobSlug);
        }) ??
        sortedJobs.find((j) => jobSlug.length >= 8 && j.id.startsWith(jobSlug));

      if (found) {
        matchedJob = found;
      }
    }

    if (!matchedJob) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.JOB_NOT_FOUND,
        `Job '${jobSlug}' not found in organization '${orgSlug}'`,
        { id: jobSlug, slug: orgSlug },
      );
    }

    return this.findOne(matchedJob.id, undefined, true);
  }

  private parseDateOnly(
    value: string | null | undefined,
    fieldName: string,
  ): Date | null {
    if (value == null || value === "") {
      return null;
    }
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        `Invalid date format for ${fieldName}. Expected YYYY-MM-DD.`,
      );
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        `Invalid calendar date for ${fieldName}.`,
      );
    }
    return parsed;
  }

  private sanitizeDescription(rawDescription: string): string {
    const sanitized = sanitizeRichTextHtml(rawDescription).trim();
    if (extractPlainTextFromHtml(sanitized).length === 0) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        "Job description is required",
      );
    }
    return sanitized;
  }

  private parseApplicationFormConfigInput(
    raw?: unknown,
  ): JobApplicationFormConfig | null | undefined {
    if (raw === undefined) return undefined;
    if (raw === null) return null;
    const parsed = jobApplicationFormConfigSchema.safeParse(raw);
    if (!parsed.success) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        parsed.error.issues[0]?.message ||
          "Invalid application form configuration",
      );
    }
    return parsed.data;
  }

  private parseScoringConfigInput(
    raw?: unknown,
  ): JobScoringConfig | null | undefined {
    if (raw === undefined) return undefined;
    if (raw === null) return null;
    const parsed = jobScoringConfigSchema.safeParse(raw);
    if (!parsed.success) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        parsed.error.issues[0]?.message || "Invalid AI scoring configuration",
      );
    }
    return parsed.data;
  }

  async create(
    dto: CreateJobSchema,
    tenantOrgId?: string | null,
    userId?: string | null,
  ) {
    if (
      dto.organizationId &&
      tenantOrgId &&
      dto.organizationId !== tenantOrgId
    ) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.JOB_INVALID_ORGANIZATION,
        "Access denied: cannot create job for another organization.",
        { organizationId: dto.organizationId },
      );
    }

    const targetOrgId = tenantOrgId || dto.organizationId;
    if (!targetOrgId) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.JOB_INVALID_ORGANIZATION,
        "Organization ID is required to create a job",
      );
    }

    const description = this.sanitizeDescription(dto.description);
    const applicationDeadline =
      dto.applicationDeadline !== undefined
        ? this.parseDateOnly(dto.applicationDeadline, "applicationDeadline")
        : null;
    const startDate =
      dto.startDate !== undefined
        ? this.parseDateOnly(dto.startDate, "startDate")
        : null;
    const validatedFormConfig = this.parseApplicationFormConfigInput(
      dto.applicationFormConfig,
    );
    const validatedScoringConfig = this.parseScoringConfigInput(
      dto.scoringConfig,
    );

    const created = await this.prisma.job.create({
      data: {
        id: crypto.randomUUID(),
        title: dto.title,
        department: dto.department,
        location: dto.location,
        postalCode: dto.postalCode ?? null,
        experienceLevel: dto.experienceLevel ?? null,
        workplace: dto.workplace ?? null,
        type: dto.type ?? "FULL_TIME",
        description,
        applicationDeadline,
        startDate,
        openings: dto.openings ?? 1,
        salaryRange: dto.salaryRange ?? null,
        salaryMin: dto.salaryMin ?? null,
        salaryMax: dto.salaryMax ?? null,
        salaryCurrency: dto.salaryCurrency ?? null,
        status: dto.status ?? "PUBLISHED",
        ...(validatedFormConfig !== undefined
          ? {
              applicationFormConfig:
                validatedFormConfig === null
                  ? Prisma.DbNull
                  : (validatedFormConfig as unknown as Prisma.InputJsonValue),
            }
          : {}),
        ...(validatedScoringConfig !== undefined
          ? {
              scoringConfig:
                validatedScoringConfig === null
                  ? Prisma.DbNull
                  : (validatedScoringConfig as unknown as Prisma.InputJsonValue),
            }
          : {}),
        organizationId: targetOrgId,
        createdById: (userId || dto.createdById) ?? null,
        updatedAt: toInstant(),
      },
    });

    this.eventsService?.emit({
      type: "JOBS_CHANGED",
      organizationId: targetOrgId,
      data: { jobId: created.id },
    });

    try {
      await this.auditLog?.logOrg(
        targetOrgId,
        (userId || dto.createdById) ?? null,
        AUDIT_ACTIONS.JOB_CREATED,
        AUDIT_RESOURCES.JOB,
        {
          department: created.department,
          location: created.location,
          status: created.status,
          type: created.type,
        },
        undefined,
        {
          targetId: created.id,
          targetLabel: created.title,
        },
      );
    } catch {
      // Fail-open audit logging
    }

    return {
      ...created,
      applicationFormConfig: normalizeJobApplicationFormConfig(
        (created as { applicationFormConfig?: unknown }).applicationFormConfig,
      ),
      scoringConfig: normalizeJobScoringConfig(
        (created as { scoringConfig?: unknown }).scoringConfig,
      ),
    };
  }

  async update(
    id: string,
    dto: UpdateJobSchema,
    tenantOrgId?: string | null,
    actorId?: string | null,
  ) {
    const job = await this.findOne(id, tenantOrgId);

    if (
      tenantOrgId &&
      job.organizationId &&
      tenantOrgId !== job.organizationId
    ) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.JOB_INVALID_ORGANIZATION,
        "Access denied: job belongs to another organization.",
        { id, organizationId: job.organizationId },
      );
    }

    const beforeSnapshot = {
      title: job.title,
      department: job.department,
      location: job.location,
      workplace: job.workplace ?? null,
      type: job.type,
      experienceLevel: job.experienceLevel ?? null,
      openings: job.openings ?? 1,
      salaryRange: job.salaryRange ?? null,
      salaryMin: job.salaryMin ?? null,
      salaryMax: job.salaryMax ?? null,
      salaryCurrency: job.salaryCurrency ?? null,
      status: job.status,
      applicationDeadline: this.toDateKey(job.applicationDeadline),
      startDate: this.toDateKey(job.startDate),
      applicationFormConfig: normalizeJobApplicationFormConfig(
        job.applicationFormConfig,
      ),
      scoringConfig: normalizeJobScoringConfig(
        (job as { scoringConfig?: unknown }).scoringConfig,
      ),
    };

    const sanitizedDescription =
      dto.description !== undefined
        ? this.sanitizeDescription(dto.description)
        : undefined;
    const applicationDeadline =
      dto.applicationDeadline !== undefined
        ? this.parseDateOnly(dto.applicationDeadline, "applicationDeadline")
        : undefined;
    const startDate =
      dto.startDate !== undefined
        ? this.parseDateOnly(dto.startDate, "startDate")
        : undefined;
    const validatedFormConfig = this.parseApplicationFormConfigInput(
      dto.applicationFormConfig,
    );
    const validatedScoringConfig = this.parseScoringConfigInput(
      dto.scoringConfig,
    );

    const updated = await this.prisma.job.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.department !== undefined ? { department: dto.department } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.postalCode !== undefined ? { postalCode: dto.postalCode } : {}),
        ...(dto.experienceLevel !== undefined
          ? { experienceLevel: dto.experienceLevel }
          : {}),
        ...(dto.workplace !== undefined ? { workplace: dto.workplace } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(sanitizedDescription !== undefined
          ? { description: sanitizedDescription }
          : {}),
        ...(applicationDeadline !== undefined ? { applicationDeadline } : {}),
        ...(startDate !== undefined ? { startDate } : {}),
        ...(dto.openings !== undefined ? { openings: dto.openings } : {}),
        ...(dto.salaryRange !== undefined
          ? { salaryRange: dto.salaryRange }
          : {}),
        ...(dto.salaryMin !== undefined ? { salaryMin: dto.salaryMin } : {}),
        ...(dto.salaryMax !== undefined ? { salaryMax: dto.salaryMax } : {}),
        ...(dto.salaryCurrency !== undefined
          ? { salaryCurrency: dto.salaryCurrency }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(validatedFormConfig !== undefined
          ? {
              applicationFormConfig:
                validatedFormConfig === null
                  ? Prisma.DbNull
                  : (validatedFormConfig as unknown as Prisma.InputJsonValue),
            }
          : {}),
        ...(validatedScoringConfig !== undefined
          ? {
              scoringConfig:
                validatedScoringConfig === null
                  ? Prisma.DbNull
                  : (validatedScoringConfig as unknown as Prisma.InputJsonValue),
            }
          : {}),
      },
    });

    const orgId = updated.organizationId || job.organizationId || tenantOrgId;
    if (orgId) {
      this.eventsService?.emit({
        type: "JOBS_CHANGED",
        organizationId: orgId,
        data: { jobId: updated.id },
      });

      const afterSnapshot = {
        title: updated.title,
        department: updated.department,
        location: updated.location,
        workplace: updated.workplace ?? null,
        type: updated.type,
        experienceLevel: updated.experienceLevel ?? null,
        openings: updated.openings ?? 1,
        salaryRange: updated.salaryRange ?? null,
        salaryMin: updated.salaryMin ?? null,
        salaryMax: updated.salaryMax ?? null,
        salaryCurrency: updated.salaryCurrency ?? null,
        status: updated.status,
        applicationDeadline: this.toDateKey(updated.applicationDeadline),
        startDate: this.toDateKey(updated.startDate),
        applicationFormConfig: normalizeJobApplicationFormConfig(
          (updated as { applicationFormConfig?: unknown })
            .applicationFormConfig,
        ),
        scoringConfig: normalizeJobScoringConfig(
          (updated as { scoringConfig?: unknown }).scoringConfig,
        ),
      };
      const changes = computeAuditDiff(beforeSnapshot, afterSnapshot);
      if (changes.length > 0) {
        const isStatusOnly =
          changes.length === 1 && changes[0].field === "status";
        try {
          await this.auditLog?.logOrg(
            orgId,
            actorId ?? null,
            isStatusOnly
              ? AUDIT_ACTIONS.JOB_STATUS_CHANGED
              : AUDIT_ACTIONS.JOB_UPDATED,
            AUDIT_RESOURCES.JOB,
            isStatusOnly
              ? {
                  oldStatus: beforeSnapshot.status,
                  newStatus: afterSnapshot.status,
                  department: updated.department,
                }
              : {
                  department: updated.department,
                  status: updated.status,
                },
            undefined,
            {
              targetId: updated.id,
              targetLabel: updated.title,
              changes,
            },
          );
        } catch {
          // Fail-open audit logging
        }
      }
    }

    return {
      ...updated,
      applicationFormConfig: normalizeJobApplicationFormConfig(
        (updated as { applicationFormConfig?: unknown }).applicationFormConfig,
      ),
      scoringConfig: normalizeJobScoringConfig(
        (updated as { scoringConfig?: unknown }).scoringConfig,
      ),
    };
  }

  async remove(
    id: string,
    tenantOrgId?: string | null,
    actorId?: string | null,
  ) {
    const job = await this.findOne(id, tenantOrgId);

    if (
      tenantOrgId &&
      job.organizationId &&
      tenantOrgId !== job.organizationId
    ) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.JOB_INVALID_ORGANIZATION,
        "Access denied: job belongs to another organization.",
        { id, organizationId: job.organizationId },
      );
    }

    // Soft delete within atomic transaction (Two-Tier Deletion Protocol)
    await runInTransaction(this.prisma, async (tx) => {
      await tx.job.update({
        where: { id },
        data: {
          deletedAt: toInstant(),
        },
      });
    });

    const orgId = job.organizationId || tenantOrgId;
    if (orgId) {
      this.eventsService?.emit({
        type: "JOBS_CHANGED",
        organizationId: orgId,
        data: { jobId: id },
      });
      this.eventsService?.emit({
        type: "APPLICATIONS_CHANGED",
        organizationId: orgId,
        data: { jobId: id },
      });
      this.eventsService?.emit({
        type: "INTERVIEWS_CHANGED",
        organizationId: orgId,
        data: { jobId: id },
      });
      this.eventsService?.emit({
        type: "SOURCING_CHANGED",
        organizationId: orgId,
        data: { jobId: id },
      });

      try {
        await this.auditLog?.logOrg(
          orgId,
          actorId ?? null,
          AUDIT_ACTIONS.JOB_DELETED,
          AUDIT_RESOURCES.JOB,
          {
            department: job.department,
            status: job.status,
          },
          undefined,
          {
            targetId: job.id,
            targetLabel: job.title,
          },
        );
      } catch {
        // Fail-open audit logging
      }
    }

    return { success: true, message: `Job ${id} deleted successfully` };
  }

  async getPipelineStages(jobId: string, tenantOrgId?: string | null) {
    const job = await this.findOne(jobId, tenantOrgId);
    const orgId = tenantOrgId || job.organizationId;
    if (!orgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.JOB_INVALID_ORGANIZATION,
        "Organization ID is required to access job pipeline stages.",
        { jobId },
      );
    }

    const existing = await this.prisma.pipelineStage.findMany({
      where: { organizationId: orgId, jobId },
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
    });
    if (existing.length > 0) {
      return existing;
    }

    const defaultStageDefs: ReadonlyArray<{
      name: string;
      category: ApplicationStage;
      orderIndex: number;
      isTerminal: boolean;
    }> = [
      {
        name: "Applied",
        category: "APPLIED",
        orderIndex: 0,
        isTerminal: false,
      },
      {
        name: "Screening",
        category: "SCREENING",
        orderIndex: 1,
        isTerminal: false,
      },
      {
        name: "Interview",
        category: "INTERVIEW",
        orderIndex: 2,
        isTerminal: false,
      },
      { name: "Offer", category: "OFFER", orderIndex: 3, isTerminal: false },
      { name: "Hired", category: "HIRED", orderIndex: 4, isTerminal: true },
      {
        name: "Rejected",
        category: "REJECTED",
        orderIndex: 5,
        isTerminal: true,
      },
    ];

    return runInTransaction(this.prisma, async (tx) => {
      await tx.pipelineStage.createMany({
        data: defaultStageDefs.map((s) => ({
          id: crypto.randomUUID(),
          organizationId: orgId,
          jobId,
          name: s.name,
          category: s.category,
          orderIndex: s.orderIndex,
          isTerminal: s.isTerminal,
        })),
      });

      return tx.pipelineStage.findMany({
        where: { organizationId: orgId, jobId },
        orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
      });
    });
  }

  async updatePipelineStages(
    jobId: string,
    dto: UpsertPipelineStagesSchema,
    tenantOrgId?: string | null,
  ) {
    const job = await this.findOne(jobId, tenantOrgId);
    const orgId = tenantOrgId || job.organizationId;
    if (!orgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.JOB_INVALID_ORGANIZATION,
        "Organization ID is required to update job pipeline stages.",
        { jobId },
      );
    }

    const stages = await runInTransaction(this.prisma, async (tx) => {
      const existingStages = await tx.pipelineStage.findMany({
        where: { organizationId: orgId, jobId },
      });

      const incomingIds = new Set(
        dto.stages
          .map((s) => s.id)
          .filter((stageId): stageId is string => Boolean(stageId)),
      );
      const removedIds = existingStages
        .map((s) => s.id)
        .filter((stageId) => !incomingIds.has(stageId));

      if (removedIds.length > 0) {
        const assignedAppsCount = await tx.application.count({
          where: {
            organizationId: orgId,
            jobId,
            stageId: { in: removedIds },
          },
        });
        if (assignedAppsCount > 0) {
          throw new AppBadRequestException(
            APP_ERROR_CODES.VALIDATION_ERROR,
            "Cannot remove pipeline stage that still has applications assigned.",
            { jobId, removedIds: removedIds.join(",") },
          );
        }

        await tx.pipelineStage.deleteMany({
          where: { organizationId: orgId, jobId, id: { in: removedIds } },
        });
      }

      const existingMap = new Map(existingStages.map((e) => [e.id, e]));
      let syncedApplicationStages = false;

      for (const stageInput of dto.stages) {
        const existingStage = stageInput.id
          ? existingMap.get(stageInput.id)
          : undefined;
        if (stageInput.id && existingStage) {
          await tx.pipelineStage.updateMany({
            where: {
              id: stageInput.id,
              organizationId: orgId,
              jobId,
            },
            data: {
              name: stageInput.name,
              category: stageInput.category,
              orderIndex: stageInput.orderIndex,
              color: stageInput.color ?? null,
              isTerminal: stageInput.isTerminal ?? false,
              version: { increment: 1 },
            },
          });
          if (existingStage.category !== stageInput.category) {
            await tx.application.updateMany({
              where: {
                organizationId: orgId,
                jobId,
                stageId: stageInput.id,
              },
              data: {
                stage: stageInput.category,
                updatedAt: toInstant(),
              },
            });
            syncedApplicationStages = true;
          }
        } else {
          if (stageInput.id) {
            const conflicting = await tx.pipelineStage.findFirst({
              where: { id: stageInput.id },
              select: { id: true },
            });
            if (conflicting) {
              throw new AppBadRequestException(
                APP_ERROR_CODES.VALIDATION_ERROR,
                "Pipeline stage ID belongs to another job or organization.",
                { jobId, stageId: stageInput.id },
              );
            }
          }
          await tx.pipelineStage.create({
            data: {
              id: stageInput.id || crypto.randomUUID(),
              organizationId: orgId,
              jobId,
              name: stageInput.name,
              category: stageInput.category,
              orderIndex: stageInput.orderIndex,
              color: stageInput.color ?? null,
              isTerminal: stageInput.isTerminal ?? false,
            },
          });
        }
      }

      const nextStages = await tx.pipelineStage.findMany({
        where: { organizationId: orgId, jobId },
        orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
      });

      return { nextStages, syncedApplicationStages };
    });

    this.eventsService?.emit({
      type: "JOBS_CHANGED",
      organizationId: orgId,
      data: { jobId },
    });
    if (stages.syncedApplicationStages) {
      this.eventsService?.emit({
        type: "APPLICATIONS_CHANGED",
        organizationId: orgId,
        data: { jobId },
      });
    }

    return stages.nextStages;
  }
}
