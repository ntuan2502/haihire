import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
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
    const id = crypto.randomUUID();
    const metadataStr = dto.metadata ? JSON.stringify(dto.metadata) : null;

    return this.prisma.db.orm.public.ActivityLog.create({
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
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async findByCandidate(
    candidateId: string,
    organizationId?: string,
    pagination?: { page?: number; limit?: number },
  ) {
    let query = this.prisma.db.orm.public.ActivityLog
      .where((a) => a.candidateId.eq(candidateId));

    if (organizationId) {
      query = query.where((a) => a.organizationId.eq(organizationId));
    }

    const activities = await query.all();
    const sorted = activities
      .map((item) => ({
        ...item,
        metadata: item.metadata ? this.safeParse(item.metadata) : null,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const page = pagination?.page && pagination.page > 0 ? pagination.page : 1;
    const limit = pagination?.limit && pagination.limit > 0 ? pagination.limit : 20;
    const total = sorted.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const data = sorted.slice((page - 1) * limit, page * limit);

    return { data, total, page, limit, totalPages };
  }

  async findByApplication(
    applicationId: string,
    organizationId?: string,
    pagination?: { page?: number; limit?: number },
  ) {
    let query = this.prisma.db.orm.public.ActivityLog
      .where((a) => a.applicationId.eq(applicationId));

    if (organizationId) {
      query = query.where((a) => a.organizationId.eq(organizationId));
    }

    const activities = await query.all();
    const sorted = activities
      .map((item) => ({
        ...item,
        metadata: item.metadata ? this.safeParse(item.metadata) : null,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const page = pagination?.page && pagination.page > 0 ? pagination.page : 1;
    const limit = pagination?.limit && pagination.limit > 0 ? pagination.limit : 20;
    const total = sorted.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const data = sorted.slice((page - 1) * limit, page * limit);

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
