import { Inject, Injectable } from "@nestjs/common";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import {
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
  formatUserDisplayName,
  type AuditChangeEntry,
  type AuditLogEnvelopeInput,
} from "@haihire/shared";
import { resolveOrgNameDisplayOrder } from "../../common/candidate-name.util";
import { PrismaService } from "../../prisma/prisma.service";
import { toInstant } from "../../common/date.util";
import { correlationStorage } from "../../common/middleware/correlation-id.middleware";

export interface OrgAuditLogFilter {
  action?: string;
  resource?: string;
  actorId?: string;
  targetId?: string;
  search?: string;
  from?: string;
  to?: string;
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

const EXPORT_MAX_ROWS = 1000;
const CSV_FORMULA_PREFIX_REGEX = /^[=+\-@\t\r]/;
const DAY_MS = 24 * 60 * 60 * 1000;

const SENSITIVE_AUDIT_ACTIONS = new Set<string>([
  AUDIT_ACTIONS.OWNERSHIP_TRANSFERRED,
  AUDIT_ACTIONS.ROLE_PERMISSIONS_UPDATED,
  AUDIT_ACTIONS.ROLE_PERMISSIONS_RESET,
  AUDIT_ACTIONS.MEMBER_REMOVED,
  AUDIT_ACTIONS.ORG_DELETED,
  AUDIT_ACTIONS.ORG_AUDIT_RETENTION_UPDATED,
  AUDIT_ACTIONS.JOB_DELETED,
  AUDIT_ACTIONS.CANDIDATE_DELETED,
  AUDIT_ACTIONS.APPLICATION_DELETED,
  AUDIT_ACTIONS.WEBHOOK_DELETED,
  AUDIT_ACTIONS.EMAIL_SETTINGS_UPDATED,
]);

function sanitizeCsvCell(value: unknown): string {
  const raw =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  const safe = CSV_FORMULA_PREFIX_REGEX.test(raw) ? `'${raw}` : raw;
  if (/[",\n\r]/.test(safe) || safe !== raw) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

function parseOptionalDate(raw?: string): Date | null {
  if (!raw?.trim()) return null;
  const parsed = new Date(raw.trim());
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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

  private parseChanges(value: unknown): AuditChangeEntry[] | null {
    const parsed = this.safeParse(value);
    if (!Array.isArray(parsed)) return null;
    return parsed as AuditChangeEntry[];
  }

  private buildOrgWhere(
    organizationId: string,
    filter: OrgAuditLogFilter,
  ): Record<string, unknown> {
    const where: Record<string, unknown> = { organizationId };
    if (filter.action?.trim()) where.action = filter.action.trim();
    if (filter.resource?.trim()) where.resource = filter.resource.trim();
    if (filter.actorId?.trim()) where.actorId = filter.actorId.trim();
    if (filter.targetId?.trim()) where.targetId = filter.targetId.trim();

    const fromDate = parseOptionalDate(filter.from);
    const toDate = parseOptionalDate(filter.to);
    if (fromDate || toDate) {
      const createdAtRange: Record<string, Date> = {};
      if (fromDate) createdAtRange.gte = fromDate;
      if (toDate) createdAtRange.lte = toDate;
      where.createdAt = createdAtRange;
    }

    const term = filter.search?.trim();
    if (term) {
      where.OR = [
        { targetLabel: { contains: term, mode: "insensitive" } },
        { actorNameSnapshot: { contains: term, mode: "insensitive" } },
        { actorEmailSnapshot: { contains: term, mode: "insensitive" } },
        { action: { contains: term, mode: "insensitive" } },
        { resource: { contains: term, mode: "insensitive" } },
        { requestId: { contains: term, mode: "insensitive" } },
      ];
    }

    return where;
  }

  private async queryAndEnrichOrgLogs(
    organizationId: string,
    where: Record<string, unknown>,
    options: { skip?: number; take: number },
  ) {
    const pagedLogs = await this.prisma.organizationAuditLog.findMany({
      where: { ...where, organizationId },
      orderBy: { createdAt: "desc" },
      skip: options.skip,
      take: options.take,
    });

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

    return pagedLogs.map((log) => {
      const liveActor = log.actorId ? actorMap.get(log.actorId) || null : null;
      const snapshotFallback =
        !liveActor && (log.actorNameSnapshot || log.actorEmailSnapshot)
          ? {
              id: log.actorId ?? "deleted-user",
              firstName: null,
              lastName: null,
              name: log.actorNameSnapshot || log.actorEmailSnapshot || "",
              email: log.actorEmailSnapshot || "",
              avatarUrl: null,
            }
          : null;

      return {
        id: log.id,
        organizationId: log.organizationId,
        actorId: log.actorId,
        action: log.action,
        resource: log.resource,
        targetId: log.targetId ?? null,
        targetLabel: log.targetLabel ?? null,
        actorNameSnapshot: log.actorNameSnapshot ?? null,
        actorEmailSnapshot: log.actorEmailSnapshot ?? null,
        changes: this.parseChanges(log.changes),
        metadata: this.safeParse(log.metadata),
        ipAddress: log.ipAddress ?? null,
        userAgent: log.userAgent ?? null,
        requestId: log.requestId ?? null,
        createdAt: log.createdAt,
        actor: liveActor ?? snapshotFallback,
      };
    });
  }

  async logOrg(
    organizationId: string,
    actorId: string | null,
    action: string,
    resource: string,
    metadata?: Record<string, unknown> | null,
    tx?: PrismaService,
    envelope?: AuditLogEnvelopeInput,
  ) {
    const id = crypto.randomUUID();
    const meta = metadata ? (metadata as Prisma.InputJsonValue) : Prisma.DbNull;
    const changesVal =
      envelope?.changes && envelope.changes.length > 0
        ? (envelope.changes as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull;
    const client = tx ?? this.prisma;
    const correlation = correlationStorage.getStore();

    let actorNameSnapshot = envelope?.actorNameSnapshot ?? null;
    let actorEmailSnapshot = envelope?.actorEmailSnapshot ?? null;

    if (
      actorId &&
      envelope?.actorNameSnapshot === undefined &&
      envelope?.actorEmailSnapshot === undefined
    ) {
      try {
        const actor = await client.user.findUnique({
          where: { id: actorId },
          select: { firstName: true, lastName: true, email: true },
        });
        if (actor) {
          actorNameSnapshot =
            formatUserDisplayName(actor, "LAST_FIRST") || actor.email || null;
          actorEmailSnapshot = actor.email ?? null;
        }
      } catch {
        // Best-effort snapshot only; preserve primary write path on lookup error
      }
    }

    return client.organizationAuditLog.create({
      data: {
        id,
        organizationId,
        actorId: actorId || null,
        action,
        resource,
        targetId: envelope?.targetId ?? null,
        targetLabel: envelope?.targetLabel ?? null,
        actorNameSnapshot,
        actorEmailSnapshot,
        changes: changesVal,
        metadata: meta,
        ipAddress: correlation?.ipAddress ?? null,
        userAgent: correlation?.userAgent ?? null,
        requestId: correlation?.requestId ?? null,
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
    const where = this.buildOrgWhere(organizationId, filter);

    const [total, data] = await Promise.all([
      this.prisma.organizationAuditLog.count({
        where: { ...where, organizationId },
      }),
      this.queryAndEnrichOrgLogs(organizationId, where, {
        skip: offset,
        take: limit,
      }),
    ]);

    return {
      data,
      total,
      limit,
      offset,
    };
  }

  async exportOrgLogs(
    organizationId: string,
    filter: OrgAuditLogFilter = {},
    format: "csv" | "json" = "csv",
  ) {
    const where = this.buildOrgWhere(organizationId, filter);
    const rows = await this.queryAndEnrichOrgLogs(organizationId, where, {
      take: EXPORT_MAX_ROWS,
    });
    const timestamp = toInstant().toISOString().slice(0, 10);

    if (format === "json") {
      return {
        filename: `audit-log-${timestamp}.json`,
        mimeType: "application/json; charset=utf-8",
        content: JSON.stringify(rows, null, 2),
      };
    }

    const headers = [
      "id",
      "createdAt",
      "actorName",
      "actorEmail",
      "action",
      "resource",
      "targetId",
      "targetLabel",
      "changes",
      "metadata",
      "ipAddress",
      "userAgent",
      "requestId",
    ];
    const lines = [
      headers.join(","),
      ...rows.map((row) =>
        [
          row.id,
          row.createdAt instanceof Date
            ? row.createdAt.toISOString()
            : row.createdAt,
          row.actor?.name ?? row.actorNameSnapshot ?? "",
          row.actor?.email ?? row.actorEmailSnapshot ?? "",
          row.action,
          row.resource,
          row.targetId ?? "",
          row.targetLabel ?? "",
          row.changes ?? "",
          row.metadata ?? "",
          row.ipAddress ?? "",
          row.userAgent ?? "",
          row.requestId ?? "",
        ]
          .map(sanitizeCsvCell)
          .join(","),
      ),
    ];

    return {
      filename: `audit-log-${timestamp}.csv`,
      mimeType: "text/csv; charset=utf-8",
      content: `\uFEFF${lines.join("\r\n")}`,
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

  async getOrgLogStats(organizationId: string) {
    const now = toInstant();
    const since24h = new Date(now.getTime() - DAY_MS);
    const since7d = new Date(now.getTime() - 7 * DAY_MS);

    const [total24h, sensitive7d, org] = await Promise.all([
      this.prisma.organizationAuditLog.count({
        where: {
          organizationId,
          createdAt: { gte: since24h },
        },
      }),
      this.prisma.organizationAuditLog.count({
        where: {
          organizationId,
          action: { in: Array.from(SENSITIVE_AUDIT_ACTIONS) },
          createdAt: { gte: since7d },
        },
      }),
      this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { auditLogRetentionDays: true },
      }),
    ]);

    return {
      total24h,
      sensitive7d,
      retentionDays: org?.auditLogRetentionDays ?? null,
    };
  }

  async updateRetentionPolicy(
    organizationId: string,
    actorId: string | null,
    retentionDays: number | null,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        auditLogRetentionDays: true,
      },
    });

    const previousRetentionDays = org?.auditLogRetentionDays ?? null;

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { auditLogRetentionDays: retentionDays },
    });

    if (previousRetentionDays !== retentionDays) {
      await this.logOrg(
        organizationId,
        actorId,
        AUDIT_ACTIONS.ORG_AUDIT_RETENTION_UPDATED,
        AUDIT_RESOURCES.ORGANIZATION,
        {
          previousRetentionDays,
          retentionDays,
        },
        undefined,
        {
          targetId: organizationId,
          targetLabel: org?.name ?? organizationId,
          changes: [
            {
              field: "auditLogRetentionDays",
              before: previousRetentionDays,
              after: retentionDays,
            },
          ],
        },
      );
    }

    return { retentionDays };
  }

  async purgeExpiredOrgLogs(): Promise<{
    scannedOrgs: number;
    deletedCount: number;
  }> {
    if (
      typeof this.prisma.organization?.findMany !== "function" ||
      typeof this.prisma.organizationAuditLog?.deleteMany !== "function"
    ) {
      return { scannedOrgs: 0, deletedCount: 0 };
    }

    const orgs = await this.prisma.organization.findMany({
      where: { auditLogRetentionDays: { not: null } },
      select: { id: true, auditLogRetentionDays: true },
    });

    const nowMs = toInstant().getTime();
    let deletedCount = 0;

    for (const org of orgs) {
      const days = org.auditLogRetentionDays;
      if (!days || days <= 0) continue;
      const cutoff = new Date(nowMs - days * DAY_MS);
      const res = await this.prisma.organizationAuditLog.deleteMany({
        where: {
          organizationId: org.id,
          createdAt: { lt: cutoff },
        },
      });
      deletedCount += res?.count ?? 0;
    }

    return { scannedOrgs: orgs.length, deletedCount };
  }
}
