import { Inject, Injectable } from "@nestjs/common";
import { APP_ERROR_CODES } from "@haihire/shared";
import {
  AppForbiddenException,
  AppNotFoundException,
} from "../../common/app-exception";
import { PrismaService } from "../../prisma/prisma.service";
import { toTimestamp } from "../../common/date.util";
import { formatInterviewRecord } from "../constants";

export interface FindAllInterviewsOptions {
  organizationId?: string;
  jobId?: string;
  applicationId?: string;
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
      notes?: string | null;
      createdAt?: Date | string | null;
      updatedAt?: Date | string | null;
      [key: string]: unknown;
    }

    interface CandidateRecord {
      id: string;
      name: string;
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

    let interviews: InterviewRecord[] = [];
    const appsMap = new Map<string, AppRecord>();

    if (options?.applicationId) {
      interviews = await this.prisma.interview.findMany({
        where: { applicationId: options.applicationId! },
      });
    } else if (options?.jobId) {
      const targetApps = await this.prisma.application.findMany({
        where: { jobId: options.jobId! },
        select: {
          id: true,
          candidateId: true,
          jobId: true,
          stage: true,
          matchScore: true,
        },
      });

      if (targetApps.length === 0) {
        return {
          data: [],
          total: 0,
          page: defaultPage,
          limit: defaultLimit,
          totalPages: 0,
        };
      }
      for (const a of targetApps) {
        appsMap.set(a.id, a as unknown as AppRecord);
      }
      const appIds = targetApps.map((a) => a.id);
      interviews = await this.prisma.interview.findMany({
        where: { applicationId: { in: appIds } },
      });
    } else if (targetOrgId) {
      const orgCandidates = await this.prisma.candidate.findMany({
        where: { organizationId: targetOrgId },
        select: { id: true },
      });

      if (orgCandidates.length === 0) {
        return {
          data: [],
          total: 0,
          page: defaultPage,
          limit: defaultLimit,
          totalPages: 0,
        };
      }
      const candidateIds = orgCandidates.map((c) => c.id);

      const targetApps = await this.prisma.application.findMany({
        where: { candidateId: { in: candidateIds } },
        select: {
          id: true,
          candidateId: true,
          jobId: true,
          stage: true,
          matchScore: true,
          notes: true,
        },
      });

      if (targetApps.length === 0) {
        return {
          data: [],
          total: 0,
          page: defaultPage,
          limit: defaultLimit,
          totalPages: 0,
        };
      }
      for (const a of targetApps) {
        appsMap.set(a.id, a as unknown as AppRecord);
      }
      const appIds = targetApps.map((a) => a.id);
      interviews = await this.prisma.interview.findMany({
        where: { applicationId: { in: appIds } },
      });
    } else {
      interviews = await this.prisma.interview.findMany();
    }

    const neededAppIds = [
      ...new Set(interviews.map((i) => i.applicationId)),
    ].filter((id) => !appsMap.has(id));
    if (neededAppIds.length > 0) {
      const fetchedApps = await this.prisma.application.findMany({
        where: { id: { in: neededAppIds } },
        select: {
          id: true,
          candidateId: true,
          jobId: true,
          stage: true,
          matchScore: true,
        },
      });
      for (const a of fetchedApps) {
        appsMap.set(a.id, a as unknown as AppRecord);
      }
    }

    const candidateIds = [
      ...new Set(Array.from(appsMap.values()).map((a) => a.candidateId)),
    ];
    const candidatesMap = new Map<string, CandidateRecord>();
    if (candidateIds.length > 0) {
      const candidates = await this.prisma.candidate.findMany({
        where: {
          id: { in: candidateIds },
          ...(targetOrgId ? { organizationId: targetOrgId } : {}),
        },
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          organizationId: true,
        },
      });
      for (const c of candidates) {
        candidatesMap.set(c.id, c as unknown as CandidateRecord);
      }
    }

    const jobIds = [
      ...new Set(Array.from(appsMap.values()).map((a) => a.jobId)),
    ];
    const jobsMap = new Map<string, JobRecord>();
    if (jobIds.length > 0) {
      const jobs = await this.prisma.job.findMany({
        where: {
          id: { in: jobIds },
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

    // Group interviews by applicationId so each candidate appears once with all interview rounds
    const interviewsByApp = new Map<string, typeof interviews>();
    for (const intv of interviews) {
      const list = interviewsByApp.get(intv.applicationId) || [];
      list.push(intv);
      interviewsByApp.set(intv.applicationId, list);
    }

    const scheduledItems = Array.from(interviewsByApp.entries()).map(
      ([appId, appInterviews]) => {
        const app = appsMap.get(appId);
        const candidate = app ? candidatesMap.get(app.candidateId) : undefined;
        const job = app ? jobsMap.get(app.jobId) : undefined;

        const formattedInterviews = appInterviews.map((intv) =>
          formatInterviewRecord(intv),
        );

        // Sort rounds descending (most recent first)
        formattedInterviews.sort((a, b) => {
          const dtA = `${a.date} ${a.time || "00:00"}`;
          const dtB = `${b.date} ${b.time || "00:00"}`;
          return dtB.localeCompare(dtA);
        });

        const today = new Date().toISOString().split("T")[0];
        const upcoming = formattedInterviews
          .filter((i) => i.date >= today)
          .sort((a, b) => {
            const dtA = `${a.date} ${a.time || "00:00"}`;
            const dtB = `${b.date} ${b.time || "00:00"}`;
            return dtA.localeCompare(dtB);
          })[0];
        const primary = upcoming || formattedInterviews[0];

        return {
          id: primary.id,
          applicationId: appId,
          date: primary.date,
          time: primary.time,
          type: primary.type,
          format: primary.format,
          linkOrLocation: primary.linkOrLocation,
          interviewer: primary.interviewer,
          round: primary.round,
          scorecard: primary.scorecard,
          notes: primary.notes,
          createdAt: primary.createdAt,
          updatedAt: primary.updatedAt,
          application: app
            ? {
                ...app,
                candidate: candidate
                  ? { ...candidate, name: candidate.name }
                  : undefined,
                job: job ? { ...job, title: job.title } : undefined,
                candidateName: candidate ? candidate.name : "Candidate",
                candidateEmail: candidate?.email || "",
                candidatePhone: candidate?.phone || null,
                interviews: formattedInterviews,
              }
            : undefined,
          candidateName: candidate ? candidate.name : "Candidate",
          candidateEmail: candidate?.email,
          jobTitle: job ? job.title : undefined,
          jobId: app?.jobId,
          organizationId: candidate?.organizationId || job?.organizationId,
        };
      },
    );

    const scheduledAppIds = new Set(interviewsByApp.keys());
    const awaitingApps = Array.from(appsMap.values()).filter(
      (a) => a.stage === "INTERVIEW" && !scheduledAppIds.has(a.id),
    );

    const awaitingItems = (options?.tab !== "UPCOMING" ? awaitingApps : []).map(
      (app) => {
        const candidate = candidatesMap.get(app.candidateId);
        const job = jobsMap.get(app.jobId);
        return {
          id: `awaiting-${app.id}`,
          applicationId: app.id,
          date: "",
          time: "",
          type: "HR_SCREENING",
          format: "MEET" as const,
          linkOrLocation: "",
          interviewer: "",
          round: 1,
          scorecard: null,
          notes: null,
          createdAt: app.createdAt || new Date().toISOString(),
          updatedAt: app.updatedAt || new Date().toISOString(),
          application: {
            ...app,
            candidate: candidate
              ? { ...candidate, name: candidate.name }
              : undefined,
            job: job ? { ...job, title: job.title } : undefined,
            candidateName: candidate ? candidate.name : "Candidate",
            candidateEmail: candidate?.email || "",
            candidatePhone: candidate?.phone || null,
            interviews: [],
          },
          candidateName: candidate ? candidate.name : "Candidate",
          candidateEmail: candidate?.email,
          jobTitle: job ? job.title : undefined,
          jobId: app.jobId,
          organizationId: candidate?.organizationId || job?.organizationId,
        };
      },
    );

    const allItems = [...scheduledItems, ...awaitingItems]
      .filter((item) => {
        if (targetOrgId && item.organizationId !== targetOrgId) {
          return false;
        }
        if (options?.jobId && item.jobId !== options.jobId) {
          return false;
        }
        if (options?.search && options.search.trim() !== "") {
          const q = options.search.trim().toLowerCase();
          const matches =
            item.candidateName.toLowerCase().includes(q) ||
            (item.candidateEmail &&
              item.candidateEmail.toLowerCase().includes(q)) ||
            (item.jobTitle && item.jobTitle.toLowerCase().includes(q)) ||
            item.interviewer.toLowerCase().includes(q) ||
            item.linkOrLocation.toLowerCase().includes(q);
          if (!matches) return false;
        }
        if (options?.tab === "UPCOMING") {
          if (!item.date) return false;
        }
        if (options?.tab === "AWAITING") {
          if (item.date) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (options?.sortBy === "name") {
          return a.candidateName.localeCompare(b.candidateName);
        }
        if (options?.sortBy === "newest") {
          return toTimestamp(b.createdAt) - toTimestamp(a.createdAt);
        }
        if (a.date && !b.date) return -1;
        if (!a.date && b.date) return 1;
        if (a.date && b.date) {
          const dateA = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
          const dateB = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
          return dateA - dateB;
        }
        return toTimestamp(b.createdAt) - toTimestamp(a.createdAt);
      });

    const total = allItems.length;
    const page = defaultPage;
    const limit = defaultLimit;
    const totalPages = Math.ceil(total / limit) || 1;
    const data = allItems.slice((page - 1) * limit, page * limit);

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

    return {
      ...formatted,
      organizationId: interviewOrgId,
      application: app
        ? {
            ...app,
            candidate: candidate
              ? { ...candidate, name: candidate.name }
              : undefined,
            job: job ? { ...job, title: job.title } : undefined,
          }
        : undefined,
      candidateName: candidate ? candidate.name : "Candidate",
      candidateEmail: candidate?.email,
      jobTitle: job ? job.title : undefined,
    };
  }
}
