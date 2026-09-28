import {
  Inject,
  Injectable,
} from "@nestjs/common";
import { APP_ERROR_CODES } from "@haihire/shared";
import { AppNotFoundException } from "../common/app-exception";
import crypto from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { CreateInterviewDto } from "./dto/create-interview.dto";
import { UpdateInterviewDto } from "./dto/update-interview.dto";
import { fixUtf8String } from "../applications/applications.service";
import { toTimestamp } from "../common/date.util";

import { ActivitiesService } from "../activities/activities.service";
import { EmailService } from "../email/email.service";
import { buildDynamicEmailContext } from "../email/variable-registry";

export type InterviewType =
  | "HR_SCREENING"
  | "TECHNICAL"
  | "CULTURE_FIT"
  | "FINAL_ROUND"
  | "ASSESSMENT";

export type InterviewFormat = "MEET" | "ZOOM" | "TEAMS" | "OFFICE";

export interface InterviewUpdatePayload {
  date?: string;
  time?: string;
  type?: InterviewType;
  format?: InterviewFormat;
  linkOrLocation?: string;
  interviewer?: string;
  round?: number;
  notes?: string | null;
  scorecard?: string | null;
}

@Injectable()
export class InterviewsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ActivitiesService)
    private readonly activitiesService: ActivitiesService,
    @Inject(EmailService)
    private readonly emailService: EmailService,
  ) {}

  async findAll(options?: {
    organizationId?: string;
    jobId?: string;
    applicationId?: string;
    page?: number;
    limit?: number;
    search?: string;
    tab?: string;
    sortBy?: string;
  }) {
    type InterviewRecord = Awaited<ReturnType<typeof this.prisma.db.orm.public.Interview.all>>[number];
    type AppRecord = Awaited<ReturnType<typeof this.prisma.db.orm.public.Application.all>>[number];
    type CandidateRecord = Awaited<ReturnType<typeof this.prisma.db.orm.public.Candidate.all>>[number];
    type JobRecord = Awaited<ReturnType<typeof this.prisma.db.orm.public.Job.all>>[number];

    const defaultLimit = options?.limit && options.limit > 0 ? options.limit : 20;
    const defaultPage = options?.page && options.page > 0 ? options.page : 1;

    let interviews: InterviewRecord[] = [];
    const appsMap = new Map<string, AppRecord>();

    if (options?.applicationId) {
      interviews = await this.prisma.db.orm.public.Interview
        .where((i) => i.applicationId.eq(options.applicationId!))
        .all();
    } else if (options?.jobId) {
      const targetApps = await this.prisma.db.orm.public.Application.select(
        "id",
        "candidateId",
        "jobId",
        "stage",
        "matchScore",
        "notes",
      )
        .where((a) => a.jobId.eq(options.jobId!))
        .all();

      if (targetApps.length === 0) {
        return {
          data: [],
          total: 0,
          page: defaultPage,
          limit: defaultLimit,
          totalPages: 0,
        };
      }
      for (const a of targetApps) {
        appsMap.set(a.id, a as unknown as AppRecord);
      }
      const appIds = targetApps.map((a) => a.id);
      interviews = await this.prisma.db.orm.public.Interview
        .where((i) => i.applicationId.in(appIds))
        .all();
    } else if (options?.organizationId) {
      const orgCandidates = await this.prisma.db.orm.public.Candidate.select("id")
        .where((c) => c.organizationId.eq(options.organizationId!))
        .all();

      if (orgCandidates.length === 0) {
        return {
          data: [],
          total: 0,
          page: defaultPage,
          limit: defaultLimit,
          totalPages: 0,
        };
      }
      const candidateIds = orgCandidates.map((c) => c.id);

      const targetApps = await this.prisma.db.orm.public.Application.select(
        "id",
        "candidateId",
        "jobId",
        "stage",
        "matchScore",
        "notes",
      )
        .where((a) => a.candidateId.in(candidateIds))
        .all();

      if (targetApps.length === 0) {
        return {
          data: [],
          total: 0,
          page: defaultPage,
          limit: defaultLimit,
          totalPages: 0,
        };
      }
      for (const a of targetApps) {
        appsMap.set(a.id, a as unknown as AppRecord);
      }
      const appIds = targetApps.map((a) => a.id);
      interviews = await this.prisma.db.orm.public.Interview
        .where((i) => i.applicationId.in(appIds))
        .all();
    } else {
      interviews = await this.prisma.db.orm.public.Interview.all();
    }

    const neededAppIds = [...new Set(interviews.map((i) => i.applicationId))].filter(
      (id) => !appsMap.has(id),
    );
    if (neededAppIds.length > 0) {
      const fetchedApps = await this.prisma.db.orm.public.Application.select(
        "id",
        "candidateId",
        "jobId",
        "stage",
        "matchScore",
        "notes",
      )
        .where((a) => a.id.in(neededAppIds))
        .all();
      for (const a of fetchedApps) {
        appsMap.set(a.id, a as unknown as AppRecord);
      }
    }

    const candidateIds = [...new Set(Array.from(appsMap.values()).map((a) => a.candidateId))];
    const candidatesMap = new Map<string, CandidateRecord>();
    if (candidateIds.length > 0) {
      const candidates = await this.prisma.db.orm.public.Candidate.select(
        "id",
        "name",
        "firstName",
        "lastName",
        "email",
        "phone",
        "organizationId",
      )
        .where((c) => c.id.in(candidateIds))
        .all();
      for (const c of candidates) {
        candidatesMap.set(c.id, c as unknown as CandidateRecord);
      }
    }

    const jobIds = [...new Set(Array.from(appsMap.values()).map((a) => a.jobId))];
    const jobsMap = new Map<string, JobRecord>();
    if (jobIds.length > 0) {
      const jobs = await this.prisma.db.orm.public.Job.select(
        "id",
        "title",
        "department",
        "organizationId",
      )
        .where((j) => j.id.in(jobIds))
        .all();
      for (const j of jobs) {
        jobsMap.set(j.id, j as unknown as JobRecord);
      }
    }

    // Group interviews by applicationId so each candidate appears once with all interview rounds
    const interviewsByApp = new Map<string, typeof interviews>();
    for (const intv of interviews) {
      const list = interviewsByApp.get(intv.applicationId) || [];
      list.push(intv);
      interviewsByApp.set(intv.applicationId, list);
    }

    const scheduledItems = Array.from(interviewsByApp.entries()).map(([appId, appInterviews]) => {
      const app = appsMap.get(appId);
      const candidate = app ? candidatesMap.get(app.candidateId) : undefined;
      const job = app ? jobsMap.get(app.jobId) : undefined;

      const formattedInterviews = appInterviews.map((intv) => {
        let parsedScorecard: Record<string, unknown> | null = null;
        if (intv.scorecard) {
          try {
            parsedScorecard = JSON.parse(intv.scorecard) as Record<string, unknown>;
          } catch {
            parsedScorecard = null;
          }
        }
        return {
          id: intv.id,
          applicationId: intv.applicationId,
          date: intv.date,
          time: intv.time,
          type: fixUtf8String(intv.type),
          format: intv.format,
          linkOrLocation: fixUtf8String(intv.linkOrLocation),
          interviewer: fixUtf8String(intv.interviewer),
          round: intv.round,
          scorecard: parsedScorecard,
          notes: intv.notes ? fixUtf8String(intv.notes) : null,
          createdAt: intv.createdAt,
          updatedAt: intv.updatedAt,
        };
      });

      // Sort rounds descending (most recent first)
      formattedInterviews.sort((a, b) => {
        const dtA = `${a.date} ${a.time || "00:00"}`;
        const dtB = `${b.date} ${b.time || "00:00"}`;
        return dtB.localeCompare(dtA);
      });

      const today = new Date().toISOString().split("T")[0];
      const upcoming = formattedInterviews
        .filter((i) => i.date >= today)
        .sort((a, b) => {
          const dtA = `${a.date} ${a.time || "00:00"}`;
          const dtB = `${b.date} ${b.time || "00:00"}`;
          return dtA.localeCompare(dtB);
        })[0];
      const primary = upcoming || formattedInterviews[0];

      return {
        id: primary.id,
        applicationId: appId,
        date: primary.date,
        time: primary.time,
        type: primary.type,
        format: primary.format,
        linkOrLocation: primary.linkOrLocation,
        interviewer: primary.interviewer,
        round: primary.round,
        scorecard: primary.scorecard,
        notes: primary.notes,
        createdAt: primary.createdAt,
        updatedAt: primary.updatedAt,
        application: app
          ? {
              ...app,
              candidate: candidate ? { ...candidate, name: fixUtf8String(candidate.name) } : undefined,
              job: job ? { ...job, title: fixUtf8String(job.title) } : undefined,
              candidateName: candidate ? fixUtf8String(candidate.name) : "Candidate",
              candidateEmail: candidate?.email || "",
              candidatePhone: candidate?.phone || null,
              interviews: formattedInterviews,
            }
          : undefined,
        candidateName: candidate ? fixUtf8String(candidate.name) : "Candidate",
        candidateEmail: candidate?.email,
        jobTitle: job ? fixUtf8String(job.title) : undefined,
        jobId: app?.jobId,
        organizationId: candidate?.organizationId || job?.organizationId,
      };
    });

    const scheduledAppIds = new Set(interviewsByApp.keys());
    const awaitingApps = Array.from(appsMap.values()).filter(
      (a) => a.stage === "INTERVIEW" && !scheduledAppIds.has(a.id),
    );

    const awaitingItems = (options?.tab !== "UPCOMING" ? awaitingApps : []).map((app) => {
      const candidate = candidatesMap.get(app.candidateId);
      const job = jobsMap.get(app.jobId);
      return {
        id: `awaiting-${app.id}`,
        applicationId: app.id,
        date: "",
        time: "",
        type: "HR_SCREENING",
        format: "MEET" as const,
        linkOrLocation: "",
        interviewer: "",
        round: 1,
        scorecard: null,
        notes: null,
        createdAt: app.createdAt || new Date().toISOString(),
        updatedAt: app.updatedAt || new Date().toISOString(),
        application: {
          ...app,
          candidate: candidate ? { ...candidate, name: fixUtf8String(candidate.name) } : undefined,
          job: job ? { ...job, title: fixUtf8String(job.title) } : undefined,
          candidateName: candidate ? fixUtf8String(candidate.name) : "Candidate",
          candidateEmail: candidate?.email || "",
          candidatePhone: candidate?.phone || null,
          interviews: [],
        },
        candidateName: candidate ? fixUtf8String(candidate.name) : "Candidate",
        candidateEmail: candidate?.email,
        jobTitle: job ? fixUtf8String(job.title) : undefined,
        jobId: app.jobId,
        organizationId: candidate?.organizationId || job?.organizationId,
      };
    });

    const allItems = [...scheduledItems, ...awaitingItems]
      .filter((item) => {
        if (options?.organizationId && item.organizationId !== options.organizationId) {
          return false;
        }
        if (options?.jobId && item.jobId !== options.jobId) {
          return false;
        }
        if (options?.search && options.search.trim() !== "") {
          const q = options.search.trim().toLowerCase();
          const matches =
            item.candidateName.toLowerCase().includes(q) ||
            (item.candidateEmail && item.candidateEmail.toLowerCase().includes(q)) ||
            (item.jobTitle && item.jobTitle.toLowerCase().includes(q)) ||
            item.interviewer.toLowerCase().includes(q) ||
            item.linkOrLocation.toLowerCase().includes(q);
          if (!matches) return false;
        }
        if (options?.tab === "UPCOMING") {
          if (!item.date) return false;
        }
        if (options?.tab === "AWAITING") {
          if (item.date) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (options?.sortBy === "name") {
          return a.candidateName.localeCompare(b.candidateName);
        }
        if (options?.sortBy === "newest") {
          return toTimestamp(b.createdAt) - toTimestamp(a.createdAt);
        }
        if (a.date && !b.date) return -1;
        if (!a.date && b.date) return 1;
        if (a.date && b.date) {
          const dateA = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
          const dateB = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
          return dateA - dateB;
        }
        return toTimestamp(b.createdAt) - toTimestamp(a.createdAt);
      });

    const total = allItems.length;
    const page = defaultPage;
    const limit = defaultLimit;
    const totalPages = Math.ceil(total / limit) || 1;
    const data = allItems.slice((page - 1) * limit, page * limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: string) {
    const intv = await this.prisma.db.orm.public.Interview.where((i) => i.id.eq(id)).first();
    if (!intv) {
      throw new AppNotFoundException(APP_ERROR_CODES.INTERVIEW_NOT_FOUND, `Interview with ID ${id} not found`);
    }

    const app = await this.prisma.db.orm.public.Application.where((a) => a.id.eq(intv.applicationId)).first();
    const candidate = app
      ? await this.prisma.db.orm.public.Candidate.where((c) => c.id.eq(app.candidateId)).first()
      : null;
    const job = app
      ? await this.prisma.db.orm.public.Job.where((j) => j.id.eq(app.jobId)).first()
      : null;

    let parsedScorecard: Record<string, unknown> | null = null;
    if (intv.scorecard) {
      try {
        parsedScorecard = JSON.parse(intv.scorecard) as Record<string, unknown>;
      } catch {
        parsedScorecard = null;
      }
    }

    return {
      ...intv,
      type: fixUtf8String(intv.type),
      linkOrLocation: fixUtf8String(intv.linkOrLocation),
      interviewer: fixUtf8String(intv.interviewer),
      scorecard: parsedScorecard,
      notes: intv.notes ? fixUtf8String(intv.notes) : null,
      application: app
        ? {
            ...app,
            candidate: candidate ? { ...candidate, name: fixUtf8String(candidate.name) } : undefined,
            job: job ? { ...job, title: fixUtf8String(job.title) } : undefined,
          }
        : undefined,
      candidateName: candidate ? fixUtf8String(candidate.name) : "Candidate",
      candidateEmail: candidate?.email,
      jobTitle: job ? fixUtf8String(job.title) : undefined,
    };
  }

  async create(dto: CreateInterviewDto) {
    const app = await this.prisma.db.orm.public.Application.where((a) => a.id.eq(dto.applicationId)).first();
    if (!app) {
      throw new AppNotFoundException(APP_ERROR_CODES.INTERVIEW_APP_NOT_FOUND, `Application with ID ${dto.applicationId} not found`);
    }

    const id = crypto.randomUUID();
    const scorecardStr = dto.scorecard ? (typeof dto.scorecard === "string" ? dto.scorecard : JSON.stringify(dto.scorecard)) : null;

    await this.prisma.db.orm.public.Interview.create({
      id,
      applicationId: dto.applicationId,
      date: dto.date,
      time: dto.time,
      type: dto.type as InterviewType,
      format: (dto.format as InterviewFormat) || "MEET",
      linkOrLocation: dto.linkOrLocation || "",
      interviewer: dto.interviewer,
      round: dto.round || 1,
      scorecard: scorecardStr,
      notes: dto.notes || null,
    });

    if (app.stage !== "INTERVIEW" && app.stage !== "OFFER" && app.stage !== "HIRED") {
      await this.prisma.db.orm.public.Application.where((a) => a.id.eq(app.id)).update({
        stage: "INTERVIEW",
      });
    }

    const createdInterview = await this.findOne(id);

    // Record activity log & optionally send interview invitation email
    const candidate = app.candidateId
      ? await this.prisma.db.orm.public.Candidate.where((c) => c.id.eq(app.candidateId)).first()
      : null;
    const job = app.jobId
      ? await this.prisma.db.orm.public.Job.where((j) => j.id.eq(app.jobId)).first()
      : null;
    const orgId = candidate?.organizationId || job?.organizationId;

    if (candidate && orgId) {
      await this.activitiesService.createActivity({
        organizationId: orgId,
        candidateId: candidate.id,
        applicationId: app.id,
        type: "INTERVIEW_SCHEDULED",
        title: `Đã lên lịch phỏng vấn (${dto.type})`,
        description: `Buổi phỏng vấn vòng ${dto.round || 1} vào ${dto.time} ngày ${dto.date} với ${dto.interviewer}`,
        actorName: dto.interviewer,
        actorRole: "INTERVIEWER",
        metadata: {
          interviewId: id,
          date: dto.date,
          time: dto.time,
          format: dto.format || "MEET",
          type: dto.type,
        },
      });

      if (dto.sendInvitationEmail && candidate.email) {
        try {
          const template = await this.emailService.getTemplateByType(orgId, "INTERVIEW_INVITATION");
          if (template && template.enabled) {
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
                  organization: { name: "ATS Recruitment" },
                  interview: {
                    date: dto.date,
                    time: dto.time,
                    format: dto.format || "Google Meet",
                    linkOrLocation: dto.linkOrLocation || "https://meet.google.com",
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
          console.warn("Failed to send auto interview invitation email:", emailErr);
        }
      }
    }

    return createdInterview;
  }

  async update(id: string, dto: UpdateInterviewDto) {
    const intv = await this.prisma.db.orm.public.Interview.where((i) => i.id.eq(id)).first();
    if (!intv) {
      throw new AppNotFoundException(APP_ERROR_CODES.INTERVIEW_NOT_FOUND, `Interview with ID ${id} not found`);
    }

    const updateData: InterviewUpdatePayload = {};
    if (dto.date !== undefined) updateData.date = dto.date;
    if (dto.time !== undefined) updateData.time = dto.time;
    if (dto.type !== undefined) updateData.type = dto.type as InterviewType;
    if (dto.format !== undefined) updateData.format = dto.format as InterviewFormat;
    if (dto.linkOrLocation !== undefined) updateData.linkOrLocation = dto.linkOrLocation;
    if (dto.interviewer !== undefined) updateData.interviewer = dto.interviewer;
    if (dto.round !== undefined) updateData.round = dto.round;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.scorecard !== undefined) {
      updateData.scorecard = typeof dto.scorecard === "string" ? dto.scorecard : JSON.stringify(dto.scorecard);
    }

    await this.prisma.db.orm.public.Interview.where((i) => i.id.eq(id)).update(updateData);
    const updated = await this.findOne(id);

    const candidate = updated.application?.candidate;
    if (candidate && candidate.organizationId) {
      await this.activitiesService.createActivity({
        organizationId: candidate.organizationId,
        candidateId: candidate.id,
        applicationId: updated.applicationId,
        type: "INTERVIEW_UPDATED",
        title: `Đã cập nhật lịch phỏng vấn (${updated.type})`,
        description: `Cập nhật thông tin: ${updated.time} ngày ${updated.date}`,
        actorName: updated.interviewer,
        actorRole: "INTERVIEWER",
        metadata: {
          interviewId: id,
          changes: Object.keys(updateData),
        },
      });
    }

    return updated;
  }

  async remove(id: string) {
    const intv = await this.prisma.db.orm.public.Interview.where((i) => i.id.eq(id)).first();
    if (!intv) {
      throw new AppNotFoundException(APP_ERROR_CODES.INTERVIEW_NOT_FOUND, `Interview with ID ${id} not found`);
    }

    await this.prisma.db.orm.public.Interview.where((i) => i.id.eq(id)).delete();
    return { success: true, message: `Interview ${id} deleted successfully` };
  }
}
