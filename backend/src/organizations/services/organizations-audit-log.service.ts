import { Inject, Injectable } from "@nestjs/common";
import crypto from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { toInstant, toTimestamp } from "../../common/date.util";

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
    return this.prisma.db.orm.public.OrganizationAuditLog.create({
      id,
      organizationId,
      actorId: actorId || null,
      action,
      resource,
      metadata: metadataStr,
      createdAt: toInstant(),
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
    return this.prisma.db.orm.public.PlatformAuditLog.create({
      id,
      organizationId,
      actorId,
      action,
      resource,
      metadata: metadataStr,
      createdAt: toInstant(),
    });
  }

  async findAllOrg(organizationId: string, filter: OrgAuditLogFilter = {}) {
    const limit = Math.min(Math.max(filter.limit ?? 50, 1), 100);
    const offset = Math.max(filter.offset ?? 0, 0);

    let query = this.prisma.db.orm.public.OrganizationAuditLog.select(
      "id",
      "organizationId",
      "actorId",
      "action",
      "resource",
      "metadata",
      "createdAt",
    ).where((l) => l.organizationId.eq(organizationId));

    if (filter.action) {
      query = query.where((l) => l.action.eq(filter.action!));
    }
    if (filter.resource) {
      query = query.where((l) => l.resource.eq(filter.resource!));
    }

    const logs = await query.all();
    const sorted = logs.sort(
      (a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt),
    );
    const total = sorted.length;
    const pagedLogs = sorted.slice(offset, offset + limit);

    const actorIds = Array.from(
      new Set(pagedLogs.map((l) => l.actorId).filter(Boolean)),
    ) as string[];

    const actors =
      actorIds.length > 0
        ? await this.prisma.db.orm.public.User.select(
            "id",
            "name",
            "email",
            "role",
            "avatarUrl",
            "organizationId",
          )
            .where((u) => u.id.in(actorIds))
            .all()
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

    let query = this.prisma.db.orm.public.PlatformAuditLog.select(
      "id",
      "organizationId",
      "actorId",
      "action",
      "resource",
      "metadata",
      "createdAt",
    );

    if (filter.organizationId) {
      query = query.where((l) => l.organizationId.eq(filter.organizationId!));
    }
    if (filter.action) {
      query = query.where((l) => l.action.eq(filter.action!));
    }
    if (filter.resource) {
      query = query.where((l) => l.resource.eq(filter.resource!));
    }

    const logs = await query.all();
    const sorted = logs.sort(
      (a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt),
    );
    const total = sorted.length;
    const pagedLogs = sorted.slice(offset, offset + limit);

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
