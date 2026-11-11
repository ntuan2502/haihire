import { Inject, Injectable } from "@nestjs/common";
import {
  APP_ERROR_CODES,
  formatCandidateDisplayName,
  type NameDisplayOrder,
} from "@haihire/shared";
import {
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

@Injectable()
export class JobsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
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
      where: { id },
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

    if (!job || job.deletedAt) {
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
              name: true,
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
        ? formatCandidateDisplayName(candidate, orgOrder) || candidate.name
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
                name: candidate.name,
                firstName: candidate.firstName,
                lastName: candidate.lastName,
                displayName: candidate.displayName ?? null,
                email: candidate.email,
                phone: candidate.phone,
              }
            : undefined,
          candidateName: resolvedCandidateName,
          candidateEmail: candidate?.email || "",
          candidatePhone: candidate?.phone || null,
          interviews: [],
        };
      }
      return {
        ...a,
        candidate,
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

    const jobs = await this.prisma.job.findMany({
      where: { organizationId: org.id },
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

    const activeJobs = jobs.filter(
      (j) =>
        !j.deletedAt && (j.status === "PUBLISHED" || j.status === "CLOSED"),
    );

    const slugify = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const matchedJob = activeJobs.find((j) => {
      if (j.id === jobSlug) return true;
      if (j.id.startsWith(jobSlug)) return true;
      const titleSlug = slugify(j.title);
      if (titleSlug === jobSlug) return true;
      if (`${titleSlug}-${j.id.slice(0, 8)}` === jobSlug) return true;
      if (jobSlug.endsWith(j.id)) return true;
      return false;
    });

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

    return created;
  }

  async update(id: string, dto: UpdateJobDto, tenantOrgId?: string | null) {
    const job = await this.findOne(id);

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

    return updated;
  }

  async remove(id: string, tenantOrgId?: string | null) {
    const job = await this.findOne(id);

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

    return { success: true, message: `Job ${id} deleted successfully` };
  }
}
