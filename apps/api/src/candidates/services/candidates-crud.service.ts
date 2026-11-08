import { Inject, Injectable } from "@nestjs/common";
import crypto from "node:crypto";
import { APP_ERROR_CODES } from "@haihire/shared";
import {
  AppBadRequestException,
  AppConflictException,
  AppForbiddenException,
} from "../../common/app-exception";
import { MinioService } from "../../minio/minio.service";
import { PrismaService, runInTransaction } from "../../prisma/prisma.service";
import { CandidatesProfileService } from "./candidates-profile.service";
import { CreateCandidateDto } from "../dto/create-candidate.dto";
import { UpdateCandidateDto } from "../dto/update-candidate.dto";
import { validateUploadedFile } from "../../common/upload-utils";
import { toInstant } from "../../common/date.util";

@Injectable()
export class CandidatesCrudService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(MinioService)
    private readonly minioService: MinioService,
    @Inject(CandidatesProfileService)
    private readonly profileService: CandidatesProfileService,
  ) {}

  async findAll(
    organizationId?: string,
    options?: { page?: number; limit?: number; search?: string },
    tenantOrgId?: string | null,
  ) {
    if (organizationId && tenantOrgId && organizationId !== tenantOrgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.CANDIDATE_ORG_MISMATCH,
        "Access denied: cannot access candidates from another organization.",
        { organizationId },
      );
    }
    const targetOrgId = tenantOrgId || organizationId || undefined;
    if (!targetOrgId) {
      return {
        data: [],
        total: 0,
        page: 1,
        limit: options?.limit || 20,
        totalPages: 0,
      };
    }

    const where: Record<string, unknown> = {
      organizationId: targetOrgId,
      deletedAt: null,
    };

    if (options?.search && options.search.trim() !== "") {
      const q = options.search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { notes: { contains: q, mode: "insensitive" } },
      ];
    }

    const page = options?.page && options.page > 0 ? options.page : 1;
    const limit = options?.limit && options.limit > 0 ? options.limit : 20;

    const [total, candidates] = await Promise.all([
      this.prisma.candidate.count({ where }),
      this.prisma.candidate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;
    const candidateIds = candidates.map((c) => c.id);

    // Fetch applications only for the candidates in the current page
    const allApps =
      candidateIds.length > 0
        ? await this.prisma.application.findMany({
            where: { candidateId: { in: candidateIds } },
            select: {
              id: true,
              candidateId: true,
              jobId: true,
              stage: true,
              createdAt: true,
            },
          })
        : [];

    const appsByCandidate = new Map<string, typeof allApps>();
    for (const app of allApps) {
      const list = appsByCandidate.get(app.candidateId) || [];
      list.push(app);
      appsByCandidate.set(app.candidateId, list);
    }

    const data = candidates.map((c) => {
      const apps = appsByCandidate.get(c.id) || [];
      return {
        ...c,
        name: c.name,
        firstName: c.firstName,
        lastName: c.lastName,
        notes: c.notes,
        resumeFileName: c.resumeFileName,
        applicationsCount: apps.length,
        applications: apps,
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async create(
    dto: CreateCandidateDto,
    file?: Express.Multer.File,
    defaultOrgId?: string,
  ) {
    const orgId = dto.organizationId || defaultOrgId;
    if (!orgId) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.CANDIDATE_ORG_REQUIRED,
        "Organization ID is required",
      );
    }

    const email = dto.email.trim().toLowerCase();

    // Check unique email per organization
    const existing = await this.prisma.candidate.findFirst({
      where: {
        organizationId: orgId,
        email,
      },
      select: { id: true },
    });

    if (existing) {
      throw new AppConflictException(
        APP_ERROR_CODES.CANDIDATE_EMAIL_EXISTS,
        "A candidate with this email already exists in your organization",
      );
    }

    let uploadResult: {
      url: string;
      originalName: string;
      size: number;
      mimeType: string;
    } = {
      url: "",
      originalName: "Candidate Profile",
      size: 0,
      mimeType: "application/pdf",
    };

    if (file) {
      validateUploadedFile(file);
      uploadResult = await this.minioService.uploadFile(file, "resumes", orgId);
    } else if (dto.resumeUrl) {
      uploadResult = {
        url: dto.resumeUrl,
        originalName: dto.resumeFileName || "Candidate Profile",
        size: 0,
        mimeType: "application/pdf",
      };
    }

    let dateOfBirth: Date | null = null;
    if (dto.dateOfBirth && dto.dateOfBirth.trim() && dto.dateOfBirth !== "—") {
      const parsed = new Date(dto.dateOfBirth.trim());
      if (!isNaN(parsed.getTime())) {
        dateOfBirth = parsed;
      }
    }

    let firstName = dto.firstName?.trim() || null;
    let lastName = dto.lastName?.trim() || null;
    if (!firstName && !lastName && dto.name) {
      const parts = dto.name.trim().split(/\s+/);
      if (parts.length > 1) {
        firstName = parts[parts.length - 1];
        lastName = parts.slice(0, -1).join(" ");
      } else {
        firstName = parts[0] || null;
      }
    }

    const created = await this.prisma.candidate.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: orgId,
        name: dto.name.trim(),
        firstName,
        lastName,
        gender: dto.gender ? dto.gender : null,
        dateOfBirth,
        email,
        phone: dto.phone?.trim() || null,
        notes: dto.notes || null,
        resumeUrl: uploadResult.url || null,
        resumeFileName: uploadResult.originalName || null,
        resumeFileSize: uploadResult.size || null,
        resumeMimeType: uploadResult.mimeType || "application/pdf",
        updatedAt: toInstant(),
      },
    });

    return created;
  }

  async update(
    id: string,
    dto: UpdateCandidateDto,
    tenantOrgId?: string | null,
  ) {
    await this.profileService.findOne(id, tenantOrgId);

    const updatePayload: Record<string, unknown> = {};
    if (dto.name !== undefined) updatePayload.name = dto.name.trim();
    if (dto.firstName !== undefined)
      updatePayload.firstName = dto.firstName?.trim() || null;
    if (dto.lastName !== undefined)
      updatePayload.lastName = dto.lastName?.trim() || null;
    if (dto.gender !== undefined) {
      updatePayload.gender = dto.gender ? dto.gender : null;
    }
    if (dto.dateOfBirth !== undefined) {
      if (
        dto.dateOfBirth &&
        dto.dateOfBirth.trim() &&
        dto.dateOfBirth !== "—"
      ) {
        const parsed = new Date(dto.dateOfBirth.trim());
        updatePayload.dateOfBirth = !isNaN(parsed.getTime())
          ? parsed
          : null;
      } else {
        updatePayload.dateOfBirth = null;
      }
    }
    if (dto.email !== undefined)
      updatePayload.email = dto.email.trim().toLowerCase();
    if (dto.phone !== undefined)
      updatePayload.phone = dto.phone?.trim() || null;
    if (dto.notes !== undefined) updatePayload.notes = dto.notes;
    if (dto.resumeUrl !== undefined) updatePayload.resumeUrl = dto.resumeUrl;
    if (dto.resumeFileName !== undefined)
      updatePayload.resumeFileName = dto.resumeFileName;

    await this.prisma.candidate.update({
      where: { id },
      data: updatePayload,
    });
    return this.profileService.findOne(id, tenantOrgId);
  }

  async remove(id: string, tenantOrgId?: string | null) {
    await this.profileService.findOne(id, tenantOrgId);

    // Soft delete within atomic transaction (Two-Tier Deletion Protocol)
    await runInTransaction(this.prisma, async (tx) => {
      await tx.candidate.update({
        where: { id },
        data: {
          deletedAt: toInstant(),
        },
      });
    });

    return { success: true, message: `Candidate ${id} deleted successfully` };
  }
}
