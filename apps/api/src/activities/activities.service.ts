import { Inject, Injectable } from "@nestjs/common";
import { APP_ERROR_CODES } from "@haihire/shared";
import { AppForbiddenException } from "../common/app-exception";
import { PrismaService } from "../prisma/prisma.service";
import { toInstant } from "../common/date.util";
import crypto from "node:crypto";

export type ActivityType =
  | "APPLIED"
  | "STAGE_CHANGED"
  | "EMAIL_SENT"
  | "INTERVIEW_SCHEDULED"
  | "INTERVIEW_UPDATED"
  | "SCORECARD_SUBMITTED"
  | "NOTE_ADDED";

export interface CreateActivityDto {
  organizationId: string;
  candidateId: string;
  applicationId?: string | null;
  type: ActivityType;
  title: string;
  description: string;
  actorId?: string | null;
  actorName: string;
  actorRole?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class ActivitiesService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async createActivity(dto: CreateActivityDto) {
    if (!dto.organizationId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
        "User must belong to an organization to record an activity.",
      );
    }

    const id = crypto.randomUUID();
    const metadataStr = dto.metadata ? JSON.stringify(dto.metadata) : null;

    return this.prisma.activityLog.create({
      data: {
        id,
        organizationId: dto.organizationId,
        candidateId: dto.candidateId,
        applicationId: dto.applicationId || null,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        actorId: dto.actorId || null,
        actorName: dto.actorName,
        actorRole: dto.actorRole || null,
        metadata: metadataStr,
        updatedAt: toInstant(),
      },
    });
  }

  async findByCandidate(
    candidateId: string,
    organizationId?: string,
    pagination?: { page?: number; limit?: number },
    tenantOrgId?: string | null,
  ) {
    if (organizationId && tenantOrgId && organizationId !== tenantOrgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
        "Access denied: cannot access activities from another organization.",
        { candidateId, organizationId },
      );
    }
    const targetOrgId = tenantOrgId || organizationId || undefined;

    const page = pagination?.page && pagination.page > 0 ? pagination.page : 1;
    const limit =
      pagination?.limit && pagination.limit > 0 ? pagination.limit : 20;

    const where = {
      candidateId,
      ...(targetOrgId ? { organizationId: targetOrgId } : {}),
    };

    const [total, activities] = await Promise.all([
      this.prisma.activityLog.count({ where }),
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const data = activities.map((item) => ({
      ...item,
      metadata: item.metadata ? this.safeParse(item.metadata) : null,
    }));

    const totalPages = Math.ceil(total / limit) || 1;
    return { data, total, page, limit, totalPages };
  }

  async findByApplication(
    applicationId: string,
    organizationId?: string,
    pagination?: { page?: number; limit?: number },
    tenantOrgId?: string | null,
  ) {
    if (organizationId && tenantOrgId && organizationId !== tenantOrgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
        "Access denied: cannot access activities from another organization.",
        { applicationId, organizationId },
      );
    }
    const targetOrgId = tenantOrgId || organizationId || undefined;

    const page = pagination?.page && pagination.page > 0 ? pagination.page : 1;
    const limit =
      pagination?.limit && pagination.limit > 0 ? pagination.limit : 20;

    const where = {
      applicationId,
      ...(targetOrgId ? { organizationId: targetOrgId } : {}),
    };

    const [total, activities] = await Promise.all([
      this.prisma.activityLog.count({ where }),
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const data = activities.map((item) => ({
      ...item,
      metadata: item.metadata ? this.safeParse(item.metadata) : null,
    }));

    const totalPages = Math.ceil(total / limit) || 1;
    return { data, total, page, limit, totalPages };
  }

  private safeParse(json: string) {
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
}
