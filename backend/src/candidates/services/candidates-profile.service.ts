import { Inject, Injectable, Optional } from "@nestjs/common";
import { APP_ERROR_CODES, type CandidateDocument } from "@haihire/shared";
import {
  AppForbiddenException,
  AppNotFoundException,
} from "../../common/app-exception";
import { PrismaService } from "../../prisma/prisma.service";
import { ActivitiesService } from "../../activities/activities.service";
import { fixUtf8String } from "../../common/doc-utils";
import { toTimestamp } from "../../common/date.util";
import { formatInterviewRecord } from "../../interviews/constants";

@Injectable()
export class CandidatesProfileService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(ActivitiesService)
    private readonly activitiesService?: ActivitiesService,
  ) {}

  async findOne(
    id: string,
    tenantOrgId?: string | null,
    currentUser?: { id?: string; name?: string } | null,
  ) {
    const candidate = await this.prisma.db.orm.public.Candidate.select(
      "id",
      "organizationId",
      "name",
      "firstName",
      "lastName",
      "gender",
      "dateOfBirth",
      "email",
      "phone",
      "notes",
      "resumeUrl",
      "resumeFileName",
      "resumeFileSize",
      "resumeMimeType",
      "createdAt",
      "updatedAt",
      "deletedAt",
    )
      .where((c) => c.id.eq(id))
      .first();

    if (!candidate || candidate.deletedAt) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.CANDIDATE_NOT_FOUND,
        `Candidate with ID ${id} not found`,
        { id },
      );
    }

    if (
      tenantOrgId &&
      candidate.organizationId &&
      tenantOrgId !== candidate.organizationId
    ) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.CANDIDATE_ORG_MISMATCH,
        "Access denied: candidate belongs to another organization.",
        { id, organizationId: candidate.organizationId },
      );
    }

    // Fetch all applications for this candidate
    const applications = await this.prisma.db.orm.public.Application.select(
      "id",
      "candidateId",
      "jobId",
      "stage",
      "resumeUrl",
      "resumeFileName",
      "resumeFileSize",
      "resumeMimeType",
      "notes",
      "orderIndex",
      "createdAt",
      "updatedAt",
    )
      .where((a) => a.candidateId.eq(id))
      .all();

    // Fetch jobs for each application
    const jobIds = [...new Set(applications.map((a) => a.jobId))];
    const jobs =
      jobIds.length > 0
        ? await this.prisma.db.orm.public.Job.select(
            "id",
            "title",
            "department",
            "location",
          )
            .where((j) => j.id.in(jobIds))
            .all()
        : [];
    const jobMap = new Map(jobs.map((j) => [j.id, j]));

    // Fetch interviews for each application
    const appIds = [...new Set(applications.map((a) => a.id))];
    const candidateInterviews =
      appIds.length > 0
        ? await this.prisma.db.orm.public.Interview.where((i) =>
            i.applicationId.in(appIds),
          ).all()
        : [];
    const interviewsByApp = new Map<string, Array<Record<string, unknown>>>();
    for (const intv of candidateInterviews) {
      const list = interviewsByApp.get(intv.applicationId) || [];
      list.push(formatInterviewRecord(intv));
      interviewsByApp.set(intv.applicationId, list);
    }

    const populatedApps = applications.map((app) => ({
      ...app,
      job: jobMap.get(app.jobId) || null,
      candidateName: candidate.name,
      candidateEmail: candidate.email,
      candidatePhone: candidate.phone,
      interviews: interviewsByApp.get(app.id) || [],
    }));

    // Aggregate all documents: candidate's documents + all documents from applications
    let dbDocs: CandidateDocument[] = [];
    try {
      const queried = await this.prisma.db.orm.public.CandidateDocument.select(
        "id",
        "name",
        "url",
        "size",
        "mimeType",
        "type",
        "createdAt",
      )
        .where((d) => d.candidateId.eq(id))
        .all();
      if (Array.isArray(queried) && queried.length > 0) {
        dbDocs = queried.map((d) => ({
          ...d,
          createdAt: d.createdAt
            ? new Date(toTimestamp(d.createdAt)).toISOString()
            : new Date().toISOString(),
        }));
      }
    } catch {
      dbDocs = [];
    }

    const candidateDirectDocs: CandidateDocument[] =
      dbDocs.length > 0
        ? dbDocs
        : candidate.resumeUrl
          ? [
              {
                id: `doc-${candidate.id}`,
                name: fixUtf8String(candidate.resumeFileName || "Resume.pdf"),
                url: candidate.resumeUrl,
                size: candidate.resumeFileSize ?? null,
                mimeType: candidate.resumeMimeType ?? "application/pdf",
                type: "Resume",
                createdAt: candidate.createdAt
                  ? new Date(toTimestamp(candidate.createdAt)).toISOString()
                  : new Date().toISOString(),
              },
            ]
          : [];

    const allDocuments: CandidateDocument[] = [...candidateDirectDocs];
    const seenUrls = new Set(allDocuments.map((d) => d.url).filter(Boolean));

    for (const app of populatedApps) {
      if (app.resumeUrl && !seenUrls.has(app.resumeUrl)) {
        seenUrls.add(app.resumeUrl);
        allDocuments.push({
          id: `doc-${app.id}`,
          name: fixUtf8String(app.resumeFileName || "Application_Resume.pdf"),
          url: app.resumeUrl,
          size: app.resumeFileSize ?? null,
          mimeType: app.resumeMimeType ?? "application/pdf",
          type: "Resume",
          createdAt: app.createdAt
            ? new Date(toTimestamp(app.createdAt)).toISOString()
            : new Date().toISOString(),
          sourceApplicationId: app.id,
          jobTitle: app.job?.title || "Job Application",
        });
      }
    }

    if (currentUser?.id && this.activitiesService && candidate.organizationId) {
      this.activitiesService
        .createActivity({
          organizationId: candidate.organizationId,
          candidateId: candidate.id,
          type: "NOTE_ADDED",
          title: "Candidate Profile Accessed",
          description: `Candidate profile was accessed by ${currentUser.name || "recruiter"}`,
          actorId: currentUser.id,
          actorName: currentUser.name || "Recruiter",
          metadata: {
            action: "VIEW_PROFILE",
            accessType: "PII_READ",
            subType: "PII_READ",
            userName: currentUser.name || "Recruiter",
          },
        })
        .catch(() => {});
    }

    return {
      ...candidate,
      applications: populatedApps,
      applicationsCount: populatedApps.length,
      allDocuments,
    };
  }
}
