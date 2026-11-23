import { Inject, Injectable, Optional } from "@nestjs/common";
import {
  APP_ERROR_CODES,
  type EmailFlowKey,
  type EmailTemplateType,
  formatCandidateDisplayName,
  hasPermission,
  type Role,
  VALID_APPLICATION_STAGE_TRANSITIONS,
} from "@haihire/shared";
import {
  AppBadRequestException,
  AppConflictException,
} from "../../common/app-exception";
import { PrismaService, runInTransaction } from "../../prisma/prisma.service";
import { ActivitiesService } from "../../activities/activities.service";
import { EmailService } from "../../email/email.service";
import { buildDynamicEmailContext } from "../../email/variable-registry";
import { UpdateStageDto } from "../dto/update-stage.dto";
import { EventsService } from "../../events/events.service";
import { PermissionResolverService } from "../../auth/permission-resolver.service";
import { ApplicationsQueryService } from "./applications-query.service";

@Injectable()
export class ApplicationsStageService {
  private readonly query: ApplicationsQueryService;

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ActivitiesService)
    private readonly activitiesService: ActivitiesService,
    @Inject(EmailService)
    private readonly emailService: EmailService,
    @Optional()
    @Inject(ApplicationsQueryService)
    queryService?: ApplicationsQueryService,
    @Optional()
    @Inject(EventsService)
    private readonly eventsService?: EventsService,
    @Optional()
    @Inject(PermissionResolverService)
    private readonly permissionResolver?: PermissionResolverService,
  ) {
    this.query =
      queryService || new ApplicationsQueryService(prisma, activitiesService);
  }

  async updateStage(
    id: string,
    dto: UpdateStageDto,
    tenantOrgId?: string | null,
    currentUser?: {
      id?: string;
      name?: string;
      role?: string;
      isOwner?: boolean;
    } | null,
  ) {
    const existing = await this.query.findOne(id, tenantOrgId);
    const oldStage = existing.stage;
    const effectiveOrgId = tenantOrgId || existing.organizationId;

    const targetPipelineStage = dto.stageId
      ? await this.prisma.pipelineStage.findFirst({
          where: {
            id: dto.stageId,
            organizationId: effectiveOrgId,
            jobId: existing.jobId,
          },
        })
      : null;

    if (dto.stageId && !targetPipelineStage) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        "Target pipeline stage does not belong to this job or organization.",
        { stageId: dto.stageId, jobId: existing.jobId },
      );
    }

    const nextStage = targetPipelineStage?.category ?? dto.stage;
    if (!nextStage) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        "Target stage or stageId is required.",
      );
    }

    // Validate state transition
    if (nextStage !== oldStage) {
      const allowedNextStages =
        (
          VALID_APPLICATION_STAGE_TRANSITIONS as Record<
            string,
            readonly string[]
          >
        )[oldStage] || [];
      if (!allowedNextStages.includes(nextStage)) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.APPLICATION_INVALID_STAGE_TRANSITION,
          `Cannot transition application stage from '${oldStage}' to '${nextStage}'. Valid transitions from '${oldStage}' are: ${allowedNextStages.join(", ") || "none (terminal stage)"}.`,
          { currentStage: oldStage, targetStage: nextStage },
        );
      }
    }

    const isRejecting = nextStage === "REJECTED";
    const isReopeningFromRejected =
      oldStage === "REJECTED" && nextStage !== "REJECTED";
    const trimmedReason =
      typeof dto.rejectionReason === "string"
        ? dto.rejectionReason.trim()
        : undefined;

    let resolvedPipelineStage = targetPipelineStage;
    if (
      !resolvedPipelineStage &&
      typeof (
        this.prisma as unknown as {
          pipelineStage?: {
            findFirst?: (
              args: unknown,
            ) => Promise<{ id: string; name?: string } | null>;
          };
        }
      ).pipelineStage?.findFirst === "function"
    ) {
      resolvedPipelineStage = await this.prisma.pipelineStage.findFirst({
        where: {
          organizationId: effectiveOrgId,
          jobId: existing.jobId,
          category: nextStage,
        },
      });
    }

    const updateResult = await runInTransaction(this.prisma, async (tx) => {
      const res = await tx.application.updateMany({
        where: {
          id,
          stage: oldStage,
          ...(dto.version !== undefined ? { version: dto.version } : {}),
          ...(tenantOrgId && existing.organizationId
            ? { organizationId: tenantOrgId }
            : {}),
        },
        data: {
          stage: nextStage,
          ...(resolvedPipelineStage
            ? { stageId: resolvedPipelineStage.id }
            : {}),
          version: { increment: 1 },
          ...(dto.orderIndex !== undefined
            ? { orderIndex: dto.orderIndex }
            : {}),
          ...(isRejecting
            ? {
                rejectionReason: trimmedReason || null,
                rejectedAt: new Date(),
              }
            : {}),
          ...(isReopeningFromRejected
            ? {
                rejectionReason: null,
                rejectedAt: null,
              }
            : {}),
        },
      });

      if (!res || res.count === 0) {
        return res;
      }

      if (
        effectiveOrgId &&
        typeof (
          tx as unknown as {
            outboxEvent?: { create?: (args: unknown) => Promise<unknown> };
          }
        ).outboxEvent?.create === "function"
      ) {
        await (
          tx as unknown as {
            outboxEvent: { create: (args: unknown) => Promise<unknown> };
          }
        ).outboxEvent.create({
          data: {
            organizationId: effectiveOrgId,
            eventType: "APPLICATION_STAGE_CHANGED",
            aggregateType: "Application",
            aggregateId: id,
            payload: {
              applicationId: id,
              previousStage: oldStage,
              nextStage,
              stageId: resolvedPipelineStage?.id ?? null,
            },
          },
        });
      }

      return res;
    });

    if (!updateResult || updateResult.count === 0) {
      throw new AppConflictException(
        APP_ERROR_CODES.APPLICATION_STAGE_CONFLICT,
        `Application stage conflict: the application has been modified by another request. Current stage is no longer '${oldStage}'.`,
        { currentStage: oldStage, targetStage: nextStage },
      );
    }

    const updated = await this.query.findOne(id, tenantOrgId);

    // Record activity log
    const orgId =
      updated.job?.organizationId || updated.candidate?.organizationId;
    const isOffering = nextStage === "OFFER";
    if (
      orgId &&
      updated.candidate &&
      (oldStage !== nextStage || Boolean(resolvedPipelineStage))
    ) {
      const callerCanSendEmail =
        !currentUser?.role ||
        currentUser.isOwner ||
        currentUser.role === "ADMIN" ||
        (this.permissionResolver
          ? await this.permissionResolver.resolvePermission(
              orgId,
              currentUser.role as Role,
              "email:send",
            )
          : hasPermission(currentUser.role as Role, "email:send"));
      const shouldSendRejectionEmail =
        callerCanSendEmail && isRejecting && dto.sendRejectionEmail === true;
      const shouldSendOfferEmail =
        callerCanSendEmail && isOffering && dto.sendOfferEmail === true;
      const descriptionParts = [
        `Application moved from ${oldStage} to ${resolvedPipelineStage?.name || nextStage} for position ${updated.job?.title || ""}`,
      ];
      if (isRejecting && trimmedReason) {
        descriptionParts.push(`Reason: ${trimmedReason}`);
      }

      await this.activitiesService.createActivity({
        organizationId: orgId,
        candidateId: updated.candidate.id,
        applicationId: updated.id,
        type: "STAGE_CHANGED",
        title: `Stage Changed: ${oldStage} → ${resolvedPipelineStage?.name || nextStage}`,
        description: descriptionParts.join(" — "),
        actorId: currentUser?.id,
        actorName: currentUser?.name || "HR Team",
        actorRole: currentUser?.role || "ADMIN",
        metadata: {
          fromStage: oldStage,
          toStage: nextStage,
          stageId: resolvedPipelineStage?.id,
          stageName: resolvedPipelineStage?.name,
          reopened: isReopeningFromRejected || undefined,
          rejectionReason:
            isRejecting && trimmedReason ? trimmedReason : undefined,
          sendRejectionEmail: isRejecting
            ? shouldSendRejectionEmail
            : undefined,
          sendOfferEmail: isOffering ? shouldSendOfferEmail : undefined,
          emailTemplateId: dto.emailTemplateId || undefined,
          jobTitle: updated.job?.title || "",
          actorName: currentUser?.name || "HR Team",
          actorRole: currentUser?.role || "ADMIN",
        },
      });

      if (shouldSendRejectionEmail && updated.candidate.email) {
        await this.dispatchStageEmail({
          orgId,
          flowKey: "APPLICATION_REJECTED",
          legacyType: "REJECTION",
          overrideTemplateId: dto.emailTemplateId,
          updated,
          currentUser,
        });
      } else if (shouldSendOfferEmail && updated.candidate.email) {
        await this.dispatchStageEmail({
          orgId,
          flowKey: "APPLICATION_OFFER",
          legacyType: "OFFER",
          overrideTemplateId: dto.emailTemplateId,
          updated,
          currentUser,
        });
      }
    }

    if (orgId) {
      this.eventsService?.emit({
        type: "APPLICATIONS_CHANGED",
        organizationId: orgId,
        data: { applicationId: updated.id, stage: updated.stage },
      });
      this.eventsService?.emit({
        type: "JOBS_CHANGED",
        organizationId: orgId,
        data: { jobId: updated.jobId },
      });
      this.eventsService?.emit({
        type: "SOURCING_CHANGED",
        organizationId: orgId,
        data: { applicationId: updated.id },
      });
      if (oldStage !== updated.stage) {
        this.eventsService?.emit({
          type: "ACTIVITIES_CHANGED",
          organizationId: orgId,
          data: {
            candidateId: updated.candidate?.id,
            applicationId: updated.id,
          },
        });
      }
    }

    return updated;
  }

  private async dispatchStageEmail(params: {
    orgId: string;
    flowKey: EmailFlowKey;
    legacyType: EmailTemplateType;
    overrideTemplateId?: string;
    updated: Awaited<ReturnType<ApplicationsQueryService["findOne"]>>;
    currentUser?: { id?: string; name?: string; role?: string } | null;
  }): Promise<void> {
    const {
      orgId,
      flowKey,
      legacyType,
      overrideTemplateId,
      updated,
      currentUser,
    } = params;
    const candidate = updated.candidate;
    if (!candidate?.email) {
      return;
    }

    try {
      const template =
        typeof this.emailService.resolveFlowTemplate === "function"
          ? await this.emailService.resolveFlowTemplate(
              orgId,
              flowKey,
              overrideTemplateId,
            )
          : await this.emailService.getTemplateByType(orgId, legacyType);
      if (!template || !template.enabled) {
        return;
      }

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
        candidate,
        orgOrder,
      );
      const senderContext = currentUser?.name
        ? { name: currentUser.name }
        : undefined;
      const senderUser =
        currentUser?.id || currentUser?.name
          ? { id: currentUser.id, name: currentUser.name }
          : undefined;

      const jobMeta = updated.job as
        | {
            salaryRange?: string | null;
            salaryMin?: number | null;
            salaryMax?: number | null;
            salaryCurrency?: string | null;
          }
        | null
        | undefined;
      const jobSalaryRange =
        jobMeta?.salaryRange?.trim() ||
        (jobMeta?.salaryMin != null && jobMeta?.salaryMax != null
          ? `${jobMeta.salaryMin.toLocaleString("en-US")} - ${jobMeta.salaryMax.toLocaleString("en-US")}${jobMeta.salaryCurrency ? ` ${jobMeta.salaryCurrency}` : ""}`
          : jobMeta?.salaryMin != null
            ? `${jobMeta.salaryMin.toLocaleString("en-US")}${jobMeta.salaryCurrency ? ` ${jobMeta.salaryCurrency}` : ""}`
            : jobMeta?.salaryMax != null
              ? `${jobMeta.salaryMax.toLocaleString("en-US")}${jobMeta.salaryCurrency ? ` ${jobMeta.salaryCurrency}` : ""}`
              : "");

      const payload = {
        to: candidate.email,
        recipientName: resolvedCandidateName,
        subject: template.subject,
        body: template.body,
        templateType: template.type || legacyType,
        templateId: template.id,
        templateName: template.name,
        candidateId: candidate.id,
        applicationId: updated.id,
        variables: buildDynamicEmailContext({
          candidate: {
            name: resolvedCandidateName,
            email: candidate.email,
            phone: candidate.phone,
          },
          job: {
            title: updated.job?.title || "Vị trí tuyển dụng",
            department: updated.job?.department || "",
            location: updated.job?.location || "",
            salaryRange: jobSalaryRange || undefined,
          },
          organization: { name: orgName },
          sender: senderContext,
          custom: jobSalaryRange ? { salary: jobSalaryRange } : undefined,
        }),
      };

      if (senderUser) {
        await this.emailService.sendEmail(payload, orgId, senderUser);
      } else {
        await this.emailService.sendEmail(payload, orgId);
      }
    } catch (emailErr) {
      console.warn(`Failed to send ${flowKey} email:`, emailErr);
    }
  }
}
