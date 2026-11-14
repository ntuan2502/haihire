import { Inject, Injectable } from "@nestjs/common";
import {
  APP_ERROR_CODES,
  foldVietnameseAccents,
  formatCandidateDisplayName,
  type NameDisplayOrder,
} from "@haihire/shared";
import {
  AppForbiddenException,
  AppNotFoundException,
} from "../../common/app-exception";
import { resolveOrgNameDisplayOrder } from "../../common/candidate-name.util";
import { findMatchingCandidateIds } from "../../common/person-search.util";
import { PrismaService } from "../../prisma/prisma.service";
import { formatInterviewRecord } from "../constants";

export interface FindAllInterviewsOptions {
  organizationId?: string;
  jobId?: string;
  applicationId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  search?: string;
  tab?: string;
  sortBy?: string;
  tenantOrgId?: string | null;
}

@Injectable()
export class InterviewsQueryService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async findAll(options?: FindAllInterviewsOptions) {
    if (
      options?.organizationId &&
      options?.tenantOrgId &&
      options.organizationId !== options.tenantOrgId
    ) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.INTERVIEW_INVALID_ORGANIZATION,
        "Access denied: cannot access interviews from another organization.",
        { organizationId: options.organizationId },
      );
    }
    const targetOrgId =
      options?.tenantOrgId || options?.organizationId || undefined;

    interface InterviewRecord {
      id: string;
      applicationId: string;
      scheduledAt: Date | string;
      type: string;
      format: string;
      linkOrLocation: string;
      interviewer: string;
      round: number;
      feedback?: string | null;
      score?: number | null;
      status?: string | null;
      createdAt?: Date | string | null;
      updatedAt?: Date | string | null;
      deletedAt?: Date | string | null;
      [key: string]: unknown;
    }

    interface AppRecord {
      id: string;
      candidateId: string;
      jobId: string;
      stage?: string | null;
      matchScore?: number | null;
      createdAt?: Date | string | null;
      updatedAt?: Date | string | null;
      [key: string]: unknown;
    }

    interface CandidateRecord {
      id: string;
      name: string;
      firstName?: string | null;
      lastName?: string | null;
      displayName?: string | null;
      email?: string | null;
      phone?: string | null;
      organizationId?: string | null;
      [key: string]: unknown;
    }

    interface JobRecord {
      id: string;
      title: string;
      department?: string | null;
      organizationId?: string | null;
      [key: string]: unknown;
    }

    const defaultLimit =
      options?.limit && options.limit > 0 ? options.limit : 20;
    const defaultPage = options?.page && options.page > 0 ? options.page : 1;

    // 1. Resolve tenant Application IDs
    let targetAppIds: string[] | null = null;

    if (options?.applicationId) {
      if (targetOrgId) {
        const app = await this.prisma.application.findFirst({
          where: { id: options.applicationId },
          select: { id: true, jobId: true, candidateId: true },
        });
        if (!app) {
          return {
            data: [],
            total: 0,
            page: defaultPage,
            limit: defaultLimit,
            totalPages: 0,
          };
        }
        const [orgJob, orgCandidate] = await Promise.all([
          this.prisma.job.findFirst({
            where: {
              id: app.jobId,
              organizationId: targetOrgId,
              deletedAt: null,
            },
            select: { id: true },
          }),
          this.prisma.candidate.findFirst({
            where: {
              id: app.candidateId,
              organizationId: targetOrgId,
              deletedAt: null,
            },
            select: { id: true },
          }),
        ]);
        if (!orgJob && !orgCandidate) {
          return {
            data: [],
            total: 0,
            page: defaultPage,
            limit: defaultLimit,
            totalPages: 0,
          };
        }
      }
      targetAppIds = [options.applicationId];
    } else if (options?.jobId) {
      if (targetOrgId) {
        const orgJob = await this.prisma.job.findFirst({
          where: {
            id: options.jobId,
            organizationId: targetOrgId,
            deletedAt: null,
          },
          select: { id: true },
        });
        if (!orgJob) {
          return {
            data: [],
            total: 0,
            page: defaultPage,
            limit: defaultLimit,
            totalPages: 0,
          };
        }
      }
      const targetApps = await this.prisma.application.findMany({
        where: { jobId: options.jobId },
        select: { id: true },
      });
      targetAppIds = targetApps.map((a) => a.id);
      if (targetAppIds.length === 0) {
        return {
          data: [],
          total: 0,
          page: defaultPage,
          limit: defaultLimit,
          totalPages: 0,
        };
      }
    } else if (targetOrgId) {
      const [orgCandidates, orgJobs] = await Promise.all([
        this.prisma.candidate.findMany({
          where: { organizationId: targetOrgId, deletedAt: null },
          select: { id: true },
        }),
        this.prisma.job.findMany({
          where: { organizationId: targetOrgId, deletedAt: null },
          select: { id: true },
        }),
      ]);

      const candidateIds = orgCandidates.map((c) => c.id);
      const jobIds = orgJobs.map((j) => j.id);

      if (candidateIds.length === 0 && jobIds.length === 0) {
        return {
          data: [],
          total: 0,
          page: defaultPage,
          limit: defaultLimit,
          totalPages: 0,
        };
      }

      const targetApps = await this.prisma.application.findMany({
        where: {
          OR: [
            ...(candidateIds.length > 0
              ? [{ candidateId: { in: candidateIds } }]
              : []),
            ...(jobIds.length > 0 ? [{ jobId: { in: jobIds } }] : []),
          ],
        },
        select: { id: true },
      });

      targetAppIds = targetApps.map((a) => a.id);
      if (targetAppIds.length === 0) {
        return {
          data: [],
          total: 0,
          page: defaultPage,
          limit: defaultLimit,
          totalPages: 0,
        };
      }
    }

    // 2. Resolve Search Filters
    let searchAppIds: string[] = [];
    let isSearchActive = false;
    if (options?.search && options.search.trim()) {
      isSearchActive = true;
      const q = foldVietnameseAccents(options.search);
      const [searchCandidateIds, matchingJobs] = await Promise.all([
        findMatchingCandidateIds(this.prisma, {
          organizationId: targetOrgId,
          rawSearch: options.search,
        }),
        this.prisma.job.findMany({
          where: {
            ...(targetOrgId ? { organizationId: targetOrgId } : {}),
            deletedAt: null,
          },
          select: { id: true, title: true },
        }),
      ]);

      const searchJobIds = matchingJobs
        .filter((j) => foldVietnameseAccents(j.title).includes(q))
        .map((j) => j.id);

      if (searchCandidateIds.length > 0 || searchJobIds.length > 0) {
        const searchApps = await this.prisma.application.findMany({
          where: {
            OR: [
              ...(searchCandidateIds.length > 0
                ? [{ candidateId: { in: searchCandidateIds } }]
                : []),
              ...(searchJobIds.length > 0
                ? [{ jobId: { in: searchJobIds } }]
                : []),
            ],
            ...(targetAppIds ? { id: { in: targetAppIds } } : {}),
          },
          select: { id: true },
        });
        searchAppIds = searchApps.map((a) => a.id);
      }
    }

    // 3. Construct direct Interview query
    const interviewWhere: Record<string, unknown> = {};

    if (targetAppIds) {
      interviewWhere.applicationId = { in: targetAppIds };
    }

    // Date range filter (Calendar mode)
    if (options?.startDate && options?.endDate) {
      interviewWhere.scheduledAt = {
        gte: new Date(options.startDate),
        lte: new Date(options.endDate),
      };
    } else if (options?.tab === "UPCOMING") {
      const now = new Date();
      const startOfToday = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
      );
      interviewWhere.scheduledAt = {
        gte: startOfToday,
      };
    } else if (options?.tab === "AWAITING") {
      const now = new Date();
      interviewWhere.scheduledAt = {
        lt: now,
      };
      interviewWhere.scorecard = null;
    }

    if (isSearchActive) {
      const q = options?.search?.trim() || "";
      interviewWhere.OR = [
        ...(searchAppIds.length > 0
          ? [{ applicationId: { in: searchAppIds } }]
          : []),
        { interviewer: { contains: q, mode: "insensitive" } },
        { linkOrLocation: { contains: q, mode: "insensitive" } },
      ];
    }

    const isCalendarMode = Boolean(options?.startDate && options?.endDate);
    const limit = isCalendarMode ? 250 : defaultLimit;
    const page = isCalendarMode ? 1 : defaultPage;
    const skip = (page - 1) * limit;

    const [rawInterviews, total] = await Promise.all([
      this.prisma.interview.findMany({
        where: interviewWhere,
        orderBy:
          options?.sortBy === "newest"
            ? { createdAt: "desc" }
            : { scheduledAt: "asc" },
        skip,
        take: limit,
      }),
      this.prisma.interview.count({
        where: interviewWhere,
      }),
    ]);

    const interviews = rawInterviews as unknown as InterviewRecord[];

    // 4. Enrich ONLY the fetched page slice (at most 20 records)
    const neededAppIds = [...new Set(interviews.map((i) => i.applicationId))];
    const appsMap = new Map<string, AppRecord>();

    if (neededAppIds.length > 0) {
      const fetchedApps = await this.prisma.application.findMany({
        where: { id: { in: neededAppIds } },
        select: {
          id: true,
          candidateId: true,
          jobId: true,
          stage: true,
          matchScore: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      for (const a of fetchedApps) {
        appsMap.set(a.id, a as unknown as AppRecord);
      }
    }

    const neededCandidateIds = [
      ...new Set(Array.from(appsMap.values()).map((a) => a.candidateId)),
    ];
    const candidatesMap = new Map<string, CandidateRecord>();
    if (neededCandidateIds.length > 0) {
      const candidates = await this.prisma.candidate.findMany({
        where: {
          id: { in: neededCandidateIds },
          ...(targetOrgId ? { organizationId: targetOrgId } : {}),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayName: true,
          email: true,
          phone: true,
          organizationId: true,
        },
      });
      for (const c of candidates) {
        candidatesMap.set(c.id, c as unknown as CandidateRecord);
      }
    }

    const neededJobIds = [
      ...new Set(Array.from(appsMap.values()).map((a) => a.jobId)),
    ];
    const jobsMap = new Map<string, JobRecord>();
    if (neededJobIds.length > 0) {
      const jobs = await this.prisma.job.findMany({
        where: {
          id: { in: neededJobIds },
          ...(targetOrgId ? { organizationId: targetOrgId } : {}),
        },
        select: {
          id: true,
          title: true,
          department: true,
          organizationId: true,
        },
      });
      for (const j of jobs) {
        jobsMap.set(j.id, j as unknown as JobRecord);
      }
    }

    const orgOrder: NameDisplayOrder = targetOrgId
      ? await resolveOrgNameDisplayOrder(this.prisma, targetOrgId)
      : "FIRST_LAST";

    const data = interviews.map((intv) => {
      const formatted = formatInterviewRecord(intv);
      const app = appsMap.get(intv.applicationId);
      const candidate = app ? candidatesMap.get(app.candidateId) : undefined;
      const job = app ? jobsMap.get(app.jobId) : undefined;
      const resolvedCandidateName = candidate
        ? formatCandidateDisplayName(candidate, orgOrder) || "Candidate"
        : "Candidate";

      return {
        ...formatted,
        candidateName: resolvedCandidateName,
        candidateEmail: candidate?.email || "",
        candidatePhone: candidate?.phone || null,
        jobTitle: job ? job.title : undefined,
        jobId: app?.jobId,
        organizationId:
          candidate?.organizationId || job?.organizationId || targetOrgId,
        application: app
          ? {
              ...app,
              candidate: candidate
                ? { ...candidate, name: resolvedCandidateName }
                : undefined,
              job: job ? { ...job, title: job.title } : undefined,
              candidateName: resolvedCandidateName,
              candidateEmail: candidate?.email || "",
              candidatePhone: candidate?.phone || null,
              interviews: [formatted],
            }
          : undefined,
      };
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: string, tenantOrgId?: string | null) {
    const intv = await this.prisma.interview.findFirst({
      where: { id },
    });
    if (!intv) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.INTERVIEW_NOT_FOUND,
        `Interview with ID ${id} not found`,
        { id },
      );
    }

    if (
      tenantOrgId &&
      intv.organizationId &&
      intv.organizationId !== tenantOrgId
    ) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.INTERVIEW_INVALID_ORGANIZATION,
        "Access denied: interview belongs to another organization.",
        { id, organizationId: intv.organizationId },
      );
    }

    const app = await this.prisma.application.findFirst({
      where: { id: intv.applicationId },
    });
    const candidate = app
      ? await this.prisma.candidate.findFirst({
          where: { id: app.candidateId },
        })
      : null;
    const job = app
      ? await this.prisma.job.findFirst({
          where: { id: app.jobId },
        })
      : null;

    const interviewOrgId = candidate?.organizationId || job?.organizationId;
    if (tenantOrgId && interviewOrgId && interviewOrgId !== tenantOrgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.INTERVIEW_INVALID_ORGANIZATION,
        "Access denied: interview belongs to another organization.",
        { id, organizationId: interviewOrgId },
      );
    }

    const formatted = formatInterviewRecord(intv);
    const orgOrder: NameDisplayOrder = interviewOrgId
      ? await resolveOrgNameDisplayOrder(this.prisma, interviewOrgId)
      : "FIRST_LAST";
    const resolvedCandidateName = candidate
      ? formatCandidateDisplayName(candidate, orgOrder) || "Candidate"
      : "Candidate";

    return {
      ...formatted,
      organizationId: interviewOrgId,
      application: app
        ? {
            ...app,
            candidate: candidate
              ? { ...candidate, name: resolvedCandidateName }
              : undefined,
            job: job ? { ...job, title: job.title } : undefined,
          }
        : undefined,
      candidateName: resolvedCandidateName,
      candidateEmail: candidate?.email,
      jobTitle: job ? job.title : undefined,
    };
  }
}
