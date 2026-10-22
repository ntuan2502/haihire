import { Inject, Injectable, Optional } from "@nestjs/common";
import { APP_ERROR_CODES } from "@haihire/shared";
import {
  AppForbiddenException,
  AppNotFoundException,
} from "../../common/app-exception";
import { PrismaService } from "../../prisma/prisma.service";
import { ActivitiesService } from "../../activities/activities.service";
import { UpdateCandidateDto } from "../dto/update-candidate.dto";
import { formatInterviewRecord } from "../../interviews/constants";

@Injectable()
export class ApplicationsQueryService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(ActivitiesService)
    private readonly activitiesService?: ActivitiesService,
  ) {}

  private async executeTx<T>(
    fn: (tx: PrismaService["db"]) => Promise<T>,
  ): Promise<T> {
    const p = this.prisma as unknown as {
      transaction?: (cb: (tx: PrismaService["db"]) => Promise<T>) => Promise<T>;
      executeTx?: (cb: (tx: PrismaService["db"]) => Promise<T>) => Promise<T>;
      db: PrismaService["db"];
    };
    if (typeof p.transaction === "function") {
      return p.transaction(fn);
    }
    if (typeof p.executeTx === "function") {
      return p.executeTx(fn);
    }
    return fn(this.prisma.db);
  }

  async findByJob(jobId: string, organizationId?: string) {
    const job = await this.prisma.db.orm.public.Job.select(
      "id",
      "title",
      "organizationId",
    )
      .where((j) => j.id.eq(jobId))
      .first();

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

    const applications = await this.prisma.db.orm.public.Application.select(
      "id",
      "candidateId",
      "jobId",
      "stage",
      "matchScore",
      "resumeUrl",
      "resumeFileName",
      "resumeFileSize",
      "resumeMimeType",
      "notes",
      "orderIndex",
      "createdAt",
      "updatedAt",
    )
      .where((a) => a.jobId.eq(jobId))
      .all();

    if (applications.length === 0) {
      return [];
    }

    const candidateIds = [...new Set(applications.map((a) => a.candidateId))];
    const candidates =
      candidateIds.length > 0
        ? await this.prisma.db.orm.public.Candidate.select(
            "id",
            "name",
            "firstName",
            "lastName",
            "gender",
            "dateOfBirth",
            "email",
            "phone",
            "resumeUrl",
            "resumeFileName",
            "resumeFileSize",
            "resumeMimeType",
          )
            .where((c) => c.id.in(candidateIds))
            .all()
        : [];
    const candidateMap = new Map(candidates.map((c) => [c.id, c]));

    const appIds = [...new Set(applications.map((a) => a.id))];
    const allInterviews =
      appIds.length > 0
        ? await this.prisma.db.orm.public.Interview.where((i) =>
            i.applicationId.in(appIds),
          ).all()
        : [];
    const interviewsByApp = new Map<string, Array<Record<string, unknown>>>();
    for (const intv of allInterviews) {
      const list = interviewsByApp.get(intv.applicationId) || [];
      list.push(formatInterviewRecord(intv));
      interviewsByApp.set(intv.applicationId, list);
    }

    const populated = applications.map((app) => {
      const candidate = candidateMap.get(app.candidateId);
      return {
        ...app,
        candidate,
        candidateName: candidate?.name || "Unknown",
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
    const defaultLimit =
      options?.limit && options.limit > 0 ? options.limit : 20;
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

    const jobs = await this.prisma.db.orm.public.Job.select(
      "id",
      "title",
      "department",
      "location",
    )
      .where((j) => j.organizationId.eq(targetOrgId))
      .all();

    const jobMap = new Map(jobs.map((j) => [j.id, j]));
    if (jobMap.size === 0) {
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

    let orgApps = await this.prisma.db.orm.public.Application.select(
      "id",
      "candidateId",
      "jobId",
      "stage",
      "matchScore",
      "resumeUrl",
      "resumeFileName",
      "resumeFileSize",
      "resumeMimeType",
      "notes",
      "orderIndex",
      "createdAt",
      "updatedAt",
    )
      .where((a) => a.jobId.in(jobIds))
      .all();

    if (options?.stage) {
      const stages = options.stage
        .split(",")
        .map((s) => s.trim().toUpperCase());
      orgApps = orgApps.filter((a) => stages.includes(a.stage));
    }

    if (orgApps.length === 0) {
      return {
        data: [],
        total: 0,
        page: defaultPage,
        limit: defaultLimit,
        totalPages: 0,
      };
    }

    const neededCandidateIds = [...new Set(orgApps.map((a) => a.candidateId))];

    const candidates =
      neededCandidateIds.length > 0
        ? await this.prisma.db.orm.public.Candidate.select(
            "id",
            "name",
            "firstName",
            "lastName",
            "gender",
            "dateOfBirth",
            "email",
            "phone",
            "resumeUrl",
            "resumeFileName",
            "resumeFileSize",
            "resumeMimeType",
          )
            .where((c) => c.id.in(neededCandidateIds))
            .all()
        : [];
    const candidateMap = new Map(candidates.map((c) => [c.id, c]));

    const appIds = orgApps.map((a) => a.id);
    const allInterviews =
      appIds.length > 0
        ? await this.prisma.db.orm.public.Interview.where((i) =>
            i.applicationId.in(appIds),
          ).all()
        : [];
    const interviewsByApp = new Map<string, Array<Record<string, unknown>>>();
    for (const intv of allInterviews) {
      const list = interviewsByApp.get(intv.applicationId) || [];
      list.push(formatInterviewRecord(intv));
      interviewsByApp.set(intv.applicationId, list);
    }

    let populated = orgApps.map((app) => {
      const candidate = candidateMap.get(app.candidateId);
      const job = jobMap.get(app.jobId);
      return {
        ...app,
        job,
        candidate,
        candidateName: candidate?.name || "Unknown",
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

    if (options?.search && options.search.trim() !== "") {
      const q = options.search.trim().toLowerCase();
      populated = populated.filter(
        (app) =>
          app.candidateName.toLowerCase().includes(q) ||
          app.candidateEmail.toLowerCase().includes(q) ||
          (app.candidatePhone &&
            app.candidatePhone.toLowerCase().includes(q)) ||
          (app.job?.title && app.job.title.toLowerCase().includes(q)),
      );
    }

    const total = populated.length;
    const page = defaultPage;
    const limit = defaultLimit;
    const totalPages = Math.ceil(total / limit) || 1;
    const data = populated.slice((page - 1) * limit, page * limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: string, tenantOrgId?: string | null) {
    const app = await this.prisma.db.orm.public.Application.select(
      "id",
      "candidateId",
      "jobId",
      "stage",
      "matchScore",
      "resumeUrl",
      "resumeFileName",
      "resumeFileSize",
      "resumeMimeType",
      "notes",
      "orderIndex",
      "createdAt",
      "updatedAt",
    )
      .where((a) => a.id.eq(id))
      .first();

    if (!app) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.APPLICATION_NOT_FOUND,
        `Application with ID ${id} not found`,
        { id },
      );
    }

    const job = await this.prisma.db.orm.public.Job.select(
      "id",
      "title",
      "department",
      "location",
      "organizationId",
    )
      .where((j) => j.id.eq(app.jobId))
      .first();

    const candidate = await this.prisma.db.orm.public.Candidate.select(
      "id",
      "name",
      "firstName",
      "lastName",
      "gender",
      "dateOfBirth",
      "email",
      "phone",
      "notes",
      "resumeUrl",
      "resumeFileName",
      "resumeFileSize",
      "resumeMimeType",
      "createdAt",
      "organizationId",
    )
      .where((c) => c.id.eq(app.candidateId))
      .first();

    const appOrgId = job?.organizationId || candidate?.organizationId;
    if (tenantOrgId && appOrgId && tenantOrgId !== appOrgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.APPLICATION_INVALID_ORGANIZATION,
        "Access denied: application belongs to another organization.",
        { id, organizationId: appOrgId },
      );
    }

    const appInterviews = (
      await this.prisma.db.orm.public.Interview.where((i) =>
        i.applicationId.eq(id),
      ).all()
    ).map((intv) => formatInterviewRecord(intv));

    return {
      ...app,
      job: job || null,
      candidate: candidate || null,
      candidateName: candidate?.name || "Unknown",
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
      if (dto.candidateName !== undefined)
        candidateUpdate.name = dto.candidateName;
      if (dto.candidateEmail !== undefined)
        candidateUpdate.email = dto.candidateEmail.toLowerCase();
      if (dto.candidatePhone !== undefined)
        candidateUpdate.phone = dto.candidatePhone;
      if (dto.notes !== undefined) candidateUpdate.notes = dto.notes;
      if (dto.resumeUrl !== undefined)
        candidateUpdate.resumeUrl = dto.resumeUrl;
      if (dto.resumeFileName !== undefined)
        candidateUpdate.resumeFileName = dto.resumeFileName;

      await this.prisma.db.orm.public.Candidate.where((c) =>
        c.id.eq(existing.candidateId),
      ).update(candidateUpdate);
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

    await this.executeTx(async (tx) => {
      try {
        const txObj = tx as unknown as {
          orm: {
            public: {
              Interview?: {
                where?: (
                  fn: (i: {
                    applicationId: { eq: (val: string) => boolean };
                  }) => boolean,
                ) => {
                  delete?: () => Promise<unknown>;
                  deleteAll?: () => Promise<unknown>;
                };
              };
            };
          };
        };
        if (typeof txObj.orm.public.Interview?.where === "function") {
          const query = txObj.orm.public.Interview.where((i) =>
            i.applicationId.eq(id),
          );
          if (typeof query?.deleteAll === "function") {
            await query.deleteAll();
          } else if (typeof query?.delete === "function") {
            await query.delete();
          }
        }
      } catch {
        // Cascade handles if schema level onDelete: Cascade is configured
      }
      await tx.orm.public.Application.where((a) => a.id.eq(id)).delete();
    });
    return { success: true, message: `Application ${id} deleted successfully` };
  }
}
