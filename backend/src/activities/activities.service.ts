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

  async findByCandidate(candidateId: string, organizationId?: string) {
    let query = (this.prisma.db.orm.public as any).ActivityLog
      .where((a: any) => a.candidateId.eq(candidateId));

    if (organizationId) {
      query = query.where((a: any) => a.organizationId.eq(organizationId));
    }

    const activities = await query.all();
    return activities
      .map((item: any) => ({
        ...item,
        metadata: item.metadata ? this.safeParse(item.metadata) : null,
      }))
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async findByApplication(applicationId: string, organizationId?: string) {
    let query = (this.prisma.db.orm.public as any).ActivityLog
      .where((a: any) => a.applicationId.eq(applicationId));

    if (organizationId) {
      query = query.where((a: any) => a.organizationId.eq(organizationId));
    }

    const activities = await query.all();
    return activities
      .map((item: any) => ({
        ...item,
        metadata: item.metadata ? this.safeParse(item.metadata) : null,
      }))
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  private safeParse(json: string) {
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
}
