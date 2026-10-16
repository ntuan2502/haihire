import {
  Inject,
  Injectable,
  Optional,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import crypto from "node:crypto";
import {
  APP_ERROR_CODES,
  SourcingChannel,
} from "@haihire/shared";
import {
  AppBadRequestException,
  AppConflictException,
  AppForbiddenException,
  AppNotFoundException,
} from "../../common/app-exception";
import { MinioService } from "../../minio/minio.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ActivitiesService } from "../../activities/activities.service";
import { EmailService } from "../../email/email.service";
import { buildDynamicEmailContext } from "../../email/variable-registry";
import { CreateApplicationDto } from "../dto/create-application.dto";
import { validateUploadedFile, sanitizeFilename } from "../../common/upload-utils";
import { fixUtf8String } from "../../common/doc-utils";
import { toInstant } from "../../common/date.util";
import { ApplicationsQueryService } from "./applications-query.service";

@Injectable()
export class ApplicationsSagaService {
  private readonly query: ApplicationsQueryService;

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
    @Optional()
    @Inject(ApplicationsQueryService)
    queryService?: ApplicationsQueryService,
  ) {
    this.query = queryService || new ApplicationsQueryService(prisma, activitiesService);
  }

  private async executeTx<T>(fn: (tx: PrismaService["db"]) => Promise<T>): Promise<T> {
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
                    organizationId: job.organizationId || undefined,
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

    const result = await this.query.findOne(created.id);

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
}
