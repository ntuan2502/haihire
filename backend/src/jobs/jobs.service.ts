import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateJobDto } from "./dto/create-job.dto";
import { UpdateJobDto } from "./dto/update-job.dto";
import { fixUtf8String } from "../applications/applications.service";

@Injectable()
export class JobsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async findAll(filter?: {
    status?: string;
    department?: string;
    search?: string;
    organizationId?: string;
    organizationSlug?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filter?.page && filter.page > 0 ? filter.page : 1;
    const limit = filter?.limit && filter.limit > 0 ? filter.limit : 20;

    let targetOrgId = filter?.organizationId;
    let targetOrg: { id: string; name: string; slug: string } | null = null;

    if (filter?.organizationSlug) {
      targetOrg = await this.prisma.db.orm.public.Organization.select("id", "name", "slug")
        .where((o) => o.slug.eq(filter.organizationSlug as string))
        .first();
      if (!targetOrg) {
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }
      targetOrgId = targetOrg.id;
    } else if (targetOrgId) {
      targetOrg = await this.prisma.db.orm.public.Organization.select("id", "name", "slug")
        .where((o) => o.id.eq(targetOrgId as string))
        .first();
    }

    const jobsQuery = this.prisma.db.orm.public.Job.select(
      "id",
      "title",
      "department",
      "location",
      "postalCode",
      "experienceLevel",
      "workplace",
      "type",
      "description",
      "requirements",
      "salaryRange",
      "status",
      "organizationId",
      "createdById",
      "createdAt",
      "updatedAt",
    );

    let jobs = targetOrgId
      ? await jobsQuery.where((j) => j.organizationId.eq(targetOrgId!)).all()
      : await jobsQuery.all();

    if (filter?.status) {
      jobs = jobs.filter((j) => j.status === filter.status);
    }
    if (filter?.department) {
      jobs = jobs.filter(
        (j) => j.department.toLowerCase() === filter.department?.toLowerCase(),
      );
    }
    if (filter?.search) {
      const s = filter.search.toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(s) ||
          j.department.toLowerCase().includes(s) ||
          j.location.toLowerCase().includes(s),
      );
    }

    if (jobs.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const total = jobs.length;
    const totalPages = Math.ceil(total / limit);
    const pagedJobs = jobs.slice((page - 1) * limit, page * limit);

    const jobIds = [...new Set(pagedJobs.map((j) => j.id))];
    const jobIdSet = new Set(jobIds);

    // Fetch applications only relevant to these paged jobs
    const allApps = jobIds.length > 0
      ? await this.prisma.db.orm.public.Application.select(
          "id",
          "jobId",
          "stage",
        )
          .where((a) => a.jobId.in(jobIds))
          .all()
      : [];

    const appCountMap = new Map<
      string,
      { total: number; byStage: Record<string, number> }
    >();
    for (const app of allApps) {
      if (!app.jobId || !jobIdSet.has(app.jobId)) continue;
      if (!appCountMap.has(app.jobId)) {
        appCountMap.set(app.jobId, { total: 0, byStage: {} });
      }
      const item = appCountMap.get(app.jobId)!;
      item.total += 1;
      item.byStage[app.stage] = (item.byStage[app.stage] || 0) + 1;
    }

    const orgMap = new Map<string, { id: string; name: string; slug: string }>();
    if (targetOrg) {
      orgMap.set(targetOrg.id, targetOrg);
    } else {
      const allOrgs = await this.prisma.db.orm.public.Organization.select(
        "id",
        "name",
        "slug",
      ).all();
      for (const o of allOrgs) {
        orgMap.set(o.id, o);
      }
    }

    return {
      data: pagedJobs.map((job) => ({
        ...job,
        organization: job.organizationId ? orgMap.get(job.organizationId) ?? null : null,
        applicationsCount: appCountMap.get(job.id)?.total ?? 0,
        applicationsByStage: appCountMap.get(job.id)?.byStage ?? {},
      })),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: string) {
    const job = await this.prisma.db.orm.public.Job.select(
      "id",
      "title",
      "department",
      "location",
      "postalCode",
      "experienceLevel",
      "workplace",
      "type",
      "description",
      "requirements",
      "salaryRange",
      "status",
      "organizationId",
      "createdById",
      "createdAt",
      "updatedAt",
    )
      .where((j) => j.id.eq(id))
      .first();

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

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
      .where((a) => a.jobId.eq(id))
      .all();

    const candidateIds = [...new Set(applications.map((a) => a.candidateId))];
    const candidates = candidateIds.length > 0
      ? await this.prisma.db.orm.public.Candidate.select(
          "id",
          "name",
          "email",
          "phone",
          "resumeUrl",
          "resumeFileName",
        )
          .where((c) => c.id.in(candidateIds))
          .all()
      : [];
    const candidateMap = new Map(candidates.map((c) => [c.id, c]));

    // Fetch interviews for each application
    const appIds = [...new Set(applications.map((a) => a.id))];
    const jobInterviews =
      appIds.length > 0 && Boolean(this.prisma.db.orm.public.Interview)
        ? await this.prisma.db.orm.public.Interview.where((i) => i.applicationId.in(appIds)).all()
        : [];
    const interviewsByApp = new Map<string, Array<Record<string, unknown>>>();
    for (const intv of jobInterviews) {
      const list = interviewsByApp.get(intv.applicationId) || [];
      let parsedScorecard: Record<string, unknown> | null = null;
      if (intv.scorecard) {
        try {
          parsedScorecard = JSON.parse(intv.scorecard) as Record<string, unknown>;
        } catch {
          parsedScorecard = null;
        }
      }
      list.push({
        ...intv,
        type: fixUtf8String(intv.type),
        linkOrLocation: fixUtf8String(intv.linkOrLocation),
        interviewer: fixUtf8String(intv.interviewer),
        scorecard: parsedScorecard,
        notes: intv.notes ? fixUtf8String(intv.notes) : null,
      });
      interviewsByApp.set(intv.applicationId, list);
    }

    const populatedApps = applications.map((a) => {
      const candidate = candidateMap.get(a.candidateId);
      return {
        ...a,
        candidate,
        candidateName: candidate?.name || "Unknown",
        candidateEmail: candidate?.email || "",
        candidatePhone: candidate?.phone || null,
        resumeUrl: a.resumeUrl || candidate?.resumeUrl || "",
        resumeFileName: a.resumeFileName || candidate?.resumeFileName || "Resume.pdf",
        interviews: interviewsByApp.get(a.id) || [],
      };
    });

    let organization = null;
    if (job.organizationId) {
      organization = await this.prisma.db.orm.public.Organization.select(
        "id",
        "name",
        "slug",
      )
        .where((o) => o.id.eq(job.organizationId as string))
        .first();
    }

    return {
      ...job,
      organization,
      applications: populatedApps,
      applicationsCount: populatedApps.length,
    };
  }

  async findBySlug(orgSlug: string, jobSlug: string) {
    const org = await this.prisma.db.orm.public.Organization.select(
      "id",
      "name",
      "slug",
    )
      .where((o) => o.slug.eq(orgSlug))
      .first();

    if (!org) {
      throw new NotFoundException(`Organization '${orgSlug}' not found`);
    }

    const jobs = await this.prisma.db.orm.public.Job.select(
      "id",
      "title",
      "department",
      "location",
      "postalCode",
      "experienceLevel",
      "workplace",
      "type",
      "description",
      "requirements",
      "salaryRange",
      "status",
      "organizationId",
      "createdById",
      "createdAt",
      "updatedAt",
    )
      .where((j) => j.organizationId.eq(org.id))
      .all();

    const slugify = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const matchedJob = jobs.find((j) => {
      if (j.id === jobSlug) return true;
      if (j.id.startsWith(jobSlug)) return true;
      const titleSlug = slugify(j.title);
      if (titleSlug === jobSlug) return true;
      if (`${titleSlug}-${j.id.slice(0, 8)}` === jobSlug) return true;
      if (jobSlug.endsWith(j.id)) return true;
      return false;
    });

    if (!matchedJob) {
      throw new NotFoundException(
        `Job '${jobSlug}' not found in organization '${orgSlug}'`,
      );
    }

    return this.findOne(matchedJob.id);
  }

  async create(dto: CreateJobDto) {
    const created = await this.prisma.db.orm.public.Job.upsert({
      create: {
        title: dto.title,
        department: dto.department,
        location: dto.location,
        postalCode: dto.postalCode ?? null,
        experienceLevel: dto.experienceLevel ?? null,
        workplace: dto.workplace ?? null,
        type: dto.type ?? "FULL_TIME",
        description: dto.description,
        requirements: dto.requirements ?? null,
        salaryRange: dto.salaryRange ?? null,
        status: dto.status ?? "PUBLISHED",
        organizationId: dto.organizationId ?? null,
        createdById: dto.createdById ?? null,
      },
      update: {},
      conflictOn: { id: "00000000-0000-0000-0000-000000000000" },
    });

    return created;
  }

  async update(id: string, dto: UpdateJobDto) {
    await this.findOne(id);

    const updated = await this.prisma.db.orm.public.Job.where((j) =>
      j.id.eq(id),
    ).update({
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.department !== undefined ? { department: dto.department } : {}),
      ...(dto.location !== undefined ? { location: dto.location } : {}),
      ...(dto.postalCode !== undefined ? { postalCode: dto.postalCode } : {}),
      ...(dto.experienceLevel !== undefined
        ? { experienceLevel: dto.experienceLevel }
        : {}),
      ...(dto.workplace !== undefined ? { workplace: dto.workplace } : {}),
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.requirements !== undefined
        ? { requirements: dto.requirements }
        : {}),
      ...(dto.salaryRange !== undefined
        ? { salaryRange: dto.salaryRange }
        : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    });

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);

    // Delete associated applications first
    await this.prisma.db.orm.public.Application.where((a) =>
      a.jobId.eq(id),
    ).delete();
    await this.prisma.db.orm.public.Job.where((j) => j.id.eq(id)).delete();

    return { success: true, message: `Job ${id} deleted successfully` };
  }
}
