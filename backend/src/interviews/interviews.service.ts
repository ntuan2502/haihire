import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import crypto from "node:crypto";
import { PrismaService } from "../prisma.service";
import { CreateInterviewDto } from "./dto/create-interview.dto";
import { UpdateInterviewDto } from "./dto/update-interview.dto";
import { fixUtf8String } from "../applications/applications.service";

@Injectable()
export class InterviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(options?: {
    organizationId?: string;
    jobId?: string;
    applicationId?: string;
  }) {
    let interviews = await this.prisma.db.orm.public.Interview.all();

    if (options?.applicationId) {
      interviews = interviews.filter((i) => i.applicationId === options.applicationId);
    }

    if (interviews.length === 0) {
      return [];
    }

    const appIds = new Set(interviews.map((i) => i.applicationId));
    const allApps = await this.prisma.db.orm.public.Application.select(
      "id",
      "candidateId",
      "jobId",
      "stage",
      "matchScore",
      "notes",
    ).all();

    const appsMap = new Map<string, (typeof allApps)[0]>();
    for (const a of allApps) {
      if (appIds.has(a.id)) {
        appsMap.set(a.id, a);
      }
    }

    const candidateIds = new Set(Array.from(appsMap.values()).map((a) => a.candidateId));
    const allCandidates = await this.prisma.db.orm.public.Candidate.select(
      "id",
      "name",
      "firstName",
      "lastName",
      "email",
      "phone",
      "organizationId",
    ).all();

    const candidatesMap = new Map<string, (typeof allCandidates)[0]>();
    for (const c of allCandidates) {
      if (candidateIds.has(c.id)) {
        candidatesMap.set(c.id, c);
      }
    }

    const jobIds = new Set(Array.from(appsMap.values()).map((a) => a.jobId));
    const allJobs = await this.prisma.db.orm.public.Job.select(
      "id",
      "title",
      "department",
      "organizationId",
    ).all();

    const jobsMap = new Map<string, (typeof allJobs)[0]>();
    for (const j of allJobs) {
      if (jobIds.has(j.id)) {
        jobsMap.set(j.id, j);
      }
    }

    const enriched = interviews
      .map((intv) => {
        const app = appsMap.get(intv.applicationId);
        const candidate = app ? candidatesMap.get(app.candidateId) : undefined;
        const job = app ? jobsMap.get(app.jobId) : undefined;

        let parsedScorecard: any = null;
        if (intv.scorecard) {
          try {
            parsedScorecard = JSON.parse(intv.scorecard);
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
          jobId: app?.jobId,
          organizationId: candidate?.organizationId || job?.organizationId,
        };
      })
      .filter((item) => {
        if (options?.organizationId && item.organizationId !== options.organizationId) {
          return false;
        }
        if (options?.jobId && item.jobId !== options.jobId) {
          return false;
        }
        return true;
      });

    return enriched;
  }

  async findOne(id: string) {
    const intv = await this.prisma.db.orm.public.Interview.where((i) => i.id.eq(id)).first();
    if (!intv) {
      throw new NotFoundException(`Interview with ID ${id} not found`);
    }

    const app = await this.prisma.db.orm.public.Application.where((a) => a.id.eq(intv.applicationId)).first();
    const candidate = app
      ? await this.prisma.db.orm.public.Candidate.where((c) => c.id.eq(app.candidateId)).first()
      : null;
    const job = app
      ? await this.prisma.db.orm.public.Job.where((j) => j.id.eq(app.jobId)).first()
      : null;

    let parsedScorecard: any = null;
    if (intv.scorecard) {
      try {
        parsedScorecard = JSON.parse(intv.scorecard);
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
      throw new NotFoundException(`Application with ID ${dto.applicationId} not found`);
    }

    const id = crypto.randomUUID();
    const scorecardStr = dto.scorecard ? (typeof dto.scorecard === "string" ? dto.scorecard : JSON.stringify(dto.scorecard)) : null;

    await this.prisma.db.orm.public.Interview.create({
      id,
      applicationId: dto.applicationId,
      date: dto.date,
      time: dto.time,
      type: dto.type,
      format: dto.format || "MEET",
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

    return this.findOne(id);
  }

  async update(id: string, dto: UpdateInterviewDto) {
    const intv = await this.prisma.db.orm.public.Interview.where((i) => i.id.eq(id)).first();
    if (!intv) {
      throw new NotFoundException(`Interview with ID ${id} not found`);
    }

    const updateData: any = {};
    if (dto.date !== undefined) updateData.date = dto.date;
    if (dto.time !== undefined) updateData.time = dto.time;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.format !== undefined) updateData.format = dto.format;
    if (dto.linkOrLocation !== undefined) updateData.linkOrLocation = dto.linkOrLocation;
    if (dto.interviewer !== undefined) updateData.interviewer = dto.interviewer;
    if (dto.round !== undefined) updateData.round = dto.round;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.scorecard !== undefined) {
      updateData.scorecard = typeof dto.scorecard === "string" ? dto.scorecard : JSON.stringify(dto.scorecard);
    }

    await this.prisma.db.orm.public.Interview.where((i) => i.id.eq(id)).update(updateData);
    return this.findOne(id);
  }

  async remove(id: string) {
    const intv = await this.prisma.db.orm.public.Interview.where((i) => i.id.eq(id)).first();
    if (!intv) {
      throw new NotFoundException(`Interview with ID ${id} not found`);
    }

    await this.prisma.db.orm.public.Interview.where((i) => i.id.eq(id)).delete();
    return { success: true, message: `Interview ${id} deleted successfully` };
  }
}
