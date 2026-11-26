import { NotificationsService } from "../../notifications/notifications.service";
import { Inject, Injectable, Optional } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import crypto from "node:crypto";
import {
  APP_ERROR_CODES,
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
  COVER_LETTER_MAX_LENGTH,
  Role,
  SourcingChannel,
  formatCandidateDisplayName,
  hasPermission,
  isJobApplicationDeadlinePassed,
  isValidDateOnlyString,
  isValidHttpUrl,
  normalizeJobApplicationFormConfig,
  normalizeNameInput,
  resolveChannelFromDomain,
  screeningAnswerSubmissionSchema,
  type ScreeningAnswerItem,
  type ScreeningAnswerValue,
  type ScreeningFileAnswer,
} from "@haihire/shared";
import type { Prisma } from "@prisma/client";
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
import { OrganizationsAuditLogService } from "../../organizations/services/organizations-audit-log.service";
import { AiScoringService } from "../../ai/ai-scoring.service";

function isCandidateEmailUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  if ((err as { code?: string }).code !== "P2002") return false;

  const message =
    err instanceof Error
      ? err.message
      : typeof (err as { message?: unknown }).message === "string"
        ? (err as { message: string }).message
        : "";
  let metaText = "";
  try {
    const meta = (err as { meta?: unknown }).meta;
    if (meta !== undefined) {
      metaText = JSON.stringify(meta);
    }
  } catch {
    metaText = "";
  }

  const combined = `${message} ${metaText}`.toLowerCase();
  if (
    combined.includes("jobid") ||
    combined.includes("application_candidateid_jobid_key")
  ) {
    return false;
  }
  return (
    combined.includes("uq_candidate_org_email_active") ||
    combined.includes("email")
  );
}

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
    @Optional()
    @Inject(OrganizationsAuditLogService)
    private readonly auditLog?: OrganizationsAuditLogService,
    @Optional()
    @Inject(AiScoringService)
    private readonly aiScoringService?: AiScoringService,
  ) {
    this.query =
      queryService || new ApplicationsQueryService(prisma, activitiesService);
  }

  private async compensateMinioObject(
    objectToDelete: string,
    organizationId?: string | null,
  ): Promise<void> {
    if (!objectToDelete) return;
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
              organizationId: organizationId || undefined,
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

  async create(
    dto: CreateApplicationDto | PublicApplyDto,
    file?: Express.Multer.File,
    currentUser?: {
      id?: string;
      role?: string;
      organizationId?: string | null;
      isOwner?: boolean;
    } | null,
    screeningFiles?: Map<string, Express.Multer.File>,
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
        applicationFormConfig: true,
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

    const rawCoverLetter =
      "coverLetter" in dto && typeof dto.coverLetter === "string"
        ? dto.coverLetter.trim()
        : "";
    if (rawCoverLetter.length > COVER_LETTER_MAX_LENGTH) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        `Cover letter must be ${COVER_LETTER_MAX_LENGTH} characters or fewer.`,
      );
    }

    const parsedAnswersMap = new Map<string, ScreeningAnswerValue>();
    const rawScreeningAnswersStr =
      "screeningAnswers" in dto && typeof dto.screeningAnswers === "string"
        ? dto.screeningAnswers.trim()
        : "";
    if (rawScreeningAnswersStr) {
      let decoded: unknown;
      try {
        decoded = JSON.parse(rawScreeningAnswersStr);
      } catch {
        throw new AppBadRequestException(
          APP_ERROR_CODES.VALIDATION_ERROR,
          "Invalid screening answers JSON payload.",
        );
      }
      if (!Array.isArray(decoded)) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.VALIDATION_ERROR,
          "Screening answers must be an array.",
        );
      }
      for (const item of decoded) {
        const parsedItem = screeningAnswerSubmissionSchema.safeParse(item);
        if (!parsedItem.success) {
          throw new AppBadRequestException(
            APP_ERROR_CODES.VALIDATION_ERROR,
            parsedItem.error.issues[0]?.message ||
              "Invalid screening answer entry.",
          );
        }
        parsedAnswersMap.set(
          parsedItem.data.questionId,
          parsedItem.data.answer,
        );
      }
    }

    const rawJobFormConfig = (job as { applicationFormConfig?: unknown })
      .applicationFormConfig;
    const hasExplicitFormConfig =
      rawJobFormConfig !== null && rawJobFormConfig !== undefined;
    const formConfig = normalizeJobApplicationFormConfig(rawJobFormConfig);
    const submittedPhone =
      (
        (dto as unknown as { phone?: string }).phone || dto.candidatePhone
      )?.trim() || null;

    if (!currentUser && hasExplicitFormConfig) {
      if (formConfig.phone === "required" && !submittedPhone) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.VALIDATION_ERROR,
          "Phone number is required for this job application.",
        );
      }
      if (formConfig.resume === "required" && !file && !rawResumeUrl) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.VALIDATION_ERROR,
          "Resume / CV file is required for this job application.",
        );
      }
      if (formConfig.coverLetter === "required" && !rawCoverLetter) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.VALIDATION_ERROR,
          "Cover letter is required for this job application.",
        );
      }
      for (const question of formConfig.screeningQuestions) {
        const answer = parsedAnswersMap.get(question.id) ?? null;
        if (question.type === "yes_no") {
          if (answer !== null && typeof answer !== "boolean") {
            throw new AppBadRequestException(
              APP_ERROR_CODES.VALIDATION_ERROR,
              `Invalid yes/no answer for "${question.text}".`,
            );
          }
          if (question.required && typeof answer !== "boolean") {
            throw new AppBadRequestException(
              APP_ERROR_CODES.VALIDATION_ERROR,
              `Screening question "${question.text}" is required.`,
            );
          }
        } else if (question.type === "multiple_choice") {
          const validOptions = new Set(question.options ?? []);
          if (answer !== null && !Array.isArray(answer)) {
            throw new AppBadRequestException(
              APP_ERROR_CODES.VALIDATION_ERROR,
              `Invalid choice list for "${question.text}".`,
            );
          }
          const normalizedArr = Array.isArray(answer)
            ? answer.filter((v) => typeof v === "string" && validOptions.has(v))
            : [];
          if (Array.isArray(answer) && normalizedArr.length !== answer.length) {
            throw new AppBadRequestException(
              APP_ERROR_CODES.VALIDATION_ERROR,
              `Invalid choice option selected for "${question.text}".`,
            );
          }
          if (question.required && normalizedArr.length === 0) {
            throw new AppBadRequestException(
              APP_ERROR_CODES.VALIDATION_ERROR,
              `Screening question "${question.text}" is required.`,
            );
          }
        } else if (question.type === "single_choice") {
          const validOptions = new Set(question.options ?? []);
          const strVal = typeof answer === "string" ? answer.trim() : "";
          if (strVal && !validOptions.has(strVal)) {
            throw new AppBadRequestException(
              APP_ERROR_CODES.VALIDATION_ERROR,
              `Invalid choice option selected for "${question.text}".`,
            );
          }
          if (question.required && !strVal) {
            throw new AppBadRequestException(
              APP_ERROR_CODES.VALIDATION_ERROR,
              `Screening question "${question.text}" is required.`,
            );
          }
        } else if (question.type === "number") {
          const rawStr =
            typeof answer === "number"
              ? String(answer)
              : typeof answer === "string"
                ? answer.trim()
                : "";
          if (rawStr) {
            const parsedNum = Number(rawStr);
            if (!Number.isFinite(parsedNum)) {
              throw new AppBadRequestException(
                APP_ERROR_CODES.VALIDATION_ERROR,
                `Invalid number answer for "${question.text}".`,
              );
            }
          } else if (question.required) {
            throw new AppBadRequestException(
              APP_ERROR_CODES.VALIDATION_ERROR,
              `Screening question "${question.text}" is required.`,
            );
          }
        } else if (question.type === "date") {
          const strVal = typeof answer === "string" ? answer.trim() : "";
          if (strVal && !isValidDateOnlyString(strVal)) {
            throw new AppBadRequestException(
              APP_ERROR_CODES.VALIDATION_ERROR,
              `Invalid date answer for "${question.text}".`,
            );
          }
          if (question.required && !strVal) {
            throw new AppBadRequestException(
              APP_ERROR_CODES.VALIDATION_ERROR,
              `Screening question "${question.text}" is required.`,
            );
          }
        } else if (question.type === "url") {
          const strVal = typeof answer === "string" ? answer.trim() : "";
          if (strVal && !isValidHttpUrl(strVal)) {
            throw new AppBadRequestException(
              APP_ERROR_CODES.VALIDATION_ERROR,
              `Invalid URL answer for "${question.text}".`,
            );
          }
          if (question.required && !strVal) {
            throw new AppBadRequestException(
              APP_ERROR_CODES.VALIDATION_ERROR,
              `Screening question "${question.text}" is required.`,
            );
          }
        } else if (question.type === "file_upload") {
          const qFile = screeningFiles?.get(question.id);
          if (qFile) {
            validateUploadedFile(qFile);
          } else if (question.required) {
            throw new AppBadRequestException(
              APP_ERROR_CODES.VALIDATION_ERROR,
              `Screening question "${question.text}" requires a PDF upload.`,
            );
          }
        } else {
          const strVal = typeof answer === "string" ? answer.trim() : "";
          if (question.required && !strVal) {
            throw new AppBadRequestException(
              APP_ERROR_CODES.VALIDATION_ERROR,
              `Screening question "${question.text}" is required.`,
            );
          }
        }
      }
    }

    const effectiveCoverLetter =
      hasExplicitFormConfig && formConfig.coverLetter === "hidden"
        ? null
        : rawCoverLetter || null;

    // Fast pre-check for duplicate (candidate, job) before uploading CV to MinIO.
    // The in-transaction check + DB unique index remain the authoritative concurrency guard.
    const precheckCandidateId = isAnonymousPublicApply
      ? undefined
      : dto.candidateId;
    const precheckEmail = (
      (dto as unknown as { email?: string }).email || dto.candidateEmail
    )
      ?.trim()
      .toLowerCase();

    if (
      job.organizationId &&
      typeof this.prisma.application?.findFirst === "function"
    ) {
      let existingCandidateId = precheckCandidateId;
      if (
        !existingCandidateId &&
        precheckEmail &&
        typeof this.prisma.candidate?.findFirst === "function"
      ) {
        const matchedCandidate = await this.prisma.candidate.findFirst({
          where: {
            organizationId: job.organizationId,
            email: precheckEmail,
            deletedAt: null,
          },
          select: { id: true },
        });
        existingCandidateId = matchedCandidate?.id;
      }

      if (existingCandidateId) {
        const duplicateApp = await this.prisma.application.findFirst({
          where: {
            candidateId: existingCandidateId,
            jobId: dto.jobId,
          },
          select: { id: true },
        });
        if (duplicateApp) {
          throw new AppConflictException(
            APP_ERROR_CODES.CANDIDATE_ALREADY_APPLIED,
            "Candidate has already applied to this job.",
          );
        }
      }
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

    // Upload per-question PDF attachments to MinIO in the same SAGA upload phase
    const uploadedScreeningObjects: string[] = [];
    const uploadedScreeningAnswers = new Map<string, ScreeningFileAnswer>();
    for (const q of formConfig.screeningQuestions) {
      if (q.type !== "file_upload") continue;
      const qFile = screeningFiles?.get(q.id);
      if (!qFile) continue;
      validateUploadedFile(qFile);
      const uploadedScreening = await this.minioService.uploadFile(
        qFile,
        "screening-files",
        job.organizationId,
      );
      const cleanName = sanitizeFilename(
        fixUtf8String(qFile.originalname || "attachment.pdf"),
      );
      const objKey =
        uploadedScreening.fileName ||
        this.minioService.extractObjectName(uploadedScreening.url);
      if (objKey) {
        uploadedScreeningObjects.push(objKey);
      }
      uploadedScreeningAnswers.set(q.id, {
        url: uploadedScreening.url,
        fileName: cleanName,
        mimeType: uploadedScreening.mimeType || "application/pdf",
        size: uploadedScreening.size ?? qFile.size ?? 0,
      });
    }

    const screeningAnswersSnapshot: ScreeningAnswerItem[] | null =
      formConfig.screeningQuestions.length > 0
        ? formConfig.screeningQuestions.map((q) => {
            if (q.type === "file_upload") {
              return {
                questionId: q.id,
                questionText: q.text,
                questionType: q.type,
                answer: uploadedScreeningAnswers.get(q.id) ?? null,
              };
            }
            const rawVal = parsedAnswersMap.get(q.id);
            let cleanVal: ScreeningAnswerValue = null;
            if (q.type === "number") {
              if (typeof rawVal === "number" && Number.isFinite(rawVal)) {
                cleanVal = rawVal;
              } else if (typeof rawVal === "string" && rawVal.trim()) {
                const parsedNum = Number(rawVal.trim());
                cleanVal = Number.isFinite(parsedNum) ? parsedNum : null;
              }
            } else if (typeof rawVal === "string") {
              cleanVal = rawVal.trim() || null;
            } else if (typeof rawVal === "boolean") {
              cleanVal = rawVal;
            } else if (Array.isArray(rawVal)) {
              const items = rawVal.map((x) => x.trim()).filter(Boolean);
              cleanVal = items.length > 0 ? items : null;
            }
            return {
              questionId: q.id,
              questionText: q.text,
              questionType: q.type,
              answer: cleanVal,
            };
          })
        : null;

    // SAGA Step 2 & 3: Database writes inside atomic transaction with compensating action on failure
    let created!: {
      id: string;
      sourceChannel?: string | null;
      sourceDetails?: string | null;
      utmCampaign?: string | null;
    };
    let trackingLinkId: string | null = null;
    let sourceChannel: SourcingChannel = SourcingChannel.DIRECT;
    let sourceDetails: string | null = null;
    let referrerDomain: string | null = null;
    const baseUtmSource: string | null = rawUtmSource?.trim() || null;
    const baseUtmMedium: string | null = rawUtmMedium?.trim() || null;
    const baseUtmCampaign: string | null = rawUtmCampaign?.trim() || null;
    const baseUtmTerm: string | null = rawUtmTerm?.trim() || null;
    const baseUtmContent: string | null = rawUtmContent?.trim() || null;
    let utmSource: string | null = baseUtmSource;
    let utmMedium: string | null = baseUtmMedium;
    let utmCampaign: string | null = baseUtmCampaign;
    let utmTerm: string | null = baseUtmTerm;
    let utmContent: string | null = baseUtmContent;

    for (let attempt = 0; attempt < 2; attempt++) {
      trackingLinkId = null;
      sourceChannel = SourcingChannel.DIRECT;
      sourceDetails = null;
      referrerDomain = null;
      utmSource = baseUtmSource;
      utmMedium = baseUtmMedium;
      utmCampaign = baseUtmCampaign;
      utmTerm = baseUtmTerm;
      utmContent = baseUtmContent;

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
          let candidateId = isAnonymousPublicApply
            ? undefined
            : dto.candidateId;
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
              const matchesPrimary =
                existingCandidate.resumeUrl === rawResumeUrl;
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
              (!job.organizationId ||
                link.organizationId === job.organizationId)
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
              coverLetter: effectiveCoverLetter,
              ...(screeningAnswersSnapshot
                ? {
                    screeningAnswers:
                      screeningAnswersSnapshot as unknown as Prisma.InputJsonValue,
                  }
                : {}),
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
        break;
      } catch (dbError) {
        if (
          attempt === 0 &&
          isCandidateEmailUniqueViolation(dbError) &&
          (isAnonymousPublicApply || !dto.candidateId)
        ) {
          continue;
        }
        // Step 3: Compensating action — rollback MinIO uploaded files
        if (
          uploadedFileInMinio &&
          (uploadResult.fileName || uploadResult.url)
        ) {
          const objectToDelete =
            uploadResult.fileName ||
            this.minioService.extractObjectName(uploadResult.url);
          await this.compensateMinioObject(objectToDelete, job.organizationId);
        }
        for (const screeningObjectKey of uploadedScreeningObjects) {
          await this.compensateMinioObject(
            screeningObjectKey,
            job.organizationId,
          );
        }
        if ((dbError as { code?: string })?.code === "P2002") {
          throw new AppConflictException(
            APP_ERROR_CODES.CANDIDATE_ALREADY_APPLIED,
            "This candidate has already applied to this job.",
          );
        }
        throw dbError;
      }
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
      await this.aiScoringService?.maybeAutoEnqueueOnApply(orgId, result.id);
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

      const targetCandidateName =
        result.candidateName || result.candidate?.name || "Candidate";
      const targetJobTitle = job.title || result.job?.title || "Job";
      try {
        await this.auditLog?.logOrg(
          orgId,
          currentUser?.id ?? null,
          AUDIT_ACTIONS.APPLICATION_CREATED,
          AUDIT_RESOURCES.APPLICATION,
          {
            jobId: result.jobId,
            candidateId: result.candidate?.id,
            stage: result.stage,
            sourceChannel,
          },
          undefined,
          {
            targetId: result.id,
            targetLabel: `${targetCandidateName} — ${targetJobTitle}`,
          },
        );
      } catch {
        // Fail-open audit logging
      }
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
