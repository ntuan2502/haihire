import { Inject, Injectable } from "@nestjs/common";
import crypto from "node:crypto";
import { APP_ERROR_CODES } from "@haihire/shared";
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

export type InterviewType =
  "HR_SCREENING" | "TECHNICAL" | "CULTURE_FIT" | "FINAL_ROUND" | "ASSESSMENT";

export type InterviewFormat = "MEET" | "ZOOM" | "TEAMS" | "OFFICE";

export interface InterviewUpdatePayload {
  scheduledAt?: Temporal.Instant;
  type?: InterviewType;
  format?: InterviewFormat;
  linkOrLocation?: string;
  interviewer?: string;
  round?: number;
  notes?: string | null;
  scorecard?: string | null;
  updatedAt?: Temporal.Instant;
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
  ) {}

  async create(dto: CreateInterviewDto, organizationId?: string | null) {
    const app = await this.prisma.db.orm.public.Application.where((a) =>
      a.id.eq(dto.applicationId),
    ).first();
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
        "Cannot schedule an interview for a rejected application. Reopen the application before scheduling.",
      );
    }

    const candidate = app.candidateId
      ? await this.prisma.db.orm.public.Candidate.where((c) =>
          c.id.eq(app.candidateId),
        ).first()
      : null;
    const job = app.jobId
      ? await this.prisma.db.orm.public.Job.where((j) =>
          j.id.eq(app.jobId),
        ).first()
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

    let scheduledInstant: Temporal.Instant;
    if (dto.scheduledAt) {
      const parsed = new Date(dto.scheduledAt);
      scheduledInstant = toInstant(
        !isNaN(parsed.getTime()) ? parsed : Date.now(),
      );
    } else {
      const rawDate = dto.date || new Date().toISOString().split("T")[0];
      const rawTime =
        dto.time && dto.time.length === 5
          ? `${dto.time}:00`
          : dto.time || "00:00:00";
      const parsed = new Date(`${rawDate}T${rawTime}Z`);
      scheduledInstant = toInstant(
        !isNaN(parsed.getTime()) ? parsed : Date.now(),
      );
    }

    await this.prisma.db.orm.public.Interview.create({
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
    });

    if (
      app.stage !== "INTERVIEW" &&
      app.stage !== "OFFER" &&
      app.stage !== "HIRED"
    ) {
      await this.prisma.db.orm.public.Application.where((a) =>
        a.id.eq(app.id),
      ).update({
        stage: "INTERVIEW",
      });
    }

    const createdInterview = await this.queryService.findOne(id);

    // Record activity log & optionally send interview invitation email
    if (candidate && orgId) {
      await this.activitiesService.createActivity({
        organizationId: orgId,
        candidateId: candidate.id,
        applicationId: app.id,
        type: "INTERVIEW_SCHEDULED",
        title: `Interview Scheduled (${dto.type})`,
        description: `Round ${dto.round || 1} interview on ${dto.date} at ${dto.time} with ${dto.interviewer}`,
        actorName: dto.interviewer,
        actorRole: "INTERVIEWER",
        metadata: {
          interviewId: id,
          date: dto.date,
          time: dto.time,
          format: dto.format || "MEET",
          type: dto.type,
          interviewer: dto.interviewer,
          round: dto.round || 1,
        },
      });

      if (dto.sendInvitationEmail && candidate.email) {
        try {
          const template = await this.emailService.getTemplateByType(
            orgId,
            "INTERVIEW_INVITATION",
          );
          if (template && template.enabled) {
            let orgName = "Company";
            const org = await this.prisma.db.orm.public.Organization.select(
              "name",
            )
              .where((o) => o.id.eq(orgId))
              .first();
            if (org?.name) {
              orgName = org.name;
            }

            await this.emailService.sendEmail(
              {
                to: candidate.email,
                recipientName: candidate.name,
                subject: template.subject,
                body: template.body,
                templateType: "INTERVIEW_INVITATION",
                candidateId: candidate.id,
                applicationId: app.id,
                variables: buildDynamicEmailContext({
                  candidate: {
                    name: candidate.name,
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
                    date: dto.date,
                    time: dto.time,
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

    return createdInterview;
  }

  async update(
    id: string,
    dto: UpdateInterviewDto,
    tenantOrgId?: string | null,
  ) {
    const existing = await this.queryService.findOne(id, tenantOrgId);

    const updateData: InterviewUpdatePayload = {};
    if (dto.scheduledAt !== undefined) {
      const parsed = new Date(dto.scheduledAt);
      updateData.scheduledAt = toInstant(
        !isNaN(parsed.getTime()) ? parsed : Date.now(),
      );
    } else if (dto.date !== undefined || dto.time !== undefined) {
      const newDate = dto.date !== undefined ? dto.date : existing.date;
      const rawTime = dto.time !== undefined ? dto.time : existing.time;
      const newTime =
        rawTime && rawTime.length === 5
          ? `${rawTime}:00`
          : rawTime || "00:00:00";
      const parsed = new Date(`${newDate}T${newTime}Z`);
      updateData.scheduledAt = toInstant(
        !isNaN(parsed.getTime()) ? parsed : Date.now(),
      );
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

    await this.prisma.db.orm.public.Interview.where((i) => i.id.eq(id)).update(
      updateData,
    );
    const updated = await this.queryService.findOne(id, tenantOrgId);

    const candidate = updated.application?.candidate;
    if (candidate && candidate.organizationId) {
      const isScorecardUpdate = dto.scorecard !== undefined;
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
          : `Interview schedule updated to ${updated.time} on ${updated.date}`,
        actorName: updated.interviewer,
        actorRole: "INTERVIEWER",
        metadata: {
          interviewId: id,
          type: updated.type,
          interviewer: updated.interviewer,
          date: updated.date,
          time: updated.time,
          changes: Object.keys(updateData),
        },
      });
    }

    return updated;
  }

  async remove(id: string, tenantOrgId?: string | null) {
    await this.queryService.findOne(id, tenantOrgId);
    await this.prisma.db.orm.public.Interview.where((i) =>
      i.id.eq(id),
    ).delete();
    return { success: true, message: `Interview ${id} deleted successfully` };
  }
}
