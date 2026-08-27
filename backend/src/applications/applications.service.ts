import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MinioService } from "../minio/minio.service";
import { PrismaService } from "../prisma.service";
import { CreateApplicationDto } from "./dto/create-application.dto";
import { ApplicationStage, UpdateStageDto } from "./dto/update-stage.dto";

@Injectable()
export class ApplicationsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(MinioService)
    private readonly minioService: MinioService,
  ) {}

  async findByJob(jobId: number) {
    const job = await this.prisma.db.orm.public.Job.select("id", "title")
      .where((j) => j.id.eq(jobId))
      .first();

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
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
      .where((a) => a.jobId.eq(jobId))
      .all();

    return applications.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async findAll() {
    return this.prisma.db.orm.public.Application.select(
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
    ).all();
  }

  async findOne(id: number) {
    const app = await this.prisma.db.orm.public.Application.select(
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
      .where((a) => a.id.eq(id))
      .first();

    if (!app) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }

    const job = await this.prisma.db.orm.public.Job.select(
      "id",
      "title",
      "department",
      "location",
    )
      .where((j) => j.id.eq(app.jobId))
      .first();

    return {
      ...app,
      job,
    };
  }

  async create(dto: CreateApplicationDto, file?: Express.Multer.File) {
    const job = await this.prisma.db.orm.public.Job.select("id", "title")
      .where((j) => j.id.eq(dto.jobId))
      .first();

    if (!job) {
      throw new NotFoundException(`Job with ID ${dto.jobId} not found`);
    }

    if (!file) {
      throw new BadRequestException("Resume PDF file is required");
    }

    // 1. Upload CV to MinIO S3 Object Storage
    const uploadResult = await this.minioService.uploadFile(file, "resumes");

    // 2. Determine highest orderIndex in APPLIED stage
    const existingInStage = await this.prisma.db.orm.public.Application.select(
      "id",
      "orderIndex",
    )
      .where((a) => a.jobId.eq(dto.jobId))
      .all();

    const maxOrder = existingInStage.reduce(
      (max, item) => Math.max(max, item.orderIndex),
      -1,
    );

    // 3. Save Application record in PostgreSQL via Prisma 8
    const created = await this.prisma.db.orm.public.Application.upsert({
      create: {
        jobId: dto.jobId,
        candidateName: dto.candidateName,
        candidateEmail: dto.candidateEmail,
        candidatePhone: dto.candidatePhone ?? null,
        stage: "APPLIED",
        resumeUrl: uploadResult.url,
        resumeFileName: uploadResult.originalName,
        resumeFileSize: uploadResult.size,
        resumeMimeType: uploadResult.mimeType,
        notes: dto.notes ?? null,
        orderIndex: maxOrder + 1,
      },
      update: {},
      conflictOn: { id: 0 },
    });

    return created;
  }

  async updateStage(id: number, dto: UpdateStageDto) {
    await this.findOne(id);

    const updated = await this.prisma.db.orm.public.Application.where(
      (a) => a.id.eq(id),
    ).update({
      stage: dto.stage,
      ...(dto.orderIndex !== undefined ? { orderIndex: dto.orderIndex } : {}),
    });

    return updated;
  }

  async remove(id: number) {
    const app = await this.findOne(id);

    // Delete file from MinIO if path exists
    if (app.resumeFileName) {
      await this.minioService.deleteFile(app.resumeFileName);
    }

    await this.prisma.db.orm.public.Application.where((a) => a.id.eq(id)).delete();

    return { success: true, message: `Application ${id} deleted successfully` };
  }
}
