import { Inject, Injectable } from "@nestjs/common";
import crypto from "node:crypto";
import { APP_ERROR_CODES } from "@haihire/shared";
import {
  AppBadRequestException,
  AppConflictException,
  AppForbiddenException,
} from "../../common/app-exception";
import { MinioService } from "../../minio/minio.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CandidatesProfileService } from "./candidates-profile.service";
import { CreateCandidateDto } from "../dto/create-candidate.dto";
import { UpdateCandidateDto } from "../dto/update-candidate.dto";
import { fixUtf8String } from "../../common/doc-utils";
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

  private async executeTx<T>(
    fn: (tx: PrismaService["db"]) => Promise<T>,
  ): Promise<T> {
    const p = this.prisma as unknown as {
      transaction?: (cb: (tx: PrismaService["db"]) => Promise<T>) => Promise<T>;
      executeTx?: (cb: (tx: PrismaService["db"]) => Promise<T>) => Promise<T>;
      db: PrismaService["db"];
    };
    if (typeof p.transaction === "function") {
      return p.transaction(fn);
    }
    if (typeof p.executeTx === "function") {
      return p.executeTx(fn);
    }
    return fn(this.prisma.db);
  }

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

    const candidates = await this.prisma.db.orm.public.Candidate.select(
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
      .where((c) => c.organizationId.eq(targetOrgId))
      .all();

    let filtered = candidates.filter((c) => !c.deletedAt);

    if (filtered.length === 0) {
      return {
        data: [],
        total: 0,
        page: 1,
        limit: options?.limit || 10,
        totalPages: 0,
      };
    }
    if (options?.search && options.search.trim() !== "") {
      const q = options.search.trim().toLowerCase();
      filtered = filtered.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(q) ||
          (c.email || "").toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q)) ||
          (c.notes && c.notes.toLowerCase().includes(q)),
      );
    }

    const total = filtered.length;
    const page = options?.page && options.page > 0 ? options.page : 1;
    const limit = options?.limit && options.limit > 0 ? options.limit : 20;
    const totalPages = Math.ceil(total / limit) || 1;

    // Slicing on server for this page
    const pagedCandidates = filtered.slice((page - 1) * limit, page * limit);
    const candidateIds = pagedCandidates.map((c) => c.id);

    // Fetch applications only for the candidates in the current page
    const allApps =
      candidateIds.length > 0
        ? await this.prisma.db.orm.public.Application.select(
            "id",
            "candidateId",
            "jobId",
            "stage",
            "createdAt",
          )
            .where((a) => a.candidateId.in(candidateIds))
            .all()
        : [];

    const appsByCandidate = new Map<string, typeof allApps>();
    for (const app of allApps) {
      const list = appsByCandidate.get(app.candidateId) || [];
      list.push(app);
      appsByCandidate.set(app.candidateId, list);
    }

    const data = pagedCandidates.map((c) => {
      const apps = appsByCandidate.get(c.id) || [];
      return {
        ...c,
        name: fixUtf8String(c.name),
        firstName: fixUtf8String(c.firstName),
        lastName: fixUtf8String(c.lastName),
        notes: fixUtf8String(c.notes),
        resumeFileName: fixUtf8String(c.resumeFileName),
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
    const existing = await this.prisma.db.orm.public.Candidate.select("id")
      .where((c) => c.organizationId.eq(orgId))
      .where((c) => c.email.eq(email))
      .first();

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

    let dateOfBirth: Temporal.Instant | null = null;
    if (dto.dateOfBirth && dto.dateOfBirth.trim() && dto.dateOfBirth !== "—") {
      const parsed = new Date(dto.dateOfBirth.trim());
      if (!isNaN(parsed.getTime())) {
        dateOfBirth = Temporal.Instant.fromEpochMilliseconds(parsed.getTime());
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

    const created = await this.prisma.db.orm.public.Candidate.create({
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
          ? Temporal.Instant.fromEpochMilliseconds(parsed.getTime())
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

    await this.prisma.db.orm.public.Candidate.where((c) => c.id.eq(id)).update(
      updatePayload,
    );
    return this.profileService.findOne(id, tenantOrgId);
  }

  async remove(id: string, tenantOrgId?: string | null) {
    await this.profileService.findOne(id, tenantOrgId);

    // Soft delete within atomic transaction (Two-Tier Deletion Protocol)
    await this.executeTx(async (tx) => {
      await tx.orm.public.Candidate.where((c) => c.id.eq(id)).update({
        deletedAt: toInstant(),
      });
    });

    return { success: true, message: `Candidate ${id} deleted successfully` };
  }
}
