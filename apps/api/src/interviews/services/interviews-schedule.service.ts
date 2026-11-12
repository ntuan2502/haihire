import { Inject, Injectable, Optional } from "@nestjs/common";
import crypto from "node:crypto";
import {
  APP_ERROR_CODES,
  formatCandidateDisplayName,
  formatInterviewDateTimeInTimezone,
  type NameDisplayOrder,
} from "@haihire/shared";
import {
  AppBadRequestException,
  AppForbiddenException,
  AppNotFoundException,
} from "../../common/app-exception";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateInterviewDto } from "../dto/create-interview.dto";
import { UpdateInterviewDto } from "../dto/update-interview.dto";
import { toInstant } from "../../common/date.util";
import { ActivitiesService } from "../../activities/activities.service";
import { EmailService } from "../../email/email.service";
import { buildDynamicEmailContext } from "../../email/variable-registry";
import { InterviewsQueryService } from "./interviews-query.service";
import { InterviewsScorecardService } from "./interviews-scorecard.service";
import { EventsService } from "../../events/events.service";

export type InterviewType =
  "HR_SCREENING" | "TECHNICAL" | "CULTURE_FIT" | "FINAL_ROUND" | "ASSESSMENT";

export type InterviewFormat = "MEET" | "ZOOM" | "TEAMS" | "OFFICE";

export interface InterviewUpdatePayload {
  scheduledAt?: Date;
  type?: InterviewType;
  format?: InterviewFormat;
  linkOrLocation?: string;
  interviewer?: string;
  round?: number;
  notes?: string | null;
  scorecard?: string | null;
  updatedAt?: Date;
}

@Injectable()
export class InterviewsScheduleService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ActivitiesService)
    private readonly activitiesService: ActivitiesService,
    @Inject(EmailService)
    private readonly emailService: EmailService,
    @Inject(InterviewsQueryService)
    private readonly queryService: InterviewsQueryService,
    @Inject(InterviewsScorecardService)
    private readonly scorecardService: InterviewsScorecardService,
    @Optional()
    @Inject(EventsService)
    private readonly eventsService?: EventsService,
  ) {}

  async create(dto: CreateInterviewDto, organizationId?: string | null) {
    const app = await this.prisma.application.findFirst({
      where: { id: dto.applicationId },
    });
    if (!app) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.INTERVIEW_APP_NOT_FOUND,
        `Application with ID ${dto.applicationId} not found`,
        { applicationId: dto.applicationId, id: dto.applicationId },
      );
    }

    if (app.stage === "REJECTED") {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        "Cannot schedule an interview for a rejected application.",
      );
    }

    const candidate = app.candidateId
      ? await this.prisma.candidate.findFirst({
          where: { id: app.candidateId },
        })
      : null;
    const job = app.jobId
      ? await this.prisma.job.findFirst({
          where: { id: app.jobId },
        })
      : null;
    const orgId = candidate?.organizationId || job?.organizationId;

    if (organizationId && orgId && orgId !== organizationId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.APPLICATION_INVALID_ORGANIZATION,
        "Access denied: application belongs to another organization.",
        { applicationId: dto.applicationId, organizationId },
      );
    }

    const id = crypto.randomUUID();
    const scorecardStr = this.scorecardService.serializeScorecard(
      dto.scorecard,
    );

    const parsedScheduledAt = new Date(dto.scheduledAt);
    if (isNaN(parsedScheduledAt.getTime())) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        "Invalid scheduledAt timestamp.",
      );
    }
    const scheduledInstant = toInstant(parsedScheduledAt);

    await this.prisma.interview.create({
      data: {
        id,
        applicationId: dto.applicationId,
        scheduledAt: scheduledInstant,
        type: dto.type as InterviewType,
        format: (dto.format as InterviewFormat) || "MEET",
        linkOrLocation: dto.linkOrLocation || "",
        interviewer: dto.interviewer,
        round: dto.round || 1,
        scorecard: scorecardStr,
        notes: dto.notes || null,
        updatedAt: toInstant(),
      },
    });

    if (
      app.stage !== "INTERVIEW" &&
      app.stage !== "OFFER" &&
      app.stage !== "HIRED"
    ) {
      const previousStage = app.stage;
      await this.prisma.application.update({
        where: { id: app.id },
        data: {
          stage: "INTERVIEW",
        },
      });

      if (candidate && orgId) {
        await this.activitiesService.createActivity({
          organizationId: orgId,
          candidateId: candidate.id,
          applicationId: app.id,
          type: "STAGE_CHANGED",
          title: "Stage Changed",
          description: `Stage updated from ${previousStage} to INTERVIEW automatically upon scheduling interview round ${dto.round || 1}.`,
          actorName: dto.interviewer || "System",
          actorRole: "SYSTEM",
          metadata: {
            fromStage: previousStage,
            toStage: "INTERVIEW",
            interviewId: id,
          },
        });
      }
    }

    const createdInterview = await this.queryService.findOne(id);

    // Record activity log & optionally send interview invitation email
    if (candidate && orgId) {
      const orgSettings = this.prisma.organization?.findFirst
        ? await this.prisma.organization.findFirst({
            where: { id: orgId },
            select: {
              name: true,
              timezone: true,
              dateFormat: true,
              timeFormat: true,
              nameDisplayOrder: true,
            },
          })
        : null;
      const orgOrder: NameDisplayOrder =
        orgSettings?.nameDisplayOrder === "LAST_FIRST"
          ? "LAST_FIRST"
          : "FIRST_LAST";
      const resolvedCandidateName = formatCandidateDisplayName(
        candidate,
        orgOrder,
      );
      const formattedEmailDt = formatInterviewDateTimeInTimezone(
        scheduledInstant,
        orgSettings ?? undefined,
      );

      await this.activitiesService.createActivity({
        organizationId: orgId,
        candidateId: candidate.id,
        applicationId: app.id,
        type: "INTERVIEW_SCHEDULED",
        title: `Interview Scheduled (${dto.type})`,
        description: `Round ${dto.round || 1} interview on ${formattedEmailDt.date} at ${formattedEmailDt.time} with ${dto.interviewer}`,
        actorName: dto.interviewer,
        actorRole: "INTERVIEWER",
        metadata: {
          interviewId: id,
          scheduledAt: scheduledInstant.toISOString(),
          format: dto.format || "MEET",
          type: dto.type,
          interviewer: dto.interviewer,
          round: dto.round || 1,
        },
      });

      if (dto.sendInvitationEmail && candidate.email) {
        try {
          const template =
            typeof this.emailService.resolveFlowTemplate === "function"
              ? await this.emailService.resolveFlowTemplate(
                  orgId,
                  "INTERVIEW_SCHEDULED",
                  dto.templateId,
                )
              : await this.emailService.getTemplateByType(
                  orgId,
                  "INTERVIEW_INVITATION",
                );
          if (template && template.enabled) {
            const orgName = orgSettings?.name || "Company";

            await this.emailService.sendEmail(
              {
                to: candidate.email,
                recipientName: resolvedCandidateName,
                subject: template.subject,
                body: template.body,
                templateType: template.type || "INTERVIEW_INVITATION",
                templateId: template.id,
                templateName: template.name,
                candidateId: candidate.id,
                applicationId: app.id,
                variables: buildDynamicEmailContext({
                  candidate: {
                    name: resolvedCandidateName,
                    email: candidate.email,
                    phone: candidate.phone,
                  },
                  job: {
                    title: job?.title || "Vị trí tuyển dụng",
                    department: job?.department || "",
                    location: job?.location || "",
                  },
                  organization: { name: orgName },
                  interview: {
                    date: formattedEmailDt.date,
                    time: formattedEmailDt.time,
                    format: dto.format || "Google Meet",
                    linkOrLocation:
                      dto.linkOrLocation || "https://meet.google.com",
                    interviewer: dto.interviewer,
                  },
                  sender: { name: dto.interviewer },
                }),
              },
              orgId,
              { name: dto.interviewer },
            );
          }
        } catch (emailErr) {
          console.warn(
            "Failed to send auto interview invitation email:",
            emailErr,
          );
        }
      }
    }

    if (orgId) {
      this.eventsService?.emit({
        type: "INTERVIEWS_CHANGED",
        organizationId: orgId,
        data: { interviewId: id, applicationId: dto.applicationId },
      });
      this.eventsService?.emit({
        type: "APPLICATIONS_CHANGED",
        organizationId: orgId,
        data: { applicationId: dto.applicationId },
      });
      this.eventsService?.emit({
        type: "ACTIVITIES_CHANGED",
        organizationId: orgId,
        data: { candidateId: candidate?.id, applicationId: dto.applicationId },
      });
    }

    return createdInterview;
  }

  async update(
    id: string,
    dto: UpdateInterviewDto,
    tenantOrgId?: string | null,
  ) {
    await this.queryService.findOne(id, tenantOrgId);

    const updateData: InterviewUpdatePayload = {};
    if (dto.scheduledAt !== undefined) {
      const parsed = new Date(dto.scheduledAt);
      if (isNaN(parsed.getTime())) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.VALIDATION_ERROR,
          "Invalid scheduledAt timestamp.",
        );
      }
      updateData.scheduledAt = toInstant(parsed);
    }

    if (dto.type !== undefined) updateData.type = dto.type as InterviewType;
    if (dto.format !== undefined)
      updateData.format = dto.format as InterviewFormat;
    if (dto.linkOrLocation !== undefined)
      updateData.linkOrLocation = dto.linkOrLocation;
    if (dto.interviewer !== undefined) updateData.interviewer = dto.interviewer;
    if (dto.round !== undefined) updateData.round = dto.round;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.scorecard !== undefined) {
      updateData.scorecard = this.scorecardService.serializeScorecard(
        dto.scorecard,
      );
    }
    updateData.updatedAt = toInstant();

    await this.prisma.interview.update({
      where: { id },
      data: updateData,
    });
    const updated = await this.queryService.findOne(id, tenantOrgId);

    const candidate = updated.application?.candidate;
    if (candidate && candidate.organizationId) {
      const isScorecardUpdate = dto.scorecard !== undefined;
      const orgSettings = this.prisma.organization?.findFirst
        ? await this.prisma.organization.findFirst({
            where: { id: candidate.organizationId },
            select: {
              timezone: true,
              dateFormat: true,
              timeFormat: true,
            },
          })
        : null;
      const formattedUpdateDt = formatInterviewDateTimeInTimezone(
        updated.scheduledAt,
        orgSettings ?? undefined,
      );
      await this.activitiesService.createActivity({
        organizationId: candidate.organizationId,
        candidateId: candidate.id,
        applicationId: updated.applicationId,
        type: isScorecardUpdate ? "SCORECARD_SUBMITTED" : "INTERVIEW_UPDATED",
        title: isScorecardUpdate
          ? `Scorecard Submitted (${updated.type})`
          : `Interview Updated (${updated.type})`,
        description: isScorecardUpdate
          ? `Scorecard submitted by ${updated.interviewer}`
          : `Interview schedule updated to ${formattedUpdateDt.time} on ${formattedUpdateDt.date}`,
        actorName: updated.interviewer,
        actorRole: "INTERVIEWER",
        metadata: {
          interviewId: id,
          type: updated.type,
          interviewer: updated.interviewer,
          scheduledAt: updated.scheduledAt,
          changes: Object.keys(updateData),
        },
      });
    }

    const updateOrgId = candidate?.organizationId || tenantOrgId;
    if (updateOrgId) {
      this.eventsService?.emit({
        type: "INTERVIEWS_CHANGED",
        organizationId: updateOrgId,
        data: { interviewId: id, applicationId: updated.applicationId },
      });
      this.eventsService?.emit({
        type: "APPLICATIONS_CHANGED",
        organizationId: updateOrgId,
        data: { applicationId: updated.applicationId },
      });
      if (candidate) {
        this.eventsService?.emit({
          type: "ACTIVITIES_CHANGED",
          organizationId: updateOrgId,
          data: {
            candidateId: candidate.id,
            applicationId: updated.applicationId,
          },
        });
      }
    }

    return updated;
  }

  async remove(id: string, tenantOrgId?: string | null) {
    const existing = await this.queryService.findOne(id, tenantOrgId);
    await this.prisma.interview.delete({
      where: { id },
    });
    const orgId =
      existing.application?.candidate?.organizationId || tenantOrgId;
    if (orgId) {
      this.eventsService?.emit({
        type: "INTERVIEWS_CHANGED",
        organizationId: orgId,
        data: { interviewId: id, applicationId: existing.applicationId },
      });
      this.eventsService?.emit({
        type: "APPLICATIONS_CHANGED",
        organizationId: orgId,
        data: { applicationId: existing.applicationId },
      });
    }
    return { success: true, message: `Interview ${id} deleted successfully` };
  }
}
