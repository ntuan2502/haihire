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
import { UpdateCandidateDto } from "./dto/update-candidate.dto";

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

    let job = null;
    if (app.jobId) {
      job = await this.prisma.db.orm.public.Job.select(
        "id",
        "title",
        "department",
        "location",
      )
        .where((j) => j.id.eq(app.jobId as number))
        .first();
    }

    return {
      ...app,
      job,
    };
  }

  async create(dto: CreateApplicationDto, file?: Express.Multer.File) {
    if (dto.jobId) {
      const job = await this.prisma.db.orm.public.Job.select("id", "title")
        .where((j) => j.id.eq(dto.jobId as number))
        .first();

      if (!job) {
        throw new NotFoundException(`Job with ID ${dto.jobId} not found`);
      }
    }

    // 1. Upload CV to MinIO S3 Object Storage if file is provided
    let uploadResult: { url: string; originalName: string; size: number; mimeType: string } = {
      url: "",
      originalName: "Candidate Profile",
      size: 0,
      mimeType: "application/pdf",
    };

    if (file) {
      uploadResult = await this.minioService.uploadFile(file, "resumes");
    } else if (dto.resumeUrl) {
      uploadResult = {
        url: dto.resumeUrl,
        originalName: dto.resumeFileName || "Candidate Profile",
        size: 0,
        mimeType: "application/pdf",
      };
    }

    // 2. Determine highest orderIndex in APPLIED stage for the target job
    let maxOrder = 0;
    if (dto.jobId) {
      const existingInStage = await this.prisma.db.orm.public.Application.select(
        "id",
        "orderIndex",
      )
        .where((a) => a.jobId.eq(dto.jobId as number))
        .all();

      maxOrder = existingInStage.reduce(
        (max, item) => Math.max(max, item.orderIndex),
        -1,
      );
    }

    // 3. Save Application record in PostgreSQL via Prisma 8
    const created = await this.prisma.db.orm.public.Application.upsert({
      create: {
        jobId: dto.jobId ?? null,
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

  async updateCandidate(id: number, dto: UpdateCandidateDto) {
    const existing = await this.findOne(id);

    const updatePayload: Record<string, any> = {};
    if (dto.candidateName !== undefined) updatePayload.candidateName = dto.candidateName;
    if (dto.candidateEmail !== undefined) updatePayload.candidateEmail = dto.candidateEmail;
    if (dto.candidatePhone !== undefined) updatePayload.candidatePhone = dto.candidatePhone;
    if (dto.notes !== undefined) updatePayload.notes = dto.notes;
    if (dto.resumeUrl !== undefined) updatePayload.resumeUrl = dto.resumeUrl;
    if (dto.resumeFileName !== undefined) updatePayload.resumeFileName = dto.resumeFileName;

    // Update target application
    await this.prisma.db.orm.public.Application.where((a) => a.id.eq(id)).update(updatePayload);

    // Synchronize candidate contact info across all records with previous candidate email
    if (dto.candidateName || dto.candidatePhone !== undefined || dto.candidateEmail) {
      const syncPayload: Record<string, any> = {};
      if (dto.candidateName) syncPayload.candidateName = dto.candidateName;
      if (dto.candidatePhone !== undefined) syncPayload.candidatePhone = dto.candidatePhone;
      if (dto.candidateEmail) syncPayload.candidateEmail = dto.candidateEmail;
      if (dto.notes !== undefined) syncPayload.notes = dto.notes;

      await this.prisma.db.orm.public.Application.where(
        (a) => a.candidateEmail.eq(existing.candidateEmail),
      ).update(syncPayload);
    }

    return this.findOne(id);
  }

  async uploadDocument(id: number, file: Express.Multer.File) {
    await this.findOne(id);

    if (!file) {
      throw new BadRequestException("No document file provided");
    }

    let uploadResult: { url: string; originalName: string; size: number; mimeType: string } = {
      url: `/uploads/${Date.now()}-${file.originalname}`,
      originalName: file.originalname || "document.pdf",
      size: file.size || 0,
      mimeType: file.mimetype || "application/pdf",
    };

    try {
      uploadResult = await this.minioService.uploadFile(file, "resumes");
    } catch {
      uploadResult = {
        url: `/uploads/${Date.now()}-${file.originalname}`,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      };
    }

    await this.prisma.db.orm.public.Application.where((a) => a.id.eq(id)).update({
      resumeUrl: uploadResult.url,
      resumeFileName: uploadResult.originalName,
      resumeFileSize: uploadResult.size,
      resumeMimeType: uploadResult.mimeType,
    });

    return this.findOne(id);
  }

  async remove(id: number) {
    const app = await this.findOne(id);

    // Check if candidate has other records
    const allCandidateRecords = await this.prisma.db.orm.public.Application.select(
      "id",
      "jobId",
      "candidateEmail",
    )
      .where((a) => a.candidateEmail.eq(app.candidateEmail))
      .all();

    const otherRecords = allCandidateRecords.filter((r) => r.id !== id);

    if (otherRecords.length > 0) {
      // Other applications or talent pool records exist, delete this application record
      await this.prisma.db.orm.public.Application.where((a) => a.id.eq(id)).delete();
    } else {
      // This is the candidate's only record in database.
      // Detach from the job so the application is deleted from the job/applications list,
      // but the candidate is preserved in the Talent Pool.
      await this.prisma.db.orm.public.Application.where((a) => a.id.eq(id)).update({
        jobId: null,
      });
    }

    return { success: true, message: `Application ${id} deleted successfully` };
  }
}
