import { Inject, Injectable, Optional } from "@nestjs/common";
import {
  APP_ERROR_CODES,
  APPLICATION_STAGES,
  formatCandidateDisplayName,
  type ApplicationStage,
  type ApplicationStats,
} from "@haihire/shared";
import {
  AppBadRequestException,
  AppForbiddenException,
  AppNotFoundException,
} from "../../common/app-exception";
import {
  buildCandidateSearchName,
  resolveOrgNameDisplayOrder,
} from "../../common/candidate-name.util";
import { PrismaService, runInTransaction } from "../../prisma/prisma.service";
import { ActivitiesService } from "../../activities/activities.service";
import { UpdateCandidateDto } from "../dto/update-candidate.dto";
import { formatInterviewRecord } from "../../interviews/constants";

function createEmptyStageCounts(): Record<ApplicationStage, number> {
  return APPLICATION_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = 0;
      return acc;
    },
    {} as Record<ApplicationStage, number>,
  );
}

@Injectable()
export class ApplicationsQueryService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(ActivitiesService)
    private readonly activitiesService?: ActivitiesService,
  ) {}

  async findByJob(
    jobId: string,
    organizationId?: string,
    options?: { limit?: number; offset?: number },
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

    const orgCandidates = await this.prisma.candidate.findMany({
      where: {
        organizationId: job.organizationId,
        deletedAt: null,
      },
      select: { id: true },
    });
    const activeCandidateIds = orgCandidates.map((c) => c.id);
    if (activeCandidateIds.length === 0) {
      return [];
    }

    const applications = await this.prisma.application.findMany({
      where: {
        jobId,
        candidateId: { in: activeCandidateIds },
      },
      take,
      skip,
    });

    if (applications.length === 0) {
      return [];
    }

    const candidateIds = [...new Set(applications.map((a) => a.candidateId))];
    const candidates =
      candidateIds.length > 0
        ? await this.prisma.candidate.findMany({
            where: {
              id: { in: candidateIds },
              organizationId: job.organizationId,
              deletedAt: null,
            },
          })
        : [];
    const candidateMap = new Map(candidates.map((c) => [c.id, c]));

    const appIds = [...new Set(applications.map((a) => a.id))];
    const allInterviews =
      appIds.length > 0
        ? await this.prisma.interview.findMany({
            where: { applicationId: { in: appIds } },
          })
        : [];
    const interviewsByApp = new Map<string, Array<Record<string, unknown>>>();
    for (const intv of allInterviews) {
      const list = interviewsByApp.get(intv.applicationId) || [];
      list.push(formatInterviewRecord(intv));
      interviewsByApp.set(intv.applicationId, list);
    }

    const nameOrder = await resolveOrgNameDisplayOrder(
      this.prisma,
      job.organizationId,
    );
    const populated = applications.map((app) => {
      const candidate = candidateMap.get(app.candidateId);
      return {
        ...app,
        candidate,
        candidateName: candidate
          ? formatCandidateDisplayName(candidate, nameOrder) || candidate.name
          : "Unknown",
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

    return populated.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async findAll(
    organizationId?: string,
    options?: {
      page?: number;
      limit?: number;
      search?: string;
      jobId?: string;
      stage?: string;
    },
    tenantOrgId?: string | null,
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
    const defaultLimit = Math.min(rawLimit, 100);
    const defaultPage = options?.page && options.page > 0 ? options.page : 1;

    if (!targetOrgId) {
      return {
        data: [],
        total: 0,
        page: defaultPage,
        limit: defaultLimit,
        totalPages: 0,
      };
    }

    const [jobs, activeCandidates] = await Promise.all([
      this.prisma.job.findMany({
        where: { organizationId: targetOrgId, deletedAt: null },
        select: {
          id: true,
          title: true,
          department: true,
          location: true,
        },
      }),
      this.prisma.candidate.findMany({
        where: { organizationId: targetOrgId, deletedAt: null },
        select: { id: true },
      }),
    ]);

    const jobMap = new Map(jobs.map((j) => [j.id, j]));
    const activeCandidateIds = activeCandidates.map((c) => c.id);
    if (jobMap.size === 0 || activeCandidateIds.length === 0) {
      return {
        data: [],
        total: 0,
        page: defaultPage,
        limit: defaultLimit,
        totalPages: 0,
      };
    }

    let jobIds = jobs.map((j) => j.id);
    if (options?.jobId) {
      jobIds = jobIds.filter((id) => id === options.jobId);
      if (jobIds.length === 0) {
        return {
          data: [],
          total: 0,
          page: defaultPage,
          limit: defaultLimit,
          totalPages: 0,
        };
      }
    }

    const appWhere: Record<string, unknown> = {
      jobId: { in: jobIds },
      candidateId: { in: activeCandidateIds },
    };

    if (options?.stage) {
      const stages = options.stage
        .split(",")
        .map((s) => s.trim().toUpperCase());
      appWhere.stage = { in: stages };
    }

    if (options?.search && options.search.trim() !== "") {
      const q = options.search.trim();
      const matchedCandidates = await this.prisma.candidate.findMany({
        where: {
          organizationId: targetOrgId,
          deletedAt: null,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { displayName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });
      const matchingJobIds = jobs
        .filter((j) => j.title.toLowerCase().includes(q.toLowerCase()))
        .map((j) => j.id);

      appWhere.OR = [
        { candidateId: { in: matchedCandidates.map((c) => c.id) } },
        { jobId: { in: matchingJobIds } },
      ];
    }

    const total = await this.prisma.application.count({ where: appWhere });
    const page = defaultPage;
    const limit = defaultLimit;
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

    const pagedApps = await this.prisma.application.findMany({
      where: appWhere,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const neededCandidateIds = [
      ...new Set(pagedApps.map((a) => a.candidateId)),
    ];

    const candidates =
      neededCandidateIds.length > 0
        ? await this.prisma.candidate.findMany({
            where: {
              id: { in: neededCandidateIds },
              organizationId: targetOrgId,
              deletedAt: null,
            },
          })
        : [];
    const candidateMap = new Map(candidates.map((c) => [c.id, c]));

    const appIds = pagedApps.map((a) => a.id);
    const allInterviews =
      appIds.length > 0
        ? await this.prisma.interview.findMany({
            where: { applicationId: { in: appIds } },
          })
        : [];
    const interviewsByApp = new Map<string, Array<Record<string, unknown>>>();
    for (const intv of allInterviews) {
      const list = interviewsByApp.get(intv.applicationId) || [];
      list.push(formatInterviewRecord(intv));
      interviewsByApp.set(intv.applicationId, list);
    }

    const nameOrder = await resolveOrgNameDisplayOrder(
      this.prisma,
      targetOrgId,
    );
    const data = pagedApps.map((app) => {
      const candidate = candidateMap.get(app.candidateId);
      const job = jobMap.get(app.jobId);
      return {
        ...app,
        job,
        candidate,
        candidateName: candidate
          ? formatCandidateDisplayName(candidate, nameOrder) || candidate.name
          : "Unknown",
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

    const [activeJobs, activeCandidates] = await Promise.all([
      this.prisma.job.findMany({
        where: { organizationId: targetOrgId, deletedAt: null },
        select: { id: true },
      }),
      this.prisma.candidate.findMany({
        where: { organizationId: targetOrgId, deletedAt: null },
        select: { id: true },
      }),
    ]);

    const jobIds = activeJobs.map((j) => j.id);
    const candidateIds = activeCandidates.map((c) => c.id);
    if (jobIds.length === 0 || candidateIds.length === 0) {
      return {
        totalApplications: 0,
        byStage,
        byJob: {},
      };
    }

    const grouped = await this.prisma.application.groupBy({
      by: ["jobId", "stage"],
      where: {
        jobId: { in: jobIds },
        candidateId: { in: candidateIds },
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

  async findOne(id: string, tenantOrgId?: string | null) {
    const app = await this.prisma.application.findFirst({
      where: { id },
    });

    if (!app) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.APPLICATION_NOT_FOUND,
        `Application with ID ${id} not found`,
        { id },
      );
    }

    const [job, candidate] = await Promise.all([
      this.prisma.job.findFirst({
        where: { id: app.jobId, deletedAt: null },
        select: {
          id: true,
          title: true,
          department: true,
          location: true,
          organizationId: true,
        },
      }),
      this.prisma.candidate.findFirst({
        where: { id: app.candidateId, deletedAt: null },
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

    const appInterviews = (
      await this.prisma.interview.findMany({
        where: { applicationId: id },
      })
    ).map((intv) => formatInterviewRecord(intv));

    const nameOrder = await resolveOrgNameDisplayOrder(
      this.prisma,
      appOrgId || tenantOrgId,
    );

    return {
      ...app,
      job: job || null,
      candidate: candidate || null,
      candidateName: candidate
        ? formatCandidateDisplayName(candidate, nameOrder) || candidate.name
        : "Unknown",
      candidateEmail: candidate?.email || "",
      candidatePhone: candidate?.phone || null,
      resumeUrl: app.resumeUrl || candidate?.resumeUrl || "",
      resumeFileName:
        app.resumeFileName || candidate?.resumeFileName || "Resume.pdf",
      resumeFileSize: app.resumeFileSize ?? candidate?.resumeFileSize ?? null,
      resumeMimeType:
        app.resumeMimeType ?? candidate?.resumeMimeType ?? "application/pdf",
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
      const candidateUpdate: Record<string, unknown> = {};
      if (dto.firstName !== undefined) {
        const trimmed = dto.firstName.trim();
        if (!trimmed) {
          throw new AppBadRequestException(
            APP_ERROR_CODES.CANDIDATE_INFO_REQUIRED,
            "First name cannot be empty.",
          );
        }
        candidateUpdate.firstName = trimmed;
      }
      if (dto.lastName !== undefined) {
        const trimmed = dto.lastName.trim();
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
      if (
        dto.firstName !== undefined ||
        dto.lastName !== undefined ||
        dto.displayName !== undefined
      ) {
        const orgId = existing.job?.organizationId || tenantOrgId;
        const nameOrder = await resolveOrgNameDisplayOrder(this.prisma, orgId);
        candidateUpdate.name = buildCandidateSearchName(
          {
            firstName:
              (candidateUpdate.firstName as string | undefined) ??
              existing.candidate?.firstName,
            lastName:
              (candidateUpdate.lastName as string | undefined) ??
              existing.candidate?.lastName,
            displayName:
              dto.displayName !== undefined
                ? (candidateUpdate.displayName as string | null)
                : (existing.candidate?.displayName ?? null),
          },
          nameOrder,
        );
      }
      if (dto.candidateEmail !== undefined)
        candidateUpdate.email = dto.candidateEmail.toLowerCase();
      if (dto.candidatePhone !== undefined)
        candidateUpdate.phone = dto.candidatePhone;
      if (dto.resumeUrl !== undefined)
        candidateUpdate.resumeUrl = dto.resumeUrl;
      if (dto.resumeFileName !== undefined)
        candidateUpdate.resumeFileName = dto.resumeFileName;

      await this.prisma.candidate.update({
        where: { id: existing.candidateId },
        data: candidateUpdate,
      });
    }

    return this.findOne(id, tenantOrgId);
  }

  async remove(id: string, tenantOrgId?: string | null) {
    const existing = await this.findOne(id, tenantOrgId);
    const orgId =
      existing.job?.organizationId ||
      existing.candidate?.organizationId ||
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
              candidateName: existing.candidate.name,
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
          where: { applicationId: id },
        });
      } catch {
        // Cascade handles if schema level onDelete: Cascade is configured
      }
      await tx.application.delete({
        where: { id },
      });
    });
    return { success: true, message: `Application ${id} deleted successfully` };
  }
}
