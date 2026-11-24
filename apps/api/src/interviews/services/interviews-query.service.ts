import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  APP_ERROR_CODES,
  formatCandidateDisplayName,
  type NameDisplayOrder,
} from "@haihire/shared";
import {
  AppBadRequestException,
  AppForbiddenException,
  AppNotFoundException,
} from "../../common/app-exception";
import { resolveOrgNameDisplayOrder } from "../../common/candidate-name.util";
import { findMatchingCandidateIds } from "../../common/person-search.util";
import { PrismaService } from "../../prisma/prisma.service";
import { formatInterviewRecord } from "../constants";

export interface ListPaginatedInterviewsOptions {
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

  async listPaginated(options?: ListPaginatedInterviewsOptions) {
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

    const defaultLimit =
      options?.limit && options.limit > 0 ? options.limit : 20;
    const defaultPage = options?.page && options.page > 0 ? options.page : 1;

    const interviewWhere: Prisma.InterviewWhereInput = {};
    if (targetOrgId) {
      interviewWhere.organizationId = targetOrgId;
    }
    if (options?.applicationId) {
      interviewWhere.applicationId = options.applicationId;
    }
    interviewWhere.application = {
      candidate: { deletedAt: null },
      job: { deletedAt: null },
      ...(options?.jobId ? { jobId: options.jobId } : {}),
    };

    if (options?.startDate && options?.endDate) {
      const parsedStart = new Date(options.startDate);
      const parsedEnd = new Date(options.endDate);
      if (
        Number.isNaN(parsedStart.getTime()) ||
        Number.isNaN(parsedEnd.getTime())
      ) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.VALIDATION_ERROR,
          "Invalid startDate or endDate filter.",
        );
      }
      interviewWhere.scheduledAt = {
        gte: parsedStart,
        lte: parsedEnd,
      };
    } else if (options?.tab === "UPCOMING") {
      const now = new Date();
      interviewWhere.scheduledAt = {
        gte: now,
      };
    } else if (options?.tab === "AWAITING") {
      const now = new Date();
      interviewWhere.scheduledAt = {
        lt: now,
      };
      interviewWhere.scorecard = { equals: Prisma.DbNull };
    }

    if (options?.search && options.search.trim()) {
      const q = options.search.trim();
      const searchCandidateIds = await findMatchingCandidateIds(this.prisma, {
        organizationId: targetOrgId,
        rawSearch: options.search,
      });
      interviewWhere.OR = [
        { interviewer: { contains: q, mode: "insensitive" } },
        { linkOrLocation: { contains: q, mode: "insensitive" } },
        ...(searchCandidateIds.length > 0
          ? [{ application: { candidateId: { in: searchCandidateIds } } }]
          : []),
        {
          application: {
            job: {
              title: { contains: q, mode: "insensitive" },
            },
          },
        },
      ];
    }

    const isCalendarMode = Boolean(options?.startDate && options?.endDate);
    const limit = isCalendarMode
      ? options?.limit && options.limit > 0
        ? options.limit
        : 1000
      : defaultLimit;
    const page = isCalendarMode ? 1 : defaultPage;
    const skip = (page - 1) * limit;

    const [interviews, total] = await Promise.all([
      this.prisma.interview.findMany({
        where: interviewWhere,
        include: {
          application: {
            include: {
              candidate: true,
              job: true,
            },
          },
        },
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

    const orgOrder: NameDisplayOrder = targetOrgId
      ? await resolveOrgNameDisplayOrder(this.prisma, targetOrgId)
      : "FIRST_LAST";

    const activeInterviews = interviews.filter(
      (intv) =>
        !intv.application?.candidate?.deletedAt &&
        !intv.application?.job?.deletedAt,
    );

    const data = activeInterviews.map((intv) => {
      const formatted = formatInterviewRecord(intv);
      const app = intv.application;
      const candidate = app?.candidate;
      const job = app?.job;
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
          intv.organizationId ||
          candidate?.organizationId ||
          job?.organizationId ||
          targetOrgId,
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

    if (options?.sortBy === "name") {
      data.sort((a, b) => a.candidateName.localeCompare(b.candidateName));
    }

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
    const where: { id: string; organizationId?: string } = { id };
    if (tenantOrgId) {
      where.organizationId = tenantOrgId;
    }

    const intv = await this.prisma.interview.findFirst({
      where: {
        id,
        ...(tenantOrgId ? { organizationId: tenantOrgId } : {}),
      },
      include: {
        application: {
          include: {
            candidate: true,
            job: true,
          },
        },
      },
    });
    if (!intv) {
      if (tenantOrgId) {
        const otherOrg = await this.prisma.interview.findFirst({
          where: { id },
          select: { id: true, organizationId: true },
        });
        if (otherOrg) {
          throw new AppForbiddenException(
            APP_ERROR_CODES.INTERVIEW_INVALID_ORGANIZATION,
            "Access denied: interview belongs to another organization.",
            { id },
          );
        }
      }
      throw new AppNotFoundException(
        APP_ERROR_CODES.INTERVIEW_NOT_FOUND,
        `Interview with ID ${id} not found`,
        { id },
      );
    }

    const app = intv.application;
    const candidate = app?.candidate || null;
    const job = app?.job || null;
    if (candidate?.deletedAt || job?.deletedAt) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.INTERVIEW_NOT_FOUND,
        `Interview with ID ${id} not found`,
        { id },
      );
    }
    const interviewOrgId =
      intv.organizationId || candidate?.organizationId || job?.organizationId;
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
            candidateName: resolvedCandidateName,
            candidateEmail: candidate?.email || "",
            candidatePhone: candidate?.phone || null,
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
