import { Inject, Injectable, Optional } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import crypto from "node:crypto";
import {
  APP_ERROR_CODES,
  SourcingChannel,
  formatCandidateDisplayName,
  normalizeNameInput,
  resolveChannelFromDomain,
} from "@haihire/shared";
import { resolveOrgNameDisplayOrder } from "../../common/candidate-name.util";
import { parseDomain } from "../../sourcing/services";
import {
  AppBadRequestException,
  AppConflictException,
  AppForbiddenException,
  AppNotFoundException,
} from "../../common/app-exception";
import { MinioService } from "../../minio/minio.service";
import { PrismaService, runInTransaction } from "../../prisma/prisma.service";
import { ActivitiesService } from "../../activities/activities.service";
import { EmailService } from "../../email/email.service";
import { buildDynamicEmailContext } from "../../email/variable-registry";
import { CreateApplicationDto } from "../dto/create-application.dto";
import {
  validateUploadedFile,
  sanitizeFilename,
} from "../../common/upload-utils";
import { fixUtf8String } from "../../common/doc-utils";
import { toInstant } from "../../common/date.util";
import { EventsService } from "../../events/events.service";
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
    @Optional()
    @Inject(EventsService)
    private readonly eventsService?: EventsService,
  ) {
    this.query =
      queryService || new ApplicationsQueryService(prisma, activitiesService);
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

    const job = await this.prisma.job.findFirst({
      where: { id: dto.jobId, deletedAt: null },
      select: {
        id: true,
        title: true,
        status: true,
        organizationId: true,
        department: true,
        location: true,
      },
    });

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
    let uploadResult: {
      url: string;
      originalName: string;
      size: number;
      mimeType: string;
      fileName?: string;
    } = {
      url: "",
      originalName: "Candidate Resume",
      size: 0,
      mimeType: "application/pdf",
    };

    let uploadedFileInMinio = false;

    if (file) {
      validateUploadedFile(file);
      uploadResult = await this.minioService.uploadFile(
        file,
        "resumes",
        job.organizationId,
      );
      uploadResult.originalName = sanitizeFilename(
        fixUtf8String(file.originalname || "resume.pdf"),
      );
      uploadedFileInMinio = true;
    } else if (dto.resumeUrl) {
      if (job.organizationId) {
        const safeTenant = job.organizationId
          .trim()
          .replace(/[^a-zA-Z0-9_-]/g, "");
        const objName = this.minioService.extractObjectName(dto.resumeUrl);
        if (
          objName.startsWith("tenants/") &&
          !objName.startsWith(`tenants/${safeTenant}/`)
        ) {
          throw new AppForbiddenException(
            APP_ERROR_CODES.FORBIDDEN,
            "Cross-tenant resume reference is not permitted",
          );
        }
      }
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
      created = await runInTransaction(this.prisma, async (tx) => {
        const orgId = job.organizationId;
        if (!orgId) {
          throw new AppBadRequestException(
            APP_ERROR_CODES.JOB_INVALID_ORGANIZATION,
            "Target job does not belong to a valid organization.",
          );
        }

        // 2. Resolve or create Candidate
        let candidateId = dto.candidateId;
        const nameOrder = await resolveOrgNameDisplayOrder(this.prisma, orgId);
        let applicantName = "";

        if (!candidateId) {
          const firstName = normalizeNameInput(dto.firstName);
          const lastName = normalizeNameInput(dto.lastName);
          if (!dto.candidateEmail || !firstName || !lastName) {
            throw new AppBadRequestException(
              APP_ERROR_CODES.CANDIDATE_INFO_REQUIRED,
              "Either candidateId or both firstName/lastName and candidateEmail are required.",
            );
          }

          const email = dto.candidateEmail.trim().toLowerCase();
          const displayName = dto.displayName?.trim() || null;
          applicantName = formatCandidateDisplayName(
            { firstName, lastName, displayName },
            nameOrder,
          );

          const existingCandidate = await tx.candidate.findFirst({
            where: {
              organizationId: orgId,
              email,
            },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              deletedAt: true,
            },
          });

          if (existingCandidate) {
            if (existingCandidate.deletedAt) {
              await tx.candidate.update({
                where: { id: existingCandidate.id },
                data: { deletedAt: null, updatedAt: toInstant() },
              });
            }
            candidateId = existingCandidate.id;
            applicantName = formatCandidateDisplayName(
              existingCandidate,
              nameOrder,
            );
          } else {
            const newCandidate = await tx.candidate.create({
              data: {
                id: crypto.randomUUID(),
                organizationId: orgId,
                firstName,
                lastName,
                displayName,
                email,
                phone: dto.candidatePhone?.trim() || null,
                resumeUrl: uploadResult.url || null,
                resumeFileName: uploadResult.originalName || null,
                resumeFileSize: uploadResult.size || null,
                resumeMimeType: uploadResult.mimeType || "application/pdf",
                updatedAt: toInstant(),
              },
            });
            candidateId = newCandidate.id;
          }
        } else {
          // Validate candidate exists and belongs to the same organization as the target job
          const existingCandidate = await tx.candidate.findFirst({
            where: { id: candidateId as string, deletedAt: null },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              organizationId: true,
              resumeUrl: true,
              resumeFileName: true,
              resumeFileSize: true,
              resumeMimeType: true,
            },
          });

          if (!existingCandidate) {
            throw new AppNotFoundException(
              APP_ERROR_CODES.CANDIDATE_NOT_FOUND,
              `Candidate with ID ${candidateId} not found`,
            );
          }
          applicantName = formatCandidateDisplayName(
            existingCandidate,
            nameOrder,
          );
          if (
            job.organizationId &&
            existingCandidate.organizationId !== job.organizationId
          ) {
            throw new AppForbiddenException(
              APP_ERROR_CODES.CANDIDATE_ORG_MISMATCH,
              "Candidate does not belong to the target job's organization.",
            );
          }

          if (!uploadedFileInMinio && dto.resumeUrl) {
            const matchesPrimary =
              existingCandidate.resumeUrl === dto.resumeUrl;
            let matchesDoc = false;
            if (!matchesPrimary) {
              const doc = await tx.candidateDocument.findFirst({
                where: {
                  candidateId: existingCandidate.id,
                  url: dto.resumeUrl,
                },
                select: { id: true },
              });
              matchesDoc = Boolean(doc);
            }
            if (!matchesPrimary && !matchesDoc) {
              throw new AppForbiddenException(
                APP_ERROR_CODES.FORBIDDEN,
                "Referenced resume does not belong to this candidate.",
              );
            }
            if (matchesPrimary) {
              uploadResult.size = existingCandidate.resumeFileSize || 0;
              uploadResult.mimeType =
                existingCandidate.resumeMimeType || "application/pdf";
            }
          }
        }

        const existingApplication = await tx.application.findFirst({
          where: {
            candidateId: candidateId as string,
            jobId: dto.jobId,
          },
          select: { id: true },
        });

        if (existingApplication) {
          throw new AppConflictException(
            APP_ERROR_CODES.CANDIDATE_ALREADY_APPLIED,
            "Candidate has already applied to this job.",
          );
        }

        const existingInStage = await tx.application.findMany({
          where: { jobId: dto.jobId },
          select: { id: true, orderIndex: true },
        });

        const maxOrder = existingInStage.reduce(
          (max: number, item: { orderIndex: number }) =>
            Math.max(max, item.orderIndex),
          -1,
        );

        // 5. Resolve Sourcing / Attribution
        if (dto.ref) {
          const link = await tx.trackingLink.findFirst({
            where: { token: dto.ref as string },
            select: {
              id: true,
              organizationId: true,
              source: true,
              customSource: true,
              campaign: true,
              isActive: true,
              deletedAt: true,
            },
          });

          if (
            link &&
            !link.deletedAt &&
            link.isActive &&
            (!job.organizationId || link.organizationId === job.organizationId)
          ) {
            trackingLinkId = link.id;
            sourceChannel =
              (link.source as SourcingChannel) || SourcingChannel.OTHER;
            sourceDetails = link.customSource || null;
            if (!utmCampaign && link.campaign) {
              utmCampaign = link.campaign;
            }
          }
        }

        if (!trackingLinkId && dto.referrer) {
          referrerDomain = parseDomain(dto.referrer);
          if (referrerDomain) {
            sourceChannel = resolveChannelFromDomain(referrerDomain);
          }
        }

        if (!trackingLinkId && dto.sourceChannel) {
          sourceChannel = dto.sourceChannel as SourcingChannel;
        }

        // 6. Save Application record
        const savedApp = await tx.application.create({
          data: {
            id: crypto.randomUUID(),
            candidateId: candidateId as string,
            jobId: dto.jobId,
            stage: "APPLIED",
            resumeUrl: uploadResult.url || null,
            resumeFileName: uploadResult.originalName || null,
            resumeFileSize: uploadResult.size || null,
            resumeMimeType: uploadResult.mimeType || "application/pdf",
            orderIndex: maxOrder + 1,
            trackingLinkId,
            sourceChannel,
            sourceDetails,
            referrerDomain,
            utmCampaign,
            updatedAt: toInstant(),
          },
        });

        if (dto.notes && dto.notes.trim()) {
          await tx.applicationNote.create({
            data: {
              organizationId: orgId,
              applicationId: savedApp.id,
              authorId: candidateId as string,
              authorName: applicantName || "Applicant",
              authorRole: "APPLICANT",
              content: dto.notes.trim(),
            },
          });
        }

        return savedApp;
      });
    } catch (dbError) {
      // Step 3: Compensating action — rollback MinIO uploaded file
      if (uploadedFileInMinio && (uploadResult.fileName || uploadResult.url)) {
        const objectToDelete =
          uploadResult.fileName ||
          this.minioService.extractObjectName(uploadResult.url);
        if (objectToDelete) {
          try {
            await this.minioService.deleteFile(objectToDelete);
          } catch (compensationErr: unknown) {
            const errMsg =
              compensationErr instanceof Error
                ? compensationErr.message
                : String(compensationErr);
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
                console.warn(
                  `Compensating delete failed for ${objectToDelete}, queued for retry in DLQ: ${errMsg}`,
                );
              } catch (queueErr: unknown) {
                console.error(
                  "Failed to enqueue orphan file to cleanup queue:",
                  queueErr,
                );
              }
            } else {
              console.warn(
                "Failed to delete MinIO file during transaction compensation:",
                compensationErr,
              );
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
        actorName: result.candidateName || result.candidate.name,
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
          const template =
            typeof this.emailService.resolveFlowTemplate === "function"
              ? await this.emailService.resolveFlowTemplate(
                  orgId,
                  "APPLICATION_RECEIVED",
                )
              : await this.emailService.getTemplateByType(
                  orgId,
                  "APPLICATION_CONFIRMATION",
                );
          if (template && template.enabled) {
            let orgName = "Company";
            let orgOrder: "FIRST_LAST" | "LAST_FIRST" = "FIRST_LAST";
            const org = await this.prisma.organization.findFirst({
              where: { id: orgId },
              select: { name: true, nameDisplayOrder: true },
            });
            if (org?.name) {
              orgName = org.name;
            }
            if (org?.nameDisplayOrder === "LAST_FIRST") {
              orgOrder = "LAST_FIRST";
            }
            const resolvedCandidateName = formatCandidateDisplayName(
              result.candidate,
              orgOrder,
            );

            await this.emailService.sendEmail(
              {
                to: result.candidate.email,
                recipientName: resolvedCandidateName,
                subject: template.subject,
                body: template.body,
                templateType: template.type || "APPLICATION_CONFIRMATION",
                templateId: template.id,
                templateName: template.name,
                candidateId: result.candidate.id,
                applicationId: result.id,
                variables: buildDynamicEmailContext({
                  candidate: {
                    name: resolvedCandidateName,
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

    if (orgId) {
      this.eventsService?.emit({
        type: "APPLICATIONS_CHANGED",
        organizationId: orgId,
        data: { applicationId: result.id, jobId: result.jobId },
      });
      this.eventsService?.emit({
        type: "CANDIDATES_CHANGED",
        organizationId: orgId,
        data: { candidateId: result.candidate?.id },
      });
      this.eventsService?.emit({
        type: "ACTIVITIES_CHANGED",
        organizationId: orgId,
        data: { candidateId: result.candidate?.id, applicationId: result.id },
      });
      this.eventsService?.emit({
        type: "SOURCING_CHANGED",
        organizationId: orgId,
        data: { jobId: job.id },
      });
    }

    if (!currentUser) {
      return {
        id: result.id,
        jobId: result.jobId,
        stage: result.stage,
        createdAt: result.createdAt,
      };
    }
    return result;
  }
}
