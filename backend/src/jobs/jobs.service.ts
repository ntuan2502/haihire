import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
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
  }) {
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
    ).all();

    // Fetch applications to calculate count per job
    const allApps = await this.prisma.db.orm.public.Application.select(
      "id",
      "jobId",
      "stage",
    ).all();

    const appCountMap = new Map<
      string,
      { total: number; byStage: Record<string, number> }
    >();
    for (const app of allApps) {
      if (!app.jobId) continue;
      if (!appCountMap.has(app.jobId)) {
        appCountMap.set(app.jobId, { total: 0, byStage: {} });
      }
      const item = appCountMap.get(app.jobId)!;
      item.total += 1;
      item.byStage[app.stage] = (item.byStage[app.stage] || 0) + 1;
    }

    const allOrgs = await this.prisma.db.orm.public.Organization.select(
      "id",
      "name",
      "slug",
    ).all();
    const orgMap = new Map(allOrgs.map((o) => [o.id, o]));

    let result = jobs.map((job) => ({
      ...job,
      organization: job.organizationId ? orgMap.get(job.organizationId) ?? null : null,
      applicationsCount: appCountMap.get(job.id)?.total ?? 0,
      applicationsByStage: appCountMap.get(job.id)?.byStage ?? {},
    }));

    // Filter by Organization ID or Organization Slug if specified
    if (filter?.organizationSlug) {
      const org = await this.prisma.db.orm.public.Organization.select("id")
        .where((o) => o.slug.eq(filter.organizationSlug as string))
        .first();
      if (org) {
        result = result.filter((j) => j.organizationId === org.id);
      } else {
        return [];
      }
    } else if (filter?.organizationId !== undefined) {
      result = result.filter((j) => j.organizationId === filter.organizationId);
    }
    if (filter?.status) {
      result = result.filter((j) => j.status === filter.status);
    }
    if (filter?.department) {
      result = result.filter(
        (j) => j.department.toLowerCase() === filter.department?.toLowerCase(),
      );
    }
    if (filter?.search) {
      const s = filter.search.toLowerCase();
      result = result.filter(
        (j) =>
          j.title.toLowerCase().includes(s) ||
          j.department.toLowerCase().includes(s) ||
          j.location.toLowerCase().includes(s),
      );
    }

    return result;
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

    const candidates = await this.prisma.db.orm.public.Candidate.select(
      "id",
      "name",
      "email",
      "phone",
      "resumeUrl",
      "resumeFileName",
    ).all();
    const candidateMap = new Map(candidates.map((c) => [c.id, c]));

    // Fetch interviews for each application
    const appIds = new Set(applications.map((a) => a.id));
    const allInterviews = this.prisma.db.orm.public.Interview?.all
      ? await this.prisma.db.orm.public.Interview.all()
      : [];
    const jobInterviews = allInterviews.filter((i: any) => appIds.has(i.applicationId));
    const interviewsByApp = new Map<string, any[]>();
    for (const intv of jobInterviews) {
      const list = interviewsByApp.get(intv.applicationId) || [];
      let parsedScorecard: any = null;
      if (intv.scorecard) {
        try {
          parsedScorecard = JSON.parse(intv.scorecard);
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
