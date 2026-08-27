import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CreateJobDto } from "./dto/create-job.dto";
import { UpdateJobDto } from "./dto/update-job.dto";

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
    organizationId?: number;
  }) {
    const jobs = await this.prisma.db.orm.public.Job.select(
      "id",
      "title",
      "department",
      "location",
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
      number,
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

    let result = jobs.map((job) => ({
      ...job,
      applicationsCount: appCountMap.get(job.id)?.total ?? 0,
      applicationsByStage: appCountMap.get(job.id)?.byStage ?? {},
    }));

    // Filter by Organization if specified
    if (filter?.organizationId !== undefined) {
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

  async findOne(id: number) {
    const job = await this.prisma.db.orm.public.Job.select(
      "id",
      "title",
      "department",
      "location",
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
      "jobId",
      "candidateName",
      "candidateEmail",
      "candidatePhone",
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

    return {
      ...job,
      applications,
      applicationsCount: applications.length,
    };
  }

  async create(dto: CreateJobDto) {
    const created = await this.prisma.db.orm.public.Job.upsert({
      create: {
        title: dto.title,
        department: dto.department,
        location: dto.location,
        type: dto.type ?? "FULL_TIME",
        description: dto.description,
        requirements: dto.requirements ?? null,
        salaryRange: dto.salaryRange ?? null,
        status: dto.status ?? "PUBLISHED",
        organizationId: dto.organizationId ?? null,
        createdById: dto.createdById ?? null,
      },
      update: {},
      conflictOn: { id: 0 },
    });

    return created;
  }

  async update(id: number, dto: UpdateJobDto) {
    await this.findOne(id);

    const updated = await this.prisma.db.orm.public.Job.where((j) =>
      j.id.eq(id),
    ).update({
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.department !== undefined ? { department: dto.department } : {}),
      ...(dto.location !== undefined ? { location: dto.location } : {}),
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

  async remove(id: number) {
    await this.findOne(id);

    // Delete associated applications first
    await this.prisma.db.orm.public.Application.where((a) =>
      a.jobId.eq(id),
    ).delete();
    await this.prisma.db.orm.public.Job.where((j) => j.id.eq(id)).delete();

    return { success: true, message: `Job ${id} deleted successfully` };
  }
}
