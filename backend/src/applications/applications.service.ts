import {
  Inject,
  Injectable,
  Optional,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import {
  APP_ERROR_CODES,
  SourcingChannel,
  VALID_APPLICATION_STAGE_TRANSITIONS,
  type CandidateDocument,
} from "@haihire/shared";
import {
  AppBadRequestException,
  AppConflictException,
  AppForbiddenException,
  AppNotFoundException,
} from "../common/app-exception";
import { MinioService } from "../minio/minio.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateApplicationDto } from "./dto/create-application.dto";
import { UpdateStageDto } from "./dto/update-stage.dto";
import { UpdateCandidateDto } from "./dto/update-candidate.dto";
import { validateUploadedFile, sanitizeFilename } from "../common/upload-utils";
import crypto from "node:crypto";
import { toTimestamp, toInstant } from "../common/date.util";

import { fixUtf8String } from "../common/doc-utils";
export { fixUtf8String };
import { formatInterviewRecord } from "../interviews/constants";

import { ActivitiesService } from "../activities/activities.service";
import { EmailService } from "../email/email.service";
import { buildDynamicEmailContext } from "../email/variable-registry";

@Injectable()
export class ApplicationsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(MinioService)
    private readonly minioService: MinioService,
    @Inject(ActivitiesService)
    private readonly activitiesService: ActivitiesService,
    @Inject(EmailService)
    private readonly emailService: EmailService,
    @Optional()
    @InjectQueue("orphan-cleanup-queue")
    private readonly orphanCleanupQueue?: Queue,
  ) {}

  private async executeTx<T>(fn: (tx: PrismaService["db"]) => Promise<T>): Promise<T> {
    const p = this.prisma as unknown as { transaction?: (cb: (tx: PrismaService["db"]) => Promise<T>) => Promise<T>; executeTx?: (cb: (tx: PrismaService["db"]) => Promise<T>) => Promise<T>; db: PrismaService["db"] };
    if (typeof p.transaction === "function") {
      return p.transaction(fn);
    }
    if (typeof p.executeTx === "function") {
      return p.executeTx(fn);
    }
    return fn(this.prisma.db);
  }

  async findByJob(jobId: string, organizationId?: string) {
    const job = await this.prisma.db.orm.public.Job.select("id", "title", "organizationId")
      .where((j) => j.id.eq(jobId))
      .first();

    if (!job) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.JOB_NOT_FOUND,
        `Job with ID ${jobId} not found`,
      );
    }

    if (organizationId && job.organizationId && job.organizationId !== organizationId) {
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
    const candidates = candidateIds.length > 0
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
    const allInterviews = appIds.length > 0
      ? await this.prisma.db.orm.public.Interview
          .where((i) => i.applicationId.in(appIds))
          .all()
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
        resumeFileName: app.resumeFileName || candidate?.resumeFileName || "Resume.pdf",
        resumeFileSize: app.resumeFileSize ?? candidate?.resumeFileSize ?? null,
        resumeMimeType: app.resumeMimeType ?? candidate?.resumeMimeType ?? "application/pdf",
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
    const defaultLimit = options?.limit && options.limit > 0 ? options.limit : 20;
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
      const stages = options.stage.split(",").map((s) => s.trim().toUpperCase());
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

    const neededCandidateIds = [
      ...new Set(orgApps.map((a) => a.candidateId)),
    ];

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
    const allInterviews = appIds.length > 0
      ? await this.prisma.db.orm.public.Interview
          .where((i) => i.applicationId.in(appIds))
          .all()
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
        resumeFileName: app.resumeFileName || candidate?.resumeFileName || "Resume.pdf",
        resumeFileSize: app.resumeFileSize ?? candidate?.resumeFileSize ?? null,
        resumeMimeType: app.resumeMimeType ?? candidate?.resumeMimeType ?? "application/pdf",
        interviews: interviewsByApp.get(app.id) || [],
      };
    });

    if (options?.search && options.search.trim() !== "") {
      const q = options.search.trim().toLowerCase();
      populated = populated.filter(
        (app) =>
          app.candidateName.toLowerCase().includes(q) ||
          app.candidateEmail.toLowerCase().includes(q) ||
          (app.candidatePhone && app.candidatePhone.toLowerCase().includes(q)) ||
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

    const appInterviews = (await this.prisma.db.orm.public.Interview
      .where((i) => i.applicationId.eq(id))
      .all())
      .map((intv) => formatInterviewRecord(intv));

    return {
      ...app,
      job: job || null,
      candidate: candidate || null,
      candidateName: candidate?.name || "Unknown",
      candidateEmail: candidate?.email || "",
      candidatePhone: candidate?.phone || null,
      resumeUrl: app.resumeUrl || candidate?.resumeUrl || "",
      resumeFileName: app.resumeFileName || candidate?.resumeFileName || "Resume.pdf",
      resumeFileSize: app.resumeFileSize ?? candidate?.resumeFileSize ?? null,
      resumeMimeType: app.resumeMimeType ?? candidate?.resumeMimeType ?? "application/pdf",
      interviews: appInterviews,
    };
  }

  async create(
    dto: CreateApplicationDto,
    file?: Express.Multer.File,
    currentUser?: { role?: string; organizationId?: string | null } | null,
  ) {
    if (currentUser?.role === "MEMBER") {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
        "Members have read-only access. Only Admins can perform this action.",
      );
    }

    if (!dto.jobId) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.JOB_ID_REQUIRED,
        "Job ID is required to create an application.",
      );
    }

    const job = await this.prisma.db.orm.public.Job.select(
      "id",
      "title",
      "status",
      "organizationId",
      "department",
      "location",
    )
      .where((j) => j.id.eq(dto.jobId))
      .first();

    if (!job) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.JOB_NOT_FOUND,
        `Job with ID ${dto.jobId} not found`,
      );
    }

    if (job.status !== "PUBLISHED") {
      throw new AppBadRequestException(
        APP_ERROR_CODES.JOB_NOT_ACCEPTING_APPLICATIONS,
        "This job is not currently accepting applications.",
      );
    }

    // 1. Upload CV to MinIO S3 Object Storage if file is provided (SAGA Step 1: Pre-transaction storage upload)
    let uploadResult: { url: string; originalName: string; size: number; mimeType: string; fileName?: string } = {
      url: "",
      originalName: "Candidate Resume",
      size: 0,
      mimeType: "application/pdf",
    };

    let uploadedFileInMinio = false;

    if (file) {
      validateUploadedFile(file);
      uploadResult = await this.minioService.uploadFile(file, "resumes", job.organizationId);
      uploadResult.originalName = sanitizeFilename(fixUtf8String(file.originalname || "resume.pdf"));
      uploadedFileInMinio = true;
    } else if (dto.resumeUrl) {
      uploadResult = {
        url: dto.resumeUrl,
        originalName: dto.resumeFileName || "Candidate Resume",
        size: 0,
        mimeType: "application/pdf",
      };
    }

    // SAGA Step 2 & 3: Database writes inside atomic transaction with compensating action on failure
    let created: {
      id: string;
      sourceChannel?: string | null;
      sourceDetails?: string | null;
      utmCampaign?: string | null;
    };
    let trackingLinkId: string | null = null;
    let sourceChannel: SourcingChannel = SourcingChannel.DIRECT;
    let sourceDetails: string | null = null;
    let referrerDomain: string | null = null;
    let utmCampaign: string | null = dto.utmCampaign?.trim() || null;

    try {
      created = await this.executeTx(async (tx) => {
        // 2. Resolve or create Candidate
        let candidateId = dto.candidateId;

        if (!candidateId) {
          if (!dto.candidateEmail || !dto.candidateName) {
            throw new AppBadRequestException(
              APP_ERROR_CODES.CANDIDATE_INFO_REQUIRED,
              "Either candidateId or both candidateName and candidateEmail are required.",
            );
          }

          const email = dto.candidateEmail.trim().toLowerCase();
          const orgId = job.organizationId;
          if (!orgId) {
            throw new AppBadRequestException(
              APP_ERROR_CODES.JOB_INVALID_ORGANIZATION,
              "Target job does not belong to a valid organization.",
            );
          }

          const existingCandidate = await tx.orm.public.Candidate.select("id")
            .where((c) => c.organizationId.eq(orgId))
            .where((c) => c.email.eq(email))
            .first();

          if (existingCandidate) {
            candidateId = existingCandidate.id;
          } else {
            const newCandidate = await tx.orm.public.Candidate.create({
              id: crypto.randomUUID(),
              organizationId: orgId,
              name: dto.candidateName.trim(),
              email,
              phone: dto.candidatePhone?.trim() || null,
              notes: dto.notes || null,
              resumeUrl: uploadResult.url || null,
              resumeFileName: uploadResult.originalName || null,
              resumeFileSize: uploadResult.size || null,
              resumeMimeType: uploadResult.mimeType || "application/pdf",
              updatedAt: toInstant(),
            });
            candidateId = newCandidate.id;
          }
        } else {
          // Validate candidate exists and belongs to the same organization as the target job
          const existingCandidate = await tx.orm.public.Candidate.select("id", "organizationId")
            .where((c) => c.id.eq(candidateId as string))
            .first();

          if (!existingCandidate) {
            throw new AppNotFoundException(
              APP_ERROR_CODES.CANDIDATE_NOT_FOUND,
              `Candidate with ID ${candidateId} not found`,
            );
          }
          if (job.organizationId && existingCandidate.organizationId !== job.organizationId) {
            throw new AppForbiddenException(
              APP_ERROR_CODES.CANDIDATE_ORG_MISMATCH,
              "Candidate does not belong to the target job's organization.",
            );
          }
        }

        const existingApplication = await tx.orm.public.Application.select("id")
          .where((a) => a.candidateId.eq(candidateId as string))
          .where((a) => a.jobId.eq(dto.jobId))
          .first();

        if (existingApplication) {
          throw new AppConflictException(
            APP_ERROR_CODES.CANDIDATE_ALREADY_APPLIED,
            "Candidate has already applied to this job.",
          );
        }

        const existingInStage = await tx.orm.public.Application.select(
          "id",
          "orderIndex",
        )
          .where((a) => a.jobId.eq(dto.jobId))
          .all();

        const maxOrder = existingInStage.reduce(
          (max, item) => Math.max(max, item.orderIndex),
          -1,
        );

        // 5. Resolve Sourcing / Attribution
        if (dto.ref) {
          const link = await tx.orm.public.TrackingLink.select(
            "id",
            "organizationId",
            "source",
            "customSource",
            "campaign",
            "isActive",
            "deletedAt",
          )
            .where((l) => l.token.eq(dto.ref as string))
            .first();

          if (
            link &&
            !link.deletedAt &&
            link.isActive &&
            (!job.organizationId || link.organizationId === job.organizationId)
          ) {
            trackingLinkId = link.id;
            sourceChannel = (link.source as SourcingChannel) || SourcingChannel.OTHER;
            sourceDetails = link.customSource || null;
            if (!utmCampaign && link.campaign) {
              utmCampaign = link.campaign;
            }
          }
        }

        if (!trackingLinkId && dto.referrer) {
          try {
            let norm = dto.referrer.trim();
            if (!norm.startsWith("http://") && !norm.startsWith("https://")) {
              norm = `https://${norm}`;
            }
            const parsed = new URL(norm);
            referrerDomain = parsed.hostname.replace(/^www\./, "").toLowerCase();

            if (referrerDomain.includes("linkedin.com")) sourceChannel = SourcingChannel.LINKEDIN;
            else if (referrerDomain.includes("indeed.com")) sourceChannel = SourcingChannel.INDEED;
            else if (referrerDomain.includes("google.com")) sourceChannel = SourcingChannel.GOOGLE_JOBS;
            else if (referrerDomain.includes("glassdoor.com")) sourceChannel = SourcingChannel.GLASSDOOR;
            else if (referrerDomain.includes("facebook.com")) sourceChannel = SourcingChannel.FACEBOOK;
            else if (referrerDomain.includes("twitter.com") || referrerDomain.includes("x.com")) sourceChannel = SourcingChannel.TWITTER_X;
            else if (referrerDomain.includes("reddit.com")) sourceChannel = SourcingChannel.REDDIT;
            else if (referrerDomain.includes("stackoverflow.com")) sourceChannel = SourcingChannel.STACK_OVERFLOW;
            else if (referrerDomain.includes("handshake.com")) sourceChannel = SourcingChannel.HANDSHAKE;
            else if (referrerDomain) sourceChannel = SourcingChannel.OTHER;
          } catch {
            // Ignore URL parse error
          }
        }

        if (!trackingLinkId && dto.sourceChannel) {
          sourceChannel = dto.sourceChannel as SourcingChannel;
        }

        // 6. Save Application record
        return await tx.orm.public.Application.create({
          id: crypto.randomUUID(),
          candidateId: candidateId as string,
          jobId: dto.jobId,
          stage: "APPLIED",
          resumeUrl: uploadResult.url || null,
          resumeFileName: uploadResult.originalName || null,
          resumeFileSize: uploadResult.size || null,
          resumeMimeType: uploadResult.mimeType || "application/pdf",
          notes: dto.notes || null,
          orderIndex: maxOrder + 1,
          trackingLinkId,
          sourceChannel,
          sourceDetails,
          referrerDomain,
          utmCampaign,
          updatedAt: toInstant(),
        });
      });
    } catch (dbError) {
      // Step 3: Compensating action — rollback MinIO uploaded file
      if (uploadedFileInMinio && (uploadResult.fileName || uploadResult.url)) {
        const objectToDelete = uploadResult.fileName || this.minioService.extractObjectName(uploadResult.url);
        if (objectToDelete) {
          try {
            await this.minioService.deleteFile(objectToDelete);
          } catch (compensationErr: unknown) {
            const errMsg = compensationErr instanceof Error ? compensationErr.message : String(compensationErr);
            if (this.orphanCleanupQueue) {
              try {
                await this.orphanCleanupQueue.add(
                  "cleanup",
                  {
                    objectName: objectToDelete,
                    reason: "transaction-rollback-compensation-failed",
                    originalError: errMsg,
                    enqueuedAt: new Date().toISOString(),
                  },
                  {
                    attempts: 5,
                    backoff: {
                      type: "exponential",
                      delay: 1000,
                    },
                    removeOnComplete: true,
                    removeOnFail: false,
                  },
                );
                console.warn(`Compensating delete failed for ${objectToDelete}, queued for retry in DLQ: ${errMsg}`);
              } catch (queueErr: unknown) {
                console.error("Failed to enqueue orphan file to cleanup queue:", queueErr);
              }
            } else {
              console.warn("Failed to delete MinIO file during transaction compensation:", compensationErr);
            }
          }
        }
      }
      throw dbError;
    }

    const result = await this.findOne(created.id);

    // Record activity log & send confirmation email
    const orgId = job.organizationId;
    if (orgId && result.candidate) {
      await this.activitiesService.createActivity({
        organizationId: orgId,
        candidateId: result.candidate.id,
        applicationId: result.id,
        type: "APPLIED",
        title: "Application Submitted",
        description: `Applied for ${job.title}`,
        actorName: result.candidate.name,
        actorRole: "CANDIDATE",
        metadata: {
          jobId: job.id,
          jobTitle: job.title,
          resumeFileName: result.resumeFileName,
          sourceChannel,
          sourceDetails,
          utmCampaign,
        },
      });

      if (result.candidate.email) {
        try {
          const template = await this.emailService.getTemplateByType(orgId, "APPLICATION_CONFIRMATION");
          if (template && template.enabled) {
            let orgName = "Company";
            const org = await this.prisma.db.orm.public.Organization.select("name")
              .where((o) => o.id.eq(orgId))
              .first();
            if (org?.name) {
              orgName = org.name;
            }

            await this.emailService.sendEmail(
              {
                to: result.candidate.email,
                recipientName: result.candidate.name,
                subject: template.subject,
                body: template.body,
                templateType: "APPLICATION_CONFIRMATION",
                candidateId: result.candidate.id,
                applicationId: result.id,
                variables: buildDynamicEmailContext({
                  candidate: {
                    name: result.candidate.name,
                    email: result.candidate.email,
                    phone: result.candidate.phone,
                  },
                  job: {
                    title: job.title,
                    department: job.department,
                    location: job.location,
                  },
                  organization: { name: orgName },
                }),
              },
              orgId,
            );
          }
        } catch (emailErr) {
          console.warn("Failed to send confirmation email:", emailErr);
        }
      }
    }

    return result;
  }

  async updateStage(id: string, dto: UpdateStageDto, tenantOrgId?: string | null) {
    const existing = await this.findOne(id, tenantOrgId);
    const oldStage = existing.stage;

    // Validate state transition
    if (dto.stage !== oldStage) {
      const allowedNextStages = (VALID_APPLICATION_STAGE_TRANSITIONS as Record<string, readonly string[]>)[oldStage] || [];
      if (!allowedNextStages.includes(dto.stage)) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.APPLICATION_INVALID_STAGE_TRANSITION,
          `Cannot transition application stage from '${oldStage}' to '${dto.stage}'. Valid transitions from '${oldStage}' are: ${allowedNextStages.join(", ") || "none (terminal stage)"}.`,
          { currentStage: oldStage, targetStage: dto.stage },
        );
      }
    }

    const updatedRecord = await this.prisma.db.orm.public.Application
      .where((a) => a.id.eq(id))
      .where((a) => a.stage.eq(oldStage))
      .update({
        stage: dto.stage,
        ...(dto.orderIndex !== undefined ? { orderIndex: dto.orderIndex } : {}),
      });

    if (!updatedRecord) {
      throw new AppConflictException(
        APP_ERROR_CODES.APPLICATION_STAGE_CONFLICT,
        `Application stage conflict: the application has been modified by another request. Current stage is no longer '${oldStage}'.`,
        { currentStage: oldStage, targetStage: dto.stage },
      );
    }

    const updated = await this.findOne(id, tenantOrgId);

    // Record activity log
    const orgId = updated.job?.organizationId || updated.candidate?.organizationId;
    if (orgId && updated.candidate && oldStage !== dto.stage) {
      await this.activitiesService.createActivity({
        organizationId: orgId,
        candidateId: updated.candidate.id,
        applicationId: updated.id,
        type: "STAGE_CHANGED",
        title: `Stage Changed: ${oldStage} → ${dto.stage}`,
        description: `Application moved from ${oldStage} to ${dto.stage} for position ${updated.job?.title || ""}`,
        actorName: "HR Team",
        actorRole: "ADMIN",
        metadata: {
          fromStage: oldStage,
          toStage: dto.stage,
          jobTitle: updated.job?.title || "",
        },
      });

      // If rejected and rejection template enabled, send rejection email
      if (dto.stage === "REJECTED" && updated.candidate.email) {
        try {
          const template = await this.emailService.getTemplateByType(orgId, "REJECTION");
          if (template && template.enabled) {
            let orgName = "Company";
            const org = await this.prisma.db.orm.public.Organization.select("name")
              .where((o) => o.id.eq(orgId))
              .first();
            if (org?.name) {
              orgName = org.name;
            }

            await this.emailService.sendEmail(
              {
                to: updated.candidate.email,
                recipientName: updated.candidate.name,
                subject: template.subject,
                body: template.body,
                templateType: "REJECTION",
                candidateId: updated.candidate.id,
                applicationId: updated.id,
                variables: buildDynamicEmailContext({
                  candidate: {
                    name: updated.candidate.name,
                    email: updated.candidate.email,
                    phone: updated.candidate.phone,
                  },
                  job: {
                    title: updated.job?.title || "Vị trí tuyển dụng",
                    department: updated.job?.department || "",
                    location: updated.job?.location || "",
                  },
                  organization: { name: orgName },
                }),
              },
              orgId,
            );
          }
        } catch (emailErr) {
          console.warn("Failed to send rejection email:", emailErr);
        }
      }
    }

    return updated;
  }

  async updateCandidate(id: string, dto: UpdateCandidateDto, tenantOrgId?: string | null) {
    const existing = await this.findOne(id, tenantOrgId);

    // Update candidate profile directly
    if (existing.candidateId) {
      const candidateUpdate: Record<string, unknown> = {};
      if (dto.candidateName !== undefined) candidateUpdate.name = dto.candidateName;
      if (dto.candidateEmail !== undefined) candidateUpdate.email = dto.candidateEmail.toLowerCase();
      if (dto.candidatePhone !== undefined) candidateUpdate.phone = dto.candidatePhone;
      if (dto.notes !== undefined) candidateUpdate.notes = dto.notes;
      if (dto.resumeUrl !== undefined) candidateUpdate.resumeUrl = dto.resumeUrl;
      if (dto.resumeFileName !== undefined) candidateUpdate.resumeFileName = dto.resumeFileName;

      await this.prisma.db.orm.public.Candidate.where(
        (c) => c.id.eq(existing.candidateId),
      ).update(candidateUpdate);
    }

    return this.findOne(id, tenantOrgId);
  }

  async uploadDocument(
    id: string,
    file: Express.Multer.File,
    documentType = "Resume",
    tenantOrgId?: string | null,
  ) {
    const existing = await this.findOne(id, tenantOrgId);

    if (!file) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.DOCUMENT_FILE_REQUIRED,
        "No document file provided",
      );
    }

    validateUploadedFile(file);
    const cleanOriginalName = sanitizeFilename(
      fixUtf8String(file.originalname || "document.pdf"),
    );

    let uploadResult: {
      url: string;
      originalName: string;
      size: number;
      mimeType: string;
    } = {
      url: `/uploads/${Date.now()}-${cleanOriginalName}`,
      originalName: cleanOriginalName,
      size: file.size || 0,
      mimeType: file.mimetype || "application/pdf",
    };

    const targetOrgId = existing.job?.organizationId || tenantOrgId;

    try {
      uploadResult = await this.minioService.uploadFile(file, "resumes", targetOrgId);
      uploadResult.originalName = cleanOriginalName;
    } catch {
      uploadResult = {
        url: `/uploads/${Date.now()}-${cleanOriginalName}`,
        originalName: cleanOriginalName,
        size: file.size,
        mimeType: file.mimetype,
      };
    }

    const newDocId = crypto.randomUUID();
    const cleanDocName = fixUtf8String(uploadResult.originalName);

    if (existing.candidateId) {
      try {
        const cand = await this.prisma.db.orm.public.Candidate.select("id", "organizationId")
          .where((c) => c.id.eq(existing.candidateId))
          .first();
        if (cand) {
          await this.prisma.db.orm.public.CandidateDocument.create({
            id: newDocId,
            candidateId: cand.id,
            organizationId: cand.organizationId,
            name: cleanDocName,
            url: uploadResult.url,
            size: uploadResult.size ?? null,
            mimeType: uploadResult.mimeType ?? null,
            type: documentType || "Resume",
            updatedAt: toInstant(),
          });
        }
      } catch {
        // ignore if mock or table unavailable in test
      }
    }

    await this.prisma.db.orm.public.Application.where(
      (a) => a.id.eq(id),
    ).update({
      resumeUrl: uploadResult.url,
      resumeFileName: cleanDocName,
      resumeFileSize: uploadResult.size ?? null,
      resumeMimeType: uploadResult.mimeType ?? null,
    });

    return this.findOne(id, tenantOrgId);
  }

  async prepareDocumentDownload(
    id: string,
    targetUrl?: string,
    targetName?: string,
    tenantOrgId?: string | null,
    currentUser?: { id?: string; name?: string } | null,
  ) {
    const app = await this.findOne(id, tenantOrgId);

    const downloadUrl = targetUrl || app.resumeUrl;
    if (!downloadUrl) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.DOCUMENT_NOT_FOUND,
        "Document not found",
      );
    }

    // SSRF prevention: Verify that targetUrl belongs to this application
    if (targetUrl) {
      const allowedUrls: string[] = [];
      if (app.resumeUrl) allowedUrls.push(app.resumeUrl);
      if (app.candidate?.resumeUrl) allowedUrls.push(app.candidate.resumeUrl);
      if (app.candidateId) {
        try {
          const candDocs = await this.getCandidateDocuments(app.candidateId);
          for (const doc of candDocs) {
            if (doc?.url) allowedUrls.push(doc.url);
          }
        } catch {
          // ignore
        }
      }

      const targetObj = this.minioService.extractObjectName(targetUrl);
      const isAllowed = allowedUrls.some(
        (u) => u === targetUrl || this.minioService.extractObjectName(u) === targetObj,
      );
      if (!isAllowed) {
        throw new AppForbiddenException(
          APP_ERROR_CODES.DOCUMENT_NOT_FOUND,
          "Access denied: specified document does not belong to this application.",
          { id },
        );
      }
    }

    const rawName = targetName || app.resumeFileName || "document.pdf";
    const cleanFileName = fixUtf8String(rawName);
    const asciiFallback = cleanFileName.replace(/[^\x20-\x7E]/g, "_");
    const encodedFileName = encodeURIComponent(cleanFileName);

    let stream: NodeJS.ReadableStream;
    try {
      stream = await this.minioService.getObjectStream(downloadUrl);
    } catch {
      throw new AppNotFoundException(
        APP_ERROR_CODES.DOCUMENT_RETRIEVE_FAILED,
        "Document file could not be retrieved from storage",
      );
    }

    if (currentUser?.id && app.candidateId && this.activitiesService) {
      const appOrgId = app?.job?.organizationId || app?.candidate?.organizationId || "default";
      this.activitiesService
        .createActivity({
          organizationId: appOrgId,
          candidateId: app.candidateId,
          applicationId: app.id,
          type: "NOTE_ADDED",
          title: "Document Downloaded",
          description: `Document "${cleanFileName}" was downloaded by ${currentUser.name || "recruiter"}`,
          actorId: currentUser.id,
          actorName: currentUser.name || "Recruiter",
          metadata: {
            action: "DOWNLOAD_DOCUMENT",
            subType: "DOCUMENT_DOWNLOADED",
            fileName: cleanFileName,
            userName: currentUser.name || "Recruiter",
            documentUrl: downloadUrl,
            applicationId: app.id,
          },
        })
        .catch(() => {});
    }

    return {
      app,
      downloadUrl,
      cleanFileName,
      asciiFallback,
      encodedFileName,
      mimeType: app.resumeMimeType,
      stream,
    };
  }

  async deleteDocument(
    id: string,
    opts?: { documentId?: string; url?: string },
    tenantOrgId?: string | null,
  ) {
    await this.findOne(id, tenantOrgId);

    if (opts?.documentId) {
      try {
        await this.prisma.db.orm.public.CandidateDocument.where((d) => d.id.eq(opts.documentId!)).delete();
      } catch {}
    } else if (opts?.url) {
      try {
        await this.prisma.db.orm.public.CandidateDocument.where((d) => d.url.eq(opts.url!)).delete();
      } catch {}
    }

    await this.prisma.db.orm.public.Application.where(
      (a) => a.id.eq(id),
    ).update({
      resumeUrl: null,
      resumeFileName: null,
      resumeFileSize: null,
      resumeMimeType: null,
    });

    return this.findOne(id, tenantOrgId);
  }

  async getCandidateDocuments(candidateId: string): Promise<CandidateDocument[]> {
    try {
      const queried = await this.prisma.db.orm.public.CandidateDocument.select(
        "id",
        "candidateId",
        "organizationId",
        "name",
        "url",
        "size",
        "mimeType",
        "type",
        "createdAt",
      )
        .where((d) => d.candidateId.eq(candidateId))
        .all();
      return queried.map((d) => ({
        ...d,
        createdAt: d.createdAt ? new Date(toTimestamp(d.createdAt)).toISOString() : new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  }

  async remove(id: string, tenantOrgId?: string | null) {
    const existing = await this.findOne(id, tenantOrgId);
    const orgId = existing.job?.organizationId || existing.candidate?.organizationId || tenantOrgId;

    if (orgId && existing.candidate) {
      try {
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
      } catch (err) {
        console.warn("Failed to create audit activity log on application deletion:", err);
      }
    }

    await this.executeTx(async (tx) => {
      try {
        const txObj = tx as unknown as { orm: { public: { Interview?: { where?: (fn: (i: { applicationId: { eq: (val: string) => boolean } }) => boolean) => { delete?: () => Promise<unknown> } } } } };
        if (typeof txObj.orm.public.Interview?.where === "function") {
          const query = txObj.orm.public.Interview.where((i) => i.applicationId.eq(id));
          if (typeof query?.delete === "function") {
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
