import { Inject, Injectable } from "@nestjs/common";
import crypto from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { toInstant } from "../../common/date.util";

export interface OrgAuditLogFilter {
  action?: string;
  resource?: string;
  limit?: number;
  offset?: number;
}

export interface PlatformAuditLogFilter {
  organizationId?: string;
  action?: string;
  resource?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class OrganizationsAuditLogService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  private safeParse(value: string | null): unknown {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  async logOrg(
    organizationId: string,
    actorId: string | null,
    action: string,
    resource: string,
    metadata?: Record<string, unknown> | null,
  ) {
    const id = crypto.randomUUID();
    const metadataStr = metadata ? JSON.stringify(metadata) : null;
    return this.prisma.organizationAuditLog.create({
      data: {
        id,
        organizationId,
        actorId: actorId || null,
        action,
        resource,
        metadata: metadataStr,
        createdAt: toInstant(),
      },
    });
  }

  async logPlatform(
    organizationId: string,
    actorId: string,
    action: string,
    resource: string,
    metadata?: Record<string, unknown> | null,
  ) {
    const id = crypto.randomUUID();
    const metadataStr = metadata ? JSON.stringify(metadata) : null;
    return this.prisma.platformAuditLog.create({
      data: {
        id,
        organizationId,
        actorId,
        action,
        resource,
        metadata: metadataStr,
        createdAt: toInstant(),
      },
    });
  }

  async findAllOrg(organizationId: string, filter: OrgAuditLogFilter = {}) {
    const limit = Math.min(Math.max(filter.limit ?? 50, 1), 100);
    const offset = Math.max(filter.offset ?? 0, 0);

    const where: Record<string, unknown> = { organizationId };
    if (filter.action) where.action = filter.action;
    if (filter.resource) where.resource = filter.resource;

    const [total, pagedLogs] = await Promise.all([
      this.prisma.organizationAuditLog.count({
        where: { ...where, organizationId },
      }),
      this.prisma.organizationAuditLog.findMany({
        where: { ...where, organizationId },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
    ]);
    // Pagination handled by Prisma database query

    const actorIds = Array.from(
      new Set(pagedLogs.map((l) => l.actorId).filter(Boolean)),
    ) as string[];

    const actors =
      actorIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              avatarUrl: true,
              organizationId: true,
            },
          })
        : [];

    const actorMap = new Map(actors.map((u) => [u.id, u]));

    const data = pagedLogs.map((log) => ({
      id: log.id,
      organizationId: log.organizationId,
      actorId: log.actorId,
      action: log.action,
      resource: log.resource,
      metadata: this.safeParse(log.metadata),
      createdAt: log.createdAt,
      actor: log.actorId ? actorMap.get(log.actorId) || null : null,
    }));

    return {
      data,
      total,
      limit,
      offset,
    };
  }

  async findAllPlatform(filter: PlatformAuditLogFilter = {}) {
    const limit = Math.min(Math.max(filter.limit ?? 50, 1), 100);
    const offset = Math.max(filter.offset ?? 0, 0);

    const where: Record<string, unknown> = {};
    if (filter.organizationId) where.organizationId = filter.organizationId;
    if (filter.action) where.action = filter.action;
    if (filter.resource) where.resource = filter.resource;

    const [total, pagedLogs] = await Promise.all([
      this.prisma.platformAuditLog.count({ where }),
      this.prisma.platformAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
    ]);
    // Pagination handled by database query

    const data = pagedLogs.map((log) => ({
      id: log.id,
      organizationId: log.organizationId,
      actorId: log.actorId,
      action: log.action,
      resource: log.resource,
      metadata: this.safeParse(log.metadata),
      createdAt: log.createdAt,
    }));

    return {
      data,
      total,
      limit,
      offset,
    };
  }
}
