import { Inject, Injectable, Optional } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import {
  APP_ERROR_CODES,
  APPLICATION_STAGES,
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
  foldVietnameseAccents,
  formatCandidateDisplayName,
  normalizeNameInput,
  type ApplicationStage,
  type ApplicationStats,
} from "@haihire/shared";
import {
  AppBadRequestException,
  AppConflictException,
  AppForbiddenException,
  AppNotFoundException,
} from "../../common/app-exception";
import { resolveOrgNameDisplayOrder } from "../../common/candidate-name.util";
import { findMatchingCandidateIds } from "../../common/person-search.util";
import { PrismaService, runInTransaction } from "../../prisma/prisma.service";
import { ActivitiesService } from "../../activities/activities.service";
import { UpdateCandidateDto } from "../dto/update-candidate.dto";
import { formatInterviewRecord } from "../../interviews/constants";
import { EventsService } from "../../events/events.service";
import { OrganizationsAuditLogService } from "../../organizations/services/organizations-audit-log.service";

function createEmptyStageCounts(): Record<ApplicationStage, number> {
  return APPLICATION_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = 0;
      return acc;
    },
    {} as Record<ApplicationStage, number>,
  );
}

/**
 * Redacts personal identifying information and resume metadata when the caller
 * lacks `candidate:view` permission.
 */
function maskCandidateRecord<T extends Record<string, unknown>>(
  candidate: T,
): T & { name: string } {
  return {
    ...candidate,
    name: "[Masked]",
    firstName: "[Masked]",
    lastName: "[Masked]",
    displayName: "[Masked]",
    gender: null,
    dateOfBirth: null,
    email: "",
    phone: null,
    resumeUrl: null,
    resumeFileName: null,
    resumeFileSize: null,
    resumeMimeType: null,
    resumeFileId: null,
  };
}

function maskApplicationFields<
  TCandidate extends Record<string, unknown>,
  TApp extends Record<string, unknown>,
  TEmpty extends null | undefined,
>(
  app: TApp,
  candidate: TCandidate | null | undefined,
  emptyCandidateFallback: TEmpty,
) {
  return {
    ...app,
    candidate: candidate
      ? maskCandidateRecord(candidate)
      : emptyCandidateFallback,
    candidateName: "[Masked]",
    candidateEmail: "",
    candidatePhone: null as string | null,
    resumeUrl: "",
    resumeFileName: "",
    resumeFileSize: null as number | null,
    resumeMimeType: null as string | null,
    resumeFileId: null as string | null,
    interviews: [] as Array<Record<string, unknown>>,
  };
}

export interface ApplicationListOptions {
  page?: number;
  limit?: number;
  search?: string;
  jobId?: string;
  stage?: string;
  score?: "80" | "60" | "BELOW_60";
  sortBy?: "candidate" | "email" | "job" | "status" | "score" | "applied";
  sortOrder?: "asc" | "desc";
}

@Injectable()
export class ApplicationsQueryService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(ActivitiesService)
    private readonly activitiesService?: ActivitiesService,
    @Optional()
    @Inject(EventsService)
    private readonly eventsService?: EventsService,
    @Optional()
    @Inject(OrganizationsAuditLogService)
    private readonly auditLog?: OrganizationsAuditLogService,
  ) {}

  async findByJob(
    jobId: string,
    organizationId?: string,
    options?: { limit?: number; offset?: number },
    fullCandidateAccess = true,
  ) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, deletedAt: null },
      select: {
        id: true,
        title: true,
        organizationId: true,
      },
    });

    if (!job) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.JOB_NOT_FOUND,
        `Job with ID ${jobId} not found`,
      );
    }

    if (
      organizationId &&
      job.organizationId &&
      job.organizationId !== organizationId
    ) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.JOB_INVALID_ORGANIZATION,
        "Access denied: job belongs to another organization.",
        { jobId, organizationId },
      );
    }

    // Pipeline Kanban loads all job applications unless caller explicitly limits pagination
    const take =
      options?.limit && options.limit > 0
        ? Math.min(options.limit, 1000)
        : undefined;
    const skip =
      options?.offset && options.offset > 0 ? options.offset : undefined;

    let applications = await this.prisma.application.findMany({
      where: {
        jobId,
        ...(job.organizationId ? { organizationId: job.organizationId } : {}),
        candidate: {
          deletedAt: null,
        },
      },
      include: {
        candidate: true,
        interviews: true,
        applicationNotes: true,
      },
      orderBy: [{ orderIndex: "asc" }, { id: "asc" }],
      skip,
      take,
    });

    applications = applications.filter((app) => !app.candidate?.deletedAt);

    if (applications.length === 0) {
      return [];
    }

    const missingCandidates = applications.some((app) => !app.candidate);
    let candidateMap: Map<
      string,
      {
        name?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        displayName?: string | null;
        email?: string | null;
        phone?: string | null;
        resumeUrl?: string | null;
        resumeFileName?: string | null;
        resumeFileSize?: number | null;
        resumeMimeType?: string | null;
        deletedAt?: Date | string | null;
      }
    > | null = null;

    if (missingCandidates && applications.length > 0) {
      const candidateIds = Array.from(
        new Set(applications.map((a) => a.candidateId).filter(Boolean)),
      );
      if (candidateIds.length > 0) {
        const cands = await this.prisma.candidate.findMany({
          where: { id: { in: candidateIds } },
        });
        candidateMap = new Map(cands.map((c) => [c.id, c]));
      }
    }

    if (missingCandidates && candidateMap) {
      applications = applications.filter((app) => {
        const c = candidateMap!.get(app.candidateId);
        return !c?.deletedAt;
      });
    }

    if (!fullCandidateAccess) {
      return applications.map((app) => {
        const candidate =
          app.candidate ||
          (candidateMap?.get(
            app.candidateId,
          ) as unknown as typeof app.candidate);
        return maskApplicationFields(app, candidate, undefined);
      });
    }

    const nameOrder = await resolveOrgNameDisplayOrder(
      this.prisma,
      job.organizationId,
    );

    return applications.map((app) => {
      const candidate =
        app.candidate ||
        (candidateMap?.get(app.candidateId) as unknown as typeof app.candidate);
      const fallbackCand = candidateMap?.get(app.candidateId);
      const resolvedCandidateName = candidate
        ? formatCandidateDisplayName(candidate, nameOrder) ||
          fallbackCand?.name ||
          "Unknown"
        : fallbackCand?.name || "Unknown";
      const interviews = (app.interviews || []).map((intv) =>
        formatInterviewRecord(intv),
      );
      return {
        ...app,
        candidate: candidate
          ? {
              ...candidate,
              name: resolvedCandidateName,
            }
          : undefined,
        candidateName: resolvedCandidateName,
        candidateEmail: candidate?.email || fallbackCand?.email || "",
        candidatePhone: candidate?.phone || fallbackCand?.phone || null,
        resumeUrl:
          app.resumeUrl ||
          candidate?.resumeUrl ||
          fallbackCand?.resumeUrl ||
          "",
        resumeFileName:
          app.resumeFileName ||
          candidate?.resumeFileName ||
          fallbackCand?.resumeFileName ||
          "Resume.pdf",
        resumeFileSize:
          app.resumeFileSize ??
          candidate?.resumeFileSize ??
          fallbackCand?.resumeFileSize ??
          null,
        resumeMimeType:
          app.resumeMimeType ??
          candidate?.resumeMimeType ??
          fallbackCand?.resumeMimeType ??
          "application/pdf",
        interviews,
      };
    });
  }

  async listPaginated(
    organizationId?: string,
    options?: ApplicationListOptions,
    tenantOrgId?: string | null,
    fullCandidateAccess = true,
  ) {
    if (organizationId && tenantOrgId && organizationId !== tenantOrgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.APPLICATION_INVALID_ORGANIZATION,
        "Access denied: cannot access applications from another organization.",
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
        page,
        limit,
        totalPages: 0,
      };
    }

    const appWhere: Prisma.ApplicationWhereInput = {
      organizationId: targetOrgId,
      job: { deletedAt: null },
      candidate: { deletedAt: null },
    };

    if (options?.jobId) {
      appWhere.jobId = options.jobId;
    }

    if (options?.stage) {
      const stages = options.stage
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      if (stages.length > 0) {
        appWhere.stage = { in: stages as ApplicationStage[] };
      }
    }

    if (options?.score === "80") {
      appWhere.matchScore = { gte: 80 };
    } else if (options?.score === "60") {
      appWhere.matchScore = { gte: 60, lt: 80 };
    } else if (options?.score === "BELOW_60") {
      appWhere.matchScore = { not: null, lt: 60 };
    }

    if (options?.search && options.search.trim() !== "") {
      const q = foldVietnameseAccents(options.search);
      // Do not oracle-match candidate PII when the caller lacks candidate:view
      const [matchedCandidateIds, orgJobs] = await Promise.all([
        fullCandidateAccess
          ? findMatchingCandidateIds(this.prisma, {
              organizationId: targetOrgId,
              rawSearch: options.search,
            })
          : Promise.resolve([]),
        this.prisma.job.findMany({
          where: { organizationId: targetOrgId, deletedAt: null },
          select: { id: true, title: true },
        }),
      ]);

      const matchingJobIds = orgJobs
        .filter((j) => foldVietnameseAccents(j.title).includes(q))
        .map((j) => j.id);

      if (matchedCandidateIds.length === 0 && matchingJobIds.length === 0) {
        return {
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }

      appWhere.OR = [
        ...(matchedCandidateIds.length > 0
          ? [{ candidateId: { in: matchedCandidateIds } }]
          : []),
        ...(matchingJobIds.length > 0
          ? [{ jobId: { in: matchingJobIds } }]
          : []),
      ];
    }

    const nameOrder = fullCandidateAccess
      ? await resolveOrgNameDisplayOrder(this.prisma, targetOrgId)
      : "LAST_FIRST";

    const sortOrder: Prisma.SortOrder =
      options?.sortOrder === "asc" ? "asc" : "desc";

    let orderBy:
      | Prisma.ApplicationOrderByWithRelationInput
      | Prisma.ApplicationOrderByWithRelationInput[];

    switch (options?.sortBy) {
      case "score":
        orderBy = [
          { matchScore: { sort: sortOrder, nulls: "last" } },
          { createdAt: "desc" },
          { id: "asc" },
        ];
        break;
      case "status":
        orderBy = [{ stage: sortOrder }, { createdAt: "desc" }, { id: "asc" }];
        break;
      case "job":
        orderBy = [
          { job: { title: sortOrder } },
          { createdAt: "desc" },
          { id: "asc" },
        ];
        break;
      case "candidate":
        orderBy = fullCandidateAccess
          ? nameOrder === "LAST_FIRST"
            ? [
                { candidate: { lastName: { sort: sortOrder, nulls: "last" } } },
                {
                  candidate: { firstName: { sort: sortOrder, nulls: "last" } },
                },
                {
                  candidate: {
                    displayName: { sort: sortOrder, nulls: "last" },
                  },
                },
                { createdAt: "desc" },
              ]
            : [
                {
                  candidate: { firstName: { sort: sortOrder, nulls: "last" } },
                },
                { candidate: { lastName: { sort: sortOrder, nulls: "last" } } },
                {
                  candidate: {
                    displayName: { sort: sortOrder, nulls: "last" },
                  },
                },
                { createdAt: "desc" },
              ]
          : { createdAt: "desc" };
        break;
      case "email":
        orderBy = fullCandidateAccess
          ? [{ candidate: { email: sortOrder } }, { createdAt: "desc" }]
          : { createdAt: "desc" };
        break;
      case "applied":
        orderBy = [{ createdAt: sortOrder }, { id: "asc" }];
        break;
      default:
        orderBy = { createdAt: "desc" };
        break;
    }

    const [total, pagedApps] = await Promise.all([
      this.prisma.application.count({
        where: { ...appWhere, organizationId: targetOrgId },
      }),
      this.prisma.application.findMany({
        where: { ...appWhere, organizationId: targetOrgId },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    const totalPages = Math.ceil(total / limit) || 1;

    if (total === 0) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    const neededCandidateIds = [
      ...new Set(pagedApps.map((a) => a.candidateId)),
    ];
    const neededJobIds = [...new Set(pagedApps.map((a) => a.jobId))];
    const appIds = pagedApps.map((a) => a.id);

    const [candidates, pagedJobs, allInterviews] = await Promise.all([
      neededCandidateIds.length > 0
        ? this.prisma.candidate.findMany({
            where: {
              id: { in: neededCandidateIds },
              organizationId: targetOrgId,
              deletedAt: null,
            },
          })
        : Promise.resolve([]),
      neededJobIds.length > 0
        ? this.prisma.job.findMany({
            where: {
              id: { in: neededJobIds },
              organizationId: targetOrgId,
              deletedAt: null,
            },
            select: {
              id: true,
              title: true,
              department: true,
              location: true,
            },
          })
        : Promise.resolve([]),
      fullCandidateAccess && appIds.length > 0
        ? this.prisma.interview.findMany({
            where: { applicationId: { in: appIds } },
          })
        : Promise.resolve([]),
    ]);

    const candidateMap = new Map(candidates.map((c) => [c.id, c]));
    const jobMap = new Map(pagedJobs.map((j) => [j.id, j]));
    const interviewsByApp = new Map<string, Array<Record<string, unknown>>>();
    for (const intv of allInterviews) {
      const list = interviewsByApp.get(intv.applicationId) || [];
      list.push(formatInterviewRecord(intv));
      interviewsByApp.set(intv.applicationId, list);
    }

    if (!fullCandidateAccess) {
      const data = pagedApps.map((app) => {
        const candidate = candidateMap.get(app.candidateId);
        const job = jobMap.get(app.jobId);
        return {
          ...maskApplicationFields(app, candidate, undefined),
          job,
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

    const data = pagedApps.map((app) => {
      const candidate = candidateMap.get(app.candidateId);
      const job = jobMap.get(app.jobId);
      const resolvedCandidateName = candidate
        ? formatCandidateDisplayName(candidate, nameOrder) || "Unknown"
        : "Unknown";
      return {
        ...app,
        job,
        candidate: candidate
          ? {
              ...candidate,
              name: resolvedCandidateName,
            }
          : undefined,
        candidateName: resolvedCandidateName,
        candidateEmail: candidate?.email || "",
        candidatePhone: candidate?.phone || null,
        resumeUrl: app.resumeUrl || candidate?.resumeUrl || "",
        resumeFileName:
          app.resumeFileName || candidate?.resumeFileName || "Resume.pdf",
        resumeFileSize: app.resumeFileSize ?? candidate?.resumeFileSize ?? null,
        resumeMimeType:
          app.resumeMimeType ?? candidate?.resumeMimeType ?? "application/pdf",
        interviews: interviewsByApp.get(app.id) || [],
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

  async getStats(
    organizationId?: string,
    tenantOrgId?: string | null,
  ): Promise<ApplicationStats> {
    if (organizationId && tenantOrgId && organizationId !== tenantOrgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.APPLICATION_INVALID_ORGANIZATION,
        "Access denied: cannot access applications from another organization.",
        { organizationId },
      );
    }

    const targetOrgId = tenantOrgId || organizationId || undefined;
    const byStage = createEmptyStageCounts();
    if (!targetOrgId) {
      return {
        totalApplications: 0,
        byStage,
        byJob: {},
      };
    }

    const [jobs, candidates] = await Promise.all([
      this.prisma.job.findMany({
        where: { organizationId: targetOrgId, deletedAt: null },
        select: { id: true },
      }),
      this.prisma.candidate.findMany({
        where: { organizationId: targetOrgId, deletedAt: null },
        select: { id: true },
      }),
    ]);

    const activeJobIds = new Set(jobs.map((j) => j.id));
    const activeCandIds = new Set(candidates.map((c) => c.id));

    if (activeJobIds.size === 0 || activeCandIds.size === 0) {
      return {
        totalApplications: 0,
        byStage,
        byJob: {},
      };
    }

    const grouped = await this.prisma.application.groupBy({
      by: ["jobId", "stage"],
      where: {
        jobId: { in: Array.from(activeJobIds) },
        candidateId: { in: Array.from(activeCandIds) },
      },
      _count: { _all: true },
    });

    const byJob: ApplicationStats["byJob"] = {};
    let totalApplications = 0;

    for (const row of grouped) {
      const stageKey = row.stage as ApplicationStage;
      const count = row._count._all;
      if (!(stageKey in byStage)) continue;

      totalApplications += count;
      byStage[stageKey] += count;

      if (!byJob[row.jobId]) {
        byJob[row.jobId] = {
          total: 0,
          byStage: createEmptyStageCounts(),
        };
      }
      byJob[row.jobId].total += count;
      byJob[row.jobId].byStage[stageKey] += count;
    }

    return {
      totalApplications,
      byStage,
      byJob,
    };
  }

  async findOne(
    id: string,
    tenantOrgId?: string | null,
    fullCandidateAccess = true,
  ) {
    const where: { id: string; organizationId?: string } = { id };
    if (tenantOrgId) {
      where.organizationId = tenantOrgId;
    }

    const app = await this.prisma.application.findFirst({
      where,
    });

    if (!app) {
      if (tenantOrgId) {
        const otherOrg = await this.prisma.application.findFirst({
          where: { id },
          select: { id: true, organizationId: true },
        });
        if (
          otherOrg &&
          otherOrg.organizationId &&
          otherOrg.organizationId !== tenantOrgId
        ) {
          throw new AppForbiddenException(
            APP_ERROR_CODES.APPLICATION_INVALID_ORGANIZATION,
            "Access denied: application belongs to another organization.",
            { id },
          );
        }
      }
      throw new AppNotFoundException(
        APP_ERROR_CODES.APPLICATION_NOT_FOUND,
        `Application with ID ${id} not found`,
        { id },
      );
    }

    if (
      tenantOrgId &&
      app.organizationId &&
      app.organizationId !== tenantOrgId
    ) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.APPLICATION_INVALID_ORGANIZATION,
        "Access denied: application belongs to another organization.",
        { id, organizationId: app.organizationId },
      );
    }

    const [job, candidate] = await Promise.all([
      this.prisma.job.findFirst({
        where: {
          id: app.jobId,
          ...(tenantOrgId ? { organizationId: tenantOrgId } : {}),
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          department: true,
          location: true,
          organizationId: true,
        },
      }),
      this.prisma.candidate.findFirst({
        where: {
          id: app.candidateId,
          ...(tenantOrgId ? { organizationId: tenantOrgId } : {}),
          deletedAt: null,
        },
      }),
    ]);

    const appOrgId = job?.organizationId || candidate?.organizationId;
    if (tenantOrgId && appOrgId && tenantOrgId !== appOrgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.APPLICATION_INVALID_ORGANIZATION,
        "Access denied: application belongs to another organization.",
        { id, organizationId: appOrgId },
      );
    }

    if (!job || !candidate) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.APPLICATION_NOT_FOUND,
        `Application with ID ${id} not found`,
        { id },
      );
    }

    if (!fullCandidateAccess) {
      return {
        ...maskApplicationFields(app, candidate, null),
        job: job || null,
      };
    }

    const appInterviews = (
      await this.prisma.interview.findMany({
        where: { applicationId: id },
      })
    ).map((intv) => formatInterviewRecord(intv));

    const nameOrder = await resolveOrgNameDisplayOrder(
      this.prisma,
      appOrgId || tenantOrgId,
    );

    const resolvedCandidateName = candidate
      ? formatCandidateDisplayName(candidate, nameOrder) || "Unknown"
      : "Unknown";

    return {
      ...app,
      job: job || null,
      candidate: candidate
        ? {
            ...candidate,
            name: resolvedCandidateName,
          }
        : null,
      candidateName: resolvedCandidateName,
      candidateEmail: candidate?.email || "",
      candidatePhone: candidate?.phone || null,
      resumeUrl:
        app.resumeUrl !== undefined
          ? app.resumeUrl || ""
          : candidate?.resumeUrl || "",
      resumeFileName:
        app.resumeUrl === null
          ? ""
          : app.resumeFileName || candidate?.resumeFileName || "Resume.pdf",
      resumeFileSize:
        app.resumeUrl === null
          ? null
          : (app.resumeFileSize ?? candidate?.resumeFileSize ?? null),
      resumeMimeType:
        app.resumeUrl === null
          ? null
          : (app.resumeMimeType ??
            candidate?.resumeMimeType ??
            "application/pdf"),
      interviews: appInterviews,
    };
  }

  async updateCandidate(
    id: string,
    dto: UpdateCandidateDto,
    tenantOrgId?: string | null,
  ) {
    const existing = await this.findOne(id, tenantOrgId);

    // Update candidate profile directly
    if (existing.candidateId) {
      const targetOrgId =
        existing.job?.organizationId ||
        existing.candidate?.organizationId ||
        tenantOrgId;
      const candidateUpdate: Record<string, unknown> = {};
      if (dto.firstName !== undefined) {
        const trimmed = normalizeNameInput(dto.firstName);
        if (!trimmed) {
          throw new AppBadRequestException(
            APP_ERROR_CODES.CANDIDATE_INFO_REQUIRED,
            "First name cannot be empty.",
          );
        }
        candidateUpdate.firstName = trimmed;
      }
      if (dto.lastName !== undefined) {
        const trimmed = normalizeNameInput(dto.lastName);
        if (!trimmed) {
          throw new AppBadRequestException(
            APP_ERROR_CODES.CANDIDATE_INFO_REQUIRED,
            "Last name cannot be empty.",
          );
        }
        candidateUpdate.lastName = trimmed;
      }
      if (dto.displayName !== undefined) {
        candidateUpdate.displayName = dto.displayName?.trim() || null;
      }
      if (dto.candidateEmail !== undefined) {
        const normalizedEmail = dto.candidateEmail.trim().toLowerCase();
        if (targetOrgId && this.prisma.candidate?.findFirst) {
          const dup = await this.prisma.candidate.findFirst({
            where: {
              organizationId: targetOrgId,
              email: normalizedEmail,
              id: { not: existing.candidateId },
              deletedAt: null,
            },
            select: { id: true, organizationId: true },
          });
          if (dup) {
            throw new AppConflictException(
              APP_ERROR_CODES.CANDIDATE_EMAIL_EXISTS,
              "A candidate with this email already exists in your organization.",
            );
          }
        }
        candidateUpdate.email = normalizedEmail;
      }
      if (dto.candidatePhone !== undefined)
        candidateUpdate.phone = dto.candidatePhone;
      if (dto.resumeUrl !== undefined) {
        if (dto.resumeUrl && targetOrgId) {
          const safeTenant = targetOrgId.trim().replace(/[^a-zA-Z0-9_-]/g, "");
          let cleanPath = dto.resumeUrl.trim();
          try {
            if (
              cleanPath.startsWith("http://") ||
              cleanPath.startsWith("https://")
            ) {
              cleanPath = new URL(cleanPath).pathname;
            }
          } catch {
            // keep raw path
          }
          cleanPath = cleanPath.replace(/\\/g, "/").replace(/^\/+/, "");
          if (cleanPath.startsWith("haihire-resumes/")) {
            cleanPath = cleanPath.slice("haihire-resumes/".length);
          }
          if (
            cleanPath.startsWith("tenants/") &&
            !cleanPath.startsWith(`tenants/${safeTenant}/`)
          ) {
            throw new AppForbiddenException(
              APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
              "Cross-tenant resume URL is not allowed.",
            );
          }
        }
        candidateUpdate.resumeUrl = dto.resumeUrl;
      }
      if (dto.resumeFileName !== undefined)
        candidateUpdate.resumeFileName = dto.resumeFileName;

      await this.prisma.candidate.update({
        where: { id: existing.candidateId },
        data: candidateUpdate,
      });

      const orgId =
        existing.job?.organizationId ||
        existing.candidate?.organizationId ||
        tenantOrgId;
      if (orgId) {
        this.eventsService?.emit({
          type: "APPLICATIONS_CHANGED",
          organizationId: orgId,
          data: { applicationId: id, candidateId: existing.candidateId },
        });
        this.eventsService?.emit({
          type: "CANDIDATES_CHANGED",
          organizationId: orgId,
          data: { candidateId: existing.candidateId },
        });
      }
    }

    return this.findOne(id, tenantOrgId);
  }

  async remove(
    id: string,
    tenantOrgId?: string | null,
    actorId?: string | null,
  ) {
    const existing = await this.findOne(id, tenantOrgId);
    if (
      tenantOrgId &&
      existing.organizationId &&
      existing.organizationId !== tenantOrgId
    ) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.APPLICATION_INVALID_ORGANIZATION,
        "Access denied: application belongs to another organization.",
        { id, organizationId: existing.organizationId },
      );
    }
    const orgId =
      existing.job?.organizationId ||
      existing.candidate?.organizationId ||
      existing.organizationId ||
      tenantOrgId;

    if (orgId && existing.candidate) {
      try {
        if (this.activitiesService) {
          await this.activitiesService.createActivity({
            organizationId: orgId,
            candidateId: existing.candidate.id,
            applicationId: null, // Detach from application record so log persists when application is deleted
            type: "NOTE_ADDED",
            title: `Application Removed: ${existing.job?.title || "Position"}`,
            description: `Application for job '${existing.job?.title || ""}' was deleted from the system.`,
            actorName: "HR Team",
            actorRole: "ADMIN",
            metadata: {
              action: "APPLICATION_DELETED",
              applicationId: existing.id,
              candidateName: existing.candidateName || existing.candidate.name,
              candidateEmail: existing.candidate.email,
              jobId: existing.job?.id,
              jobTitle: existing.job?.title,
              stageAtDeletion: existing.stage,
            },
          });
        }
      } catch (err) {
        console.warn(
          "Failed to create audit activity log on application deletion:",
          err,
        );
      }
    }

    await runInTransaction(this.prisma, async (tx) => {
      try {
        await tx.interview.deleteMany({
          where: {
            applicationId: id,
            ...(orgId && existing.organizationId
              ? { organizationId: orgId }
              : {}),
          },
        });
      } catch {
        // Cascade handles if schema level onDelete: Cascade is configured
      }
      await tx.application.delete({
        where: { id },
      });
    });
    if (orgId) {
      this.eventsService?.emit({
        type: "APPLICATIONS_CHANGED",
        organizationId: orgId,
        data: { applicationId: id },
      });
      this.eventsService?.emit({
        type: "INTERVIEWS_CHANGED",
        organizationId: orgId,
        data: { applicationId: id },
      });
      this.eventsService?.emit({
        type: "JOBS_CHANGED",
        organizationId: orgId,
        data: { jobId: existing.job?.id },
      });
      this.eventsService?.emit({
        type: "SOURCING_CHANGED",
        organizationId: orgId,
        data: { applicationId: id },
      });
      this.eventsService?.emit({
        type: "ACTIVITIES_CHANGED",
        organizationId: orgId,
        data: { candidateId: existing.candidate?.id },
      });

      const candidateLabel =
        existing.candidateName || existing.candidate?.name || "Candidate";
      const jobLabel = existing.job?.title || "Job";
      try {
        await this.auditLog?.logOrg(
          orgId,
          actorId ?? null,
          AUDIT_ACTIONS.APPLICATION_DELETED,
          AUDIT_RESOURCES.APPLICATION,
          {
            jobId: existing.jobId,
            candidateId: existing.candidateId,
            stage: existing.stage,
            jobTitle: existing.job?.title,
            candidateName: candidateLabel,
          },
          undefined,
          {
            targetId: existing.id,
            targetLabel: `${candidateLabel} — ${jobLabel}`,
          },
        );
      } catch {
        // Fail-open audit logging
      }
    }
    return { success: true, message: `Application ${id} deleted successfully` };
  }
}
