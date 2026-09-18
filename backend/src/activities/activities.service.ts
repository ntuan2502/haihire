import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import crypto from "node:crypto";

export interface CreateActivityDto {
  organizationId: string;
  candidateId: string;
  applicationId?: string | null;
  type: string;
  title: string;
  description: string;
  actorId?: string | null;
  actorName: string;
  actorRole?: string | null;
  metadata?: Record<string, any> | null;
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

    return (this.prisma.db.orm.public as any).ActivityLog.create({
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
    let query = (this.prisma.db.orm.public as any).ActivityLog
      .where((a: any) => a.candidateId.eq(candidateId));

    if (organizationId) {
      query = query.where((a: any) => a.organizationId.eq(organizationId));
    }

    const activities = await query.all();
    const sorted = activities
      .map((item: any) => ({
        ...item,
        metadata: item.metadata ? this.safeParse(item.metadata) : null,
      }))
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (pagination?.page !== undefined || pagination?.limit !== undefined) {
      const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
      const limit = pagination.limit && pagination.limit > 0 ? pagination.limit : 20;
      const total = sorted.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const data = sorted.slice((page - 1) * limit, page * limit);
      return { data, total, page, limit, totalPages };
    }

    return sorted;
  }

  async findByApplication(
    applicationId: string,
    organizationId?: string,
    pagination?: { page?: number; limit?: number },
  ) {
    let query = (this.prisma.db.orm.public as any).ActivityLog
      .where((a: any) => a.applicationId.eq(applicationId));

    if (organizationId) {
      query = query.where((a: any) => a.organizationId.eq(organizationId));
    }

    const activities = await query.all();
    const sorted = activities
      .map((item: any) => ({
        ...item,
        metadata: item.metadata ? this.safeParse(item.metadata) : null,
      }))
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (pagination?.page !== undefined || pagination?.limit !== undefined) {
      const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
      const limit = pagination.limit && pagination.limit > 0 ? pagination.limit : 20;
      const total = sorted.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const data = sorted.slice((page - 1) * limit, page * limit);
      return { data, total, page, limit, totalPages };
    }

    return sorted;
  }

  private safeParse(json: string) {
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
}
