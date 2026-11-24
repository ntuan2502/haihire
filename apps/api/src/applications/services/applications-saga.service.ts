import { NotificationsService } from "../../notifications/notifications.service";
import { Inject, Injectable, Optional } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import crypto from "node:crypto";
import {
  APP_ERROR_CODES,
  Role,
  SourcingChannel,
  formatCandidateDisplayName,
  hasPermission,
  isJobApplicationDeadlinePassed,
  normalizeNameInput,
  resolveChannelFromDomain,
} from "@haihire/shared";
import { PermissionResolverService } from "../../auth/permission-resolver.service";
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
import { PublicApplyDto } from "../dto/public-apply.dto";
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
    @Optional()
    @Inject(NotificationsService)
    private readonly notifications?: NotificationsService,
    @Optional()
    @Inject(PermissionResolverService)
    private readonly permissionResolver?: PermissionResolverService,
  ) {
    this.query =
      queryService || new ApplicationsQueryService(prisma, activitiesService);
  }

  async create(
    dto: CreateApplicationDto | PublicApplyDto,
    file?: Express.Multer.File,
    currentUser?: {
      role?: string;
      organizationId?: string | null;
      isOwner?: boolean;
    } | null,
  ) {
    if (
      !this.permissionResolver &&
      currentUser?.role === "MEMBER" &&
      !currentUser?.isOwner
    ) {
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

    const isAnonymousPublicApply =
      !currentUser &&
      (dto instanceof PublicApplyDto ||
        (!("candidateId" in dto) &&
          !("sourceChannel" in dto) &&
          "email" in dto));

    const rawResumeUrl =
      !isAnonymousPublicApply && "resumeUrl" in dto ? dto.resumeUrl : undefined;
    const rawResumeFileName =
      !isAnonymousPublicApply && "resumeFileName" in dto
        ? dto.resumeFileName
        : undefined;
    const rawUtmSource = "utmSource" in dto ? dto.utmSource : undefined;
    const rawUtmMedium = "utmMedium" in dto ? dto.utmMedium : undefined;
    const rawUtmCampaign = "utmCampaign" in dto ? dto.utmCampaign : undefined;
    const rawUtmTerm = "utmTerm" in dto ? dto.utmTerm : undefined;
    const rawUtmContent = "utmContent" in dto ? dto.utmContent : undefined;

    const job = await this.prisma.job.findFirst({
      where: { id: dto.jobId, deletedAt: null },
      select: {
        createdById: true,
        id: true,
        title: true,
        status: true,
        applicationDeadline: true,
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

    if (currentUser) {
      if (
        currentUser.organizationId &&
        job.organizationId &&
        currentUser.organizationId !== job.organizationId
      ) {
        throw new AppForbiddenException(
          APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
          "Cannot create application for another organization's job.",
        );
      }

      if (
        currentUser.role &&
        !currentUser.isOwner &&
        currentUser.role !== Role.ADMIN
      ) {
        const canCreate =
          this.permissionResolver && job.organizationId
            ? await this.permissionResolver.resolvePermission(
                job.organizationId,
                currentUser.role as Role,
                "application:create",
              )
            : hasPermission(currentUser.role as Role, "application:create");

        if (!canCreate) {
          throw new AppForbiddenException(
            APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
            "Insufficient permissions to create applications.",
          );
        }
      }
    }

    if (job.status !== "PUBLISHED") {
      throw new AppBadRequestException(
        APP_ERROR_CODES.JOB_NOT_ACCEPTING_APPLICATIONS,
        "This job is not currently accepting applications.",
      );
    }

    if (isJobApplicationDeadlinePassed(job.applicationDeadline)) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.JOB_NOT_ACCEPTING_APPLICATIONS,
        "The application deadline for this job has passed.",
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
    } else if (rawResumeUrl) {
      if (job.organizationId) {
        const safeTenant = job.organizationId
          .trim()
          .replace(/[^a-zA-Z0-9_-]/g, "");
        const objName = this.minioService.extractObjectName(rawResumeUrl);
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
        url: rawResumeUrl,
        originalName: rawResumeFileName || "Candidate Resume",
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
    let utmSource: string | null = rawUtmSource?.trim() || null;
    let utmMedium: string | null = rawUtmMedium?.trim() || null;
    let utmCampaign: string | null = rawUtmCampaign?.trim() || null;
    let utmTerm: string | null = rawUtmTerm?.trim() || null;
    let utmContent: string | null = rawUtmContent?.trim() || null;

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
        const candidateEmail = (
          (dto as unknown as { email?: string }).email || dto.candidateEmail
        )
          ?.trim()
          .toLowerCase();
        const candidatePhone =
          (
            (dto as unknown as { phone?: string }).phone || dto.candidatePhone
          )?.trim() || null;
        const trackingToken =
          (
            (dto as unknown as { trackingToken?: string }).trackingToken ||
            dto.ref
          )?.trim() || null;

        // Strip caller-supplied admin fields if caller is anonymous / public apply
        let candidateId = isAnonymousPublicApply ? undefined : dto.candidateId;
        const nameOrder = await resolveOrgNameDisplayOrder(tx, orgId);
        let applicantName = "";

        if (!candidateId) {
          const firstName = normalizeNameInput(dto.firstName);
          const lastName = normalizeNameInput(dto.lastName);
          if (!candidateEmail || !firstName || !lastName) {
            throw new AppBadRequestException(
              APP_ERROR_CODES.CANDIDATE_INFO_REQUIRED,
              "Either candidateId or both firstName/lastName and candidateEmail are required.",
            );
          }

          const displayName =
            (dto as CreateApplicationDto).displayName?.trim() || null;
          applicantName = formatCandidateDisplayName(
            { firstName, lastName, displayName },
            nameOrder,
          );

          const existingCandidate = await tx.candidate.findFirst({
            where: {
              organizationId: orgId,
              email: candidateEmail,
              deletedAt: null,
            },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              phone: true,
            },
          });

          if (existingCandidate) {
            candidateId = existingCandidate.id;
            applicantName = formatCandidateDisplayName(
              existingCandidate,
              nameOrder,
            );
            if (!existingCandidate.phone && candidatePhone) {
              await tx.candidate.updateMany({
                where: {
                  id: existingCandidate.id,
                  organizationId: orgId,
                  deletedAt: null,
                },
                data: {
                  phone: candidatePhone,
                  updatedAt: toInstant(),
                },
              });
            }
          } else {
            const newCandidate = await tx.candidate.create({
              data: {
                id: crypto.randomUUID(),
                organizationId: orgId,
                firstName,
                lastName,
                displayName,
                email: candidateEmail,
                phone: candidatePhone,
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

          if (!uploadedFileInMinio && rawResumeUrl) {
            const matchesPrimary = existingCandidate.resumeUrl === rawResumeUrl;
            let matchesDoc = false;
            if (!matchesPrimary) {
              const doc = await tx.candidateDocument.findFirst({
                where: {
                  candidateId: existingCandidate.id,
                  url: rawResumeUrl,
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

        let maxOrder = -1;
        if (
          typeof (tx.application as { aggregate?: unknown }).aggregate ===
          "function"
        ) {
          const orderAgg = await tx.application.aggregate({
            where: { jobId: dto.jobId },
            _max: { orderIndex: true },
          });
          maxOrder = orderAgg._max.orderIndex ?? -1;
        } else {
          const existingApps = await tx.application.findMany({
            where: { jobId: dto.jobId },
            select: { orderIndex: true },
          });
          maxOrder =
            existingApps.length > 0
              ? Math.max(...existingApps.map((a) => a.orderIndex || 0))
              : -1;
        }

        // 5. Resolve Sourcing / Attribution
        if (trackingToken) {
          const link = await tx.trackingLink.findFirst({
            where: { token: trackingToken as string },
            select: {
              id: true,
              organizationId: true,
              source: true,
              customSource: true,
              campaign: true,
              utmSource: true,
              utmMedium: true,
              utmCampaign: true,
              utmTerm: true,
              utmContent: true,
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
              (link.source as SourcingChannel) || SourcingChannel.DIRECT;
            sourceDetails = link.customSource || null;
            if (!utmSource && link.utmSource) {
              utmSource = link.utmSource;
            }
            if (!utmMedium && link.utmMedium) {
              utmMedium = link.utmMedium;
            }
            if (!utmCampaign && (link.utmCampaign || link.campaign)) {
              utmCampaign = link.utmCampaign || link.campaign;
            }
            if (!utmTerm && link.utmTerm) {
              utmTerm = link.utmTerm;
            }
            if (!utmContent && link.utmContent) {
              utmContent = link.utmContent;
            }
          }
        }

        if (!trackingLinkId && dto.referrer) {
          referrerDomain = parseDomain(dto.referrer);
          if (referrerDomain) {
            sourceChannel = resolveChannelFromDomain(referrerDomain);
          }
        }

        if (
          !isAnonymousPublicApply &&
          !trackingLinkId &&
          !referrerDomain &&
          (dto as CreateApplicationDto).sourceChannel
        ) {
          sourceChannel = (dto as CreateApplicationDto)
            .sourceChannel as SourcingChannel;
        }

        if (isAnonymousPublicApply && !trackingLinkId && !referrerDomain) {
          sourceChannel = SourcingChannel.DIRECT;
        }

        // 6. Resolve APPLIED pipeline stage if initialized and save Application record
        const appliedPipelineStage =
          typeof (
            tx as unknown as {
              pipelineStage?: {
                findFirst?: (args: unknown) => Promise<{ id: string } | null>;
              };
            }
          ).pipelineStage?.findFirst === "function"
            ? await (
                tx as unknown as {
                  pipelineStage: {
                    findFirst: (
                      args: unknown,
                    ) => Promise<{ id: string } | null>;
                  };
                }
              ).pipelineStage.findFirst({
                where: {
                  organizationId: orgId,
                  jobId: dto.jobId,
                  category: "APPLIED",
                },
                select: { id: true },
              })
            : null;

        const savedApp = await tx.application.create({
          data: {
            id: crypto.randomUUID(),
            organizationId: orgId,
            candidateId: candidateId as string,
            jobId: dto.jobId,
            stage: "APPLIED",
            ...(appliedPipelineStage
              ? { stageId: appliedPipelineStage.id }
              : {}),
            resumeUrl: uploadResult.url || null,
            resumeFileName: uploadResult.originalName || null,
            resumeFileSize: uploadResult.size || null,
            resumeMimeType: uploadResult.mimeType || "application/pdf",
            orderIndex: maxOrder + 1,
            trackingLinkId,
            sourceChannel,
            sourceDetails,
            referrerDomain,
            utmSource,
            utmMedium,
            utmCampaign,
            utmTerm,
            utmContent,
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
      if ((dbError as { code?: string })?.code === "P2002") {
        throw new AppConflictException(
          APP_ERROR_CODES.CANDIDATE_ALREADY_APPLIED,
          "This candidate has already applied to this job.",
        );
      }
      throw dbError;
    }

    const result = await this.query.findOne(created.id, job.organizationId);

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
      await this.notifications?.publish(
        orgId,
        job.createdById,
        "applicationReceived",
        result.id,
      );
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
