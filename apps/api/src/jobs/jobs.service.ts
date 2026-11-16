import { Inject, Injectable, Optional } from "@nestjs/common";
import {
  APP_ERROR_CODES,
  formatCandidateDisplayName,
  type NameDisplayOrder,
  type UpsertPipelineStagesSchema,
} from "@haihire/shared";
import {
  ApplicationStage,
  ExperienceLevel,
  JobStatus,
  JobType,
  WorkplaceType,
  type Prisma,
} from "@prisma/client";
import {
  AppNotFoundException,
  AppForbiddenException,
  AppBadRequestException,
} from "../common/app-exception";
import { PrismaService, runInTransaction } from "../prisma/prisma.service";
import { CreateJobDto } from "./dto/create-job.dto";
import { UpdateJobDto } from "./dto/update-job.dto";
import crypto from "node:crypto";
import { toInstant } from "../common/date.util";
import { formatInterviewRecord } from "../interviews/constants";

import { EventsService } from "../events/events.service";

@Injectable()
export class JobsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(EventsService)
    private readonly eventsService?: EventsService,
  ) {}

  async findAll(filter?: {
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
    let targetOrg: { id: string; name: string; slug: string } | null = null;

    if (filter?.organizationSlug) {
      targetOrg = await this.prisma.organization.findFirst({
        where: { slug: filter.organizationSlug as string },
        select: { id: true, name: true, slug: true },
      });
      if (!targetOrg) {
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }
      targetOrgId = targetOrg.id;
    } else if (targetOrgId) {
      targetOrg = await this.prisma.organization.findFirst({
        where: { id: targetOrgId as string },
        select: { id: true, name: true, slug: true },
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
      skip: (page - 1) * limit,
      take: limit,
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
        requirements: true,
        salaryRange: true,
        status: true,
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
            where: { jobId: { in: jobIds } },
            select: {
              id: true,
              jobId: true,
              stage: true,
            },
          })
        : [];

    const appCountMap = new Map<
      string,
      { total: number; byStage: Record<string, number> }
    >();
    for (const app of allApps) {
      if (!app.jobId || !jobIdSet.has(app.jobId)) continue;
      if (!appCountMap.has(app.jobId)) {
        appCountMap.set(app.jobId, { total: 0, byStage: {} });
      }
      const item = appCountMap.get(app.jobId)!;
      item.total += 1;
      item.byStage[app.stage] = (item.byStage[app.stage] || 0) + 1;
    }

    const orgMap = new Map<
      string,
      { id: string; name: string; slug: string }
    >();
    if (targetOrg) {
      orgMap.set(targetOrg.id, targetOrg);
    } else {
      const allOrgs = await this.prisma.organization.findMany({
        where: {
          id: {
            in: [
              ...new Set(
                pagedJobs.flatMap((job) =>
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
        },
      });
      for (const o of allOrgs) {
        orgMap.set(o.id, o);
      }
    }

    return {
      data: pagedJobs.map((job) => ({
        ...job,
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
        requirements: true,
        salaryRange: true,
        status: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    if (!job || job.deletedAt) {
      if (!isPublic && tenantOrgId) {
        const otherOrgJob = await this.prisma.job.findFirst({
          where: { id },
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
            { id, organizationId: otherOrgJob.organizationId },
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

    let organization: { id: string; name: string; slug: string } | null = null;
    if (job.organizationId) {
      organization = await this.prisma.organization.findFirst({
        where: { id: job.organizationId as string },
        select: {
          id: true,
          name: true,
          slug: true,
          defaultLanguage: true,
          timezone: true,
          dateFormat: true,
          timeFormat: true,
          nameDisplayOrder: true,
          defaultCurrency: true,
        },
      });
    }

    if (isPublic) {
      return {
        ...job,
        organization,
        applications: [],
        applicationsCount: 0,
      };
    }

    const applications = await this.prisma.application.findMany({
      where: { jobId: id },
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
            },
          })
        : [];
    const candidateMap = new Map(candidates.map((c) => [c.id, c]));

    // Fetch interviews for each application
    const appIds = [...new Set(applications.map((a) => a.id))];
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

    const populatedApps = applications.map((a) => {
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

      const found = activeJobs.find((j) => {
        if (j.id.startsWith(jobSlug)) return true;
        const titleSlug = slugify(j.title);
        if (titleSlug === jobSlug) return true;
        if (`${titleSlug}-${j.id.slice(0, 8)}` === jobSlug) return true;
        if (jobSlug.endsWith(j.id)) return true;
        return false;
      });

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

  async create(
    dto: CreateJobDto,
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
        description: dto.description,
        requirements: dto.requirements ?? null,
        salaryRange: dto.salaryRange ?? null,
        status: dto.status ?? "PUBLISHED",
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

    return created;
  }

  async update(id: string, dto: UpdateJobDto, tenantOrgId?: string | null) {
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
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.requirements !== undefined
          ? { requirements: dto.requirements }
          : {}),
        ...(dto.salaryRange !== undefined
          ? { salaryRange: dto.salaryRange }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });

    const orgId = updated.organizationId || job.organizationId || tenantOrgId;
    if (orgId) {
      this.eventsService?.emit({
        type: "JOBS_CHANGED",
        organizationId: orgId,
        data: { jobId: updated.id },
      });
    }

    return updated;
  }

  async remove(id: string, tenantOrgId?: string | null) {
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

      for (const stageInput of dto.stages) {
        if (
          stageInput.id &&
          existingStages.some((e) => e.id === stageInput.id)
        ) {
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
        } else {
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

      return tx.pipelineStage.findMany({
        where: { organizationId: orgId, jobId },
        orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
      });
    });

    this.eventsService?.emit({
      type: "JOBS_CHANGED",
      organizationId: orgId,
      data: { jobId },
    });

    return stages;
  }
}
