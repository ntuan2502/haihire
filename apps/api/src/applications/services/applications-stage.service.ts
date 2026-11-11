import { Inject, Injectable, Optional } from "@nestjs/common";
import {
  APP_ERROR_CODES,
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
    if (orgId && updated.candidate && oldStage !== dto.stage) {
      const shouldSendRejectionEmail =
        isRejecting && dto.sendRejectionEmail !== false;
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
          jobTitle: updated.job?.title || "",
          actorName: currentUser?.name || "HR Team",
          actorRole: currentUser?.role || "ADMIN",
        },
      });

      // Only dispatch automated rejection email if explicitly enabled
      if (shouldSendRejectionEmail && updated.candidate.email) {
        try {
          const template = await this.emailService.getTemplateByType(
            orgId,
            "REJECTION",
          );
          if (template && template.enabled) {
            let orgName = "Company";
            const org = await this.prisma.organization.findFirst({
              where: { id: orgId },
              select: { name: true },
            });
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
}
