import { Inject, Injectable } from "@nestjs/common";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { formatUserDisplayName } from "@haihire/shared";
import { resolveOrgNameDisplayOrder } from "../../common/candidate-name.util";
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

  private safeParse(value: unknown): unknown {
    if (!value) return null;
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }

  async logOrg(
    organizationId: string,
    actorId: string | null,
    action: string,
    resource: string,
    metadata?: Record<string, unknown> | null,
    tx?: PrismaService,
  ) {
    const id = crypto.randomUUID();
    const meta = metadata ? (metadata as Prisma.InputJsonValue) : Prisma.DbNull;
    const client = tx ?? this.prisma;
    return client.organizationAuditLog.create({
      data: {
        id,
        organizationId,
        actorId: actorId || null,
        action,
        resource,
        metadata: meta,
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
    const meta = metadata ? (metadata as Prisma.InputJsonValue) : Prisma.DbNull;
    return this.prisma.platformAuditLog.create({
      data: {
        id,
        organizationId,
        actorId,
        action,
        resource,
        metadata: meta,
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

    const nameOrder = await resolveOrgNameDisplayOrder(
      this.prisma,
      organizationId,
    );

    const actors =
      actorIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
            },
          })
        : [];

    const actorMap = new Map(
      actors.map((u) => [
        u.id,
        {
          ...u,
          name: formatUserDisplayName(u, nameOrder),
        },
      ]),
    );

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
