import { Inject, Injectable, Optional } from "@nestjs/common";
import {
  APP_ERROR_CODES,
  type EmailFlowKey,
  type EmailTemplateType,
  formatCandidateDisplayName,
  VALID_APPLICATION_STAGE_TRANSITIONS,
} from "@haihire/shared";
import {
  AppBadRequestException,
  AppConflictException,
} from "../../common/app-exception";
import { PrismaService } from "../../prisma/prisma.service";
import { ActivitiesService } from "../../activities/activities.service";
import { EmailService } from "../../email/email.service";
import { buildDynamicEmailContext } from "../../email/variable-registry";
import { UpdateStageDto } from "../dto/update-stage.dto";
import { EventsService } from "../../events/events.service";
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
  ) {
    this.query =
      queryService || new ApplicationsQueryService(prisma, activitiesService);
  }

  async updateStage(
    id: string,
    dto: UpdateStageDto,
    tenantOrgId?: string | null,
    currentUser?: { id?: string; name?: string; role?: string } | null,
  ) {
    const existing = await this.query.findOne(id, tenantOrgId);
    const oldStage = existing.stage;

    // Validate state transition
    if (dto.stage !== oldStage) {
      const allowedNextStages =
        (
          VALID_APPLICATION_STAGE_TRANSITIONS as Record<
            string,
            readonly string[]
          >
        )[oldStage] || [];
      if (!allowedNextStages.includes(dto.stage)) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.APPLICATION_INVALID_STAGE_TRANSITION,
          `Cannot transition application stage from '${oldStage}' to '${dto.stage}'. Valid transitions from '${oldStage}' are: ${allowedNextStages.join(", ") || "none (terminal stage)"}.`,
          { currentStage: oldStage, targetStage: dto.stage },
        );
      }
    }

    const isRejecting = dto.stage === "REJECTED";
    const isReopeningFromRejected =
      oldStage === "REJECTED" && dto.stage !== "REJECTED";
    const trimmedReason =
      typeof dto.rejectionReason === "string"
        ? dto.rejectionReason.trim()
        : undefined;

    const updateResult = await this.prisma.application.updateMany({
      where: {
        id,
        stage: oldStage,
      },
      data: {
        stage: dto.stage,
        ...(dto.orderIndex !== undefined ? { orderIndex: dto.orderIndex } : {}),
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

    if (!updateResult || updateResult.count === 0) {
      throw new AppConflictException(
        APP_ERROR_CODES.APPLICATION_STAGE_CONFLICT,
        `Application stage conflict: the application has been modified by another request. Current stage is no longer '${oldStage}'.`,
        { currentStage: oldStage, targetStage: dto.stage },
      );
    }

    const updated = await this.query.findOne(id, tenantOrgId);

    // Record activity log
    const orgId =
      updated.job?.organizationId || updated.candidate?.organizationId;
    const isOffering = dto.stage === "OFFER";
    if (orgId && updated.candidate && oldStage !== dto.stage) {
      const shouldSendRejectionEmail =
        isRejecting && dto.sendRejectionEmail !== false;
      const shouldSendOfferEmail = isOffering && dto.sendOfferEmail === true;
      const descriptionParts = [
        `Application moved from ${oldStage} to ${dto.stage} for position ${updated.job?.title || ""}`,
      ];
      if (isRejecting && trimmedReason) {
        descriptionParts.push(`Reason: ${trimmedReason}`);
      }

      await this.activitiesService.createActivity({
        organizationId: orgId,
        candidateId: updated.candidate.id,
        applicationId: updated.id,
        type: "STAGE_CHANGED",
        title: `Stage Changed: ${oldStage} → ${dto.stage}`,
        description: descriptionParts.join(" — "),
        actorId: currentUser?.id,
        actorName: currentUser?.name || "HR Team",
        actorRole: currentUser?.role || "ADMIN",
        metadata: {
          fromStage: oldStage,
          toStage: dto.stage,
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
        data: { applicationId: updated.id, stage: dto.stage },
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
      if (oldStage !== dto.stage) {
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
          },
          organization: { name: orgName },
          sender: senderContext,
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
