import { Inject, Injectable, Optional } from "@nestjs/common";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import {
  APP_ERROR_CODES,
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
  SourcingChannel,
  type PaginatedResult,
  type TrackingLinkItem,
} from "@haihire/shared";
import { computeAuditDiff } from "../../common/audit-diff.util";
import {
  AppBadRequestException,
  AppForbiddenException,
  AppNotFoundException,
} from "../../common/app-exception";
import { PrismaService } from "../../prisma/prisma.service";
import { ActivitiesService } from "../../activities/activities.service";
import { CreateTrackingLinkDto } from "../dto/create-tracking-link.dto";
import { UpdateTrackingLinkDto } from "../dto/update-tracking-link.dto";
import { toTimestamp, toInstant } from "../../common/date.util";
import { EventsService } from "../../events/events.service";
import { OrganizationsAuditLogService } from "../../organizations/services/organizations-audit-log.service";

export function parseDomain(urlStr?: string | null): string | null {
  if (!urlStr) return null;
  try {
    let normalized = urlStr.trim();
    if (
      !normalized.startsWith("http://") &&
      !normalized.startsWith("https://")
    ) {
      normalized = `https://${normalized}`;
    }
    const parsed = new URL(normalized);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

@Injectable()
export class SourcingLinksService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(ActivitiesService)
    private readonly activitiesService?: ActivitiesService,
    @Optional()
    @Inject(EventsService)
    private readonly eventsService?: EventsService,
    @Optional()
    @Inject(OrganizationsAuditLogService)
    private readonly auditLog?: OrganizationsAuditLogService,
  ) {}

  async getLinks(
    organizationId: string,
    pagination: {
      page?: number;
      limit?: number;
      search?: string;
      jobId?: string;
      isActive?: boolean;
    },
  ): Promise<PaginatedResult<TrackingLinkItem>> {
    const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
    const limit =
      pagination.limit && pagination.limit > 0 ? pagination.limit : 20;

    const where: Prisma.TrackingLinkWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (pagination.isActive !== undefined) {
      where.isActive = pagination.isActive;
    }

    if (pagination.jobId) {
      where.jobId = pagination.jobId;
    }

    if (pagination.search) {
      const q = pagination.search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { token: { contains: q, mode: "insensitive" } },
        { campaign: { contains: q, mode: "insensitive" } },
        { utmCampaign: { contains: q, mode: "insensitive" } },
      ];
    }

    const [links, total] = await Promise.all([
      this.prisma.trackingLink.findMany({
        where: { ...where, organizationId },
        include: {
          job: {
            where: { deletedAt: null },
            select: { title: true },
          },
          _count: {
            select: {
              applications: {
                where: {
                  candidate: { deletedAt: null },
                  job: { deletedAt: null },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.trackingLink.count({
        where: { ...where, organizationId },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    let appCountMap: Map<string, number> | null = null;
    let jobTitleMap: Map<string, string> | null = null;
    const missingCounts = links.some(
      (l) =>
        (l as unknown as { _count?: { applications?: number } })._count ===
        undefined,
    );
    if (missingCounts && links.length > 0) {
      const allApps = await this.prisma.application.findMany({
        where: {
          organizationId,
          trackingLinkId: { in: links.map((l) => l.id) },
        },
        select: { trackingLinkId: true },
      });
      appCountMap = new Map();
      for (const app of allApps) {
        if (app.trackingLinkId) {
          appCountMap.set(
            app.trackingLinkId,
            (appCountMap.get(app.trackingLinkId) || 0) + 1,
          );
        }
      }
    }

    const missingJobRel = links.some((l) => !l.job && l.jobId);
    if (missingJobRel) {
      const jobIds = Array.from(
        new Set(links.map((l) => l.jobId).filter(Boolean)),
      ) as string[];
      if (jobIds.length > 0) {
        const jobs = await this.prisma.job.findMany({
          where: { organizationId, id: { in: jobIds }, deletedAt: null },
          select: { id: true, title: true },
        });
        jobTitleMap = new Map(jobs.map((j) => [j.id, j.title]));
      }
    }

    const data: TrackingLinkItem[] = links.map((l) => {
      const apps =
        (l as unknown as { _count?: { applications?: number } })._count
          ?.applications ?? (appCountMap ? appCountMap.get(l.id) || 0 : 0);
      const clicks = l.clicksCount || 0;
      const cvr = clicks > 0 ? Math.round((apps / clicks) * 100) : 0;
      return {
        id: l.id,
        organizationId: l.organizationId,
        name: l.name,
        token: l.token,
        source: l.source as SourcingChannel,
        customSource: l.customSource,
        jobId: l.jobId,
        jobTitle:
          l.job?.title ??
          (l.jobId && jobTitleMap ? (jobTitleMap.get(l.jobId) ?? null) : null),
        campaign: l.campaign,
        medium: l.medium,
        utmSource:
          l.utmSource ?? (l.source ? String(l.source).toLowerCase() : null),
        utmMedium: l.utmMedium ?? l.medium ?? null,
        utmCampaign: l.utmCampaign ?? l.campaign ?? null,
        utmTerm: l.utmTerm ?? null,
        utmContent: l.utmContent ?? null,
        clicksCount: clicks,
        applicationsCount: apps,
        conversionRate: cvr,
        isActive: l.isActive,
        createdAt: new Date(toTimestamp(l.createdAt)).toISOString(),
        updatedAt: new Date(toTimestamp(l.updatedAt)).toISOString(),
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

  async createLink(
    organizationId: string,
    userId: string,
    dto: CreateTrackingLinkDto,
  ): Promise<TrackingLinkItem> {
    if (!organizationId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
        "Organization ID is required",
      );
    }

    if (dto.jobId) {
      const job = await this.prisma.job.findFirst({
        where: { id: dto.jobId as string, deletedAt: null },
        select: { id: true, organizationId: true, deletedAt: true },
      });
      if (!job || job.deletedAt || job.organizationId !== organizationId) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.JOB_NOT_FOUND,
          "Target job not found in this organization",
        );
      }
    }

    const token = `lnk-${crypto.randomBytes(3).toString("hex")}`;
    const id = crypto.randomUUID();

    const utmSource = dto.utmSource?.trim() || dto.source.toLowerCase();
    const utmMedium = dto.utmMedium?.trim() || dto.medium?.trim() || null;
    const utmCampaign = dto.utmCampaign?.trim() || dto.campaign?.trim() || null;
    const utmTerm = dto.utmTerm?.trim() || null;
    const utmContent = dto.utmContent?.trim() || null;

    const created = await this.prisma.trackingLink.create({
      data: {
        id,
        organizationId,
        name: dto.name.trim(),
        token,
        source: dto.source,
        customSource: dto.customSource?.trim() || null,
        jobId: dto.jobId || null,
        campaign: utmCampaign,
        medium: utmMedium,
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
        clicksCount: 0,
        isActive: true,
        createdById: userId || null,
        updatedAt: toInstant(),
      },
    });

    let jobTitle: string | null = null;
    if (dto.jobId) {
      const j = await this.prisma.job.findFirst({
        where: { id: dto.jobId as string, organizationId, deletedAt: null },
        select: { title: true },
      });
      jobTitle = j?.title || null;
    }

    this.eventsService?.emit({
      type: "SOURCING_CHANGED",
      organizationId: created.organizationId,
      data: { linkId: created.id },
    });

    try {
      await this.auditLog?.logOrg(
        created.organizationId,
        userId || null,
        AUDIT_ACTIONS.SOURCING_LINK_CREATED,
        AUDIT_RESOURCES.SOURCING_LINK,
        {
          source: created.source,
          token: created.token,
          jobId: created.jobId,
        },
        undefined,
        {
          targetId: created.id,
          targetLabel: created.name,
        },
      );
    } catch {
      // Fail-open audit logging
    }

    return {
      id: created.id,
      organizationId: created.organizationId,
      name: created.name,
      token: created.token,
      source: created.source as SourcingChannel,
      customSource: created.customSource,
      jobId: created.jobId,
      jobTitle,
      campaign: created.campaign,
      medium: created.medium,
      utmSource: created.utmSource,
      utmMedium: created.utmMedium,
      utmCampaign: created.utmCampaign,
      utmTerm: created.utmTerm,
      utmContent: created.utmContent,
      clicksCount: 0,
      applicationsCount: 0,
      conversionRate: 0,
      isActive: created.isActive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async updateLink(
    organizationId: string,
    id: string,
    dto: UpdateTrackingLinkDto,
    actorId?: string | null,
  ): Promise<void> {
    const link = await this.prisma.trackingLink.findFirst({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        deletedAt: true,
        name: true,
        source: true,
        customSource: true,
        jobId: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        utmTerm: true,
        utmContent: true,
        isActive: true,
      },
    });

    if (!link || link.deletedAt) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.TRACKING_LINK_NOT_FOUND,
        "Tracking link not found",
      );
    }

    if (link.organizationId !== organizationId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
        "Access denied",
      );
    }

    if (dto.jobId) {
      const job = await this.prisma.job.findFirst({
        where: { id: dto.jobId, organizationId, deletedAt: null },
        select: { id: true },
      });
      if (!job) {
        throw new AppNotFoundException(
          APP_ERROR_CODES.JOB_NOT_FOUND,
          "Job not found",
        );
      }
    }

    const updateData: Record<string, unknown> = {
      updatedAt: toInstant(),
    };
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.source !== undefined) updateData.source = dto.source;
    if (dto.customSource !== undefined)
      updateData.customSource = dto.customSource?.trim() || null;
    if (dto.jobId !== undefined) updateData.jobId = dto.jobId || null;
    if (dto.utmSource !== undefined)
      updateData.utmSource = dto.utmSource?.trim() || null;
    if (dto.utmMedium !== undefined) {
      updateData.utmMedium = dto.utmMedium?.trim() || null;
      updateData.medium = dto.utmMedium?.trim() || null;
    }
    if (dto.utmCampaign !== undefined) {
      updateData.utmCampaign = dto.utmCampaign?.trim() || null;
      updateData.campaign = dto.utmCampaign?.trim() || null;
    }
    if (dto.utmTerm !== undefined)
      updateData.utmTerm = dto.utmTerm?.trim() || null;
    if (dto.utmContent !== undefined)
      updateData.utmContent = dto.utmContent?.trim() || null;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    await this.prisma.trackingLink.update({
      where: { id },
      data: updateData,
    });

    this.eventsService?.emit({
      type: "SOURCING_CHANGED",
      organizationId,
      data: { linkId: id },
    });

    const beforeSnapshot = {
      name: link.name,
      source: link.source,
      customSource: link.customSource ?? null,
      jobId: link.jobId ?? null,
      utmSource: link.utmSource ?? null,
      utmMedium: link.utmMedium ?? null,
      utmCampaign: link.utmCampaign ?? null,
      utmTerm: link.utmTerm ?? null,
      utmContent: link.utmContent ?? null,
      isActive: link.isActive,
    };
    const afterSnapshot = {
      name: dto.name !== undefined ? dto.name.trim() : link.name,
      source: dto.source !== undefined ? dto.source : link.source,
      customSource:
        dto.customSource !== undefined
          ? dto.customSource?.trim() || null
          : (link.customSource ?? null),
      jobId: dto.jobId !== undefined ? dto.jobId || null : (link.jobId ?? null),
      utmSource:
        dto.utmSource !== undefined
          ? dto.utmSource?.trim() || null
          : (link.utmSource ?? null),
      utmMedium:
        dto.utmMedium !== undefined
          ? dto.utmMedium?.trim() || null
          : (link.utmMedium ?? null),
      utmCampaign:
        dto.utmCampaign !== undefined
          ? dto.utmCampaign?.trim() || null
          : (link.utmCampaign ?? null),
      utmTerm:
        dto.utmTerm !== undefined
          ? dto.utmTerm?.trim() || null
          : (link.utmTerm ?? null),
      utmContent:
        dto.utmContent !== undefined
          ? dto.utmContent?.trim() || null
          : (link.utmContent ?? null),
      isActive: dto.isActive !== undefined ? dto.isActive : link.isActive,
    };
    const changes = computeAuditDiff(beforeSnapshot, afterSnapshot);
    if (changes.length > 0) {
      try {
        await this.auditLog?.logOrg(
          organizationId,
          actorId ?? null,
          AUDIT_ACTIONS.SOURCING_LINK_UPDATED,
          AUDIT_RESOURCES.SOURCING_LINK,
          {
            source: afterSnapshot.source,
          },
          undefined,
          {
            targetId: id,
            targetLabel: afterSnapshot.name,
            changes,
          },
        );
      } catch {
        // Fail-open audit logging
      }
    }
  }

  async deleteLink(
    organizationId: string,
    id: string,
    actorId?: string | null,
  ): Promise<void> {
    const link = await this.prisma.trackingLink.findFirst({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        deletedAt: true,
        name: true,
        source: true,
        token: true,
      },
    });

    if (!link || link.deletedAt) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.TRACKING_LINK_NOT_FOUND,
        "Tracking link not found",
      );
    }

    if (link.organizationId !== organizationId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
        "Access denied",
      );
    }

    await this.prisma.trackingLink.update({
      where: { id },
      data: {
        deletedAt: toInstant(),
        isActive: false,
        updatedAt: toInstant(),
      },
    });

    this.eventsService?.emit({
      type: "SOURCING_CHANGED",
      organizationId,
      data: { linkId: id },
    });

    try {
      await this.auditLog?.logOrg(
        organizationId,
        actorId ?? null,
        AUDIT_ACTIONS.SOURCING_LINK_DELETED,
        AUDIT_RESOURCES.SOURCING_LINK,
        {
          source: link.source,
          token: link.token,
        },
        undefined,
        {
          targetId: id,
          targetLabel: link.name,
        },
      );
    } catch {
      // Fail-open audit logging
    }
  }

  async findLinkByToken(token: string) {
    if (!token) return null;
    return this.prisma.trackingLink.findFirst({
      where: { token, deletedAt: null },
      select: {
        id: true,
        token: true,
        name: true,
        source: true,
        customSource: true,
        jobId: true,
        campaign: true,
        medium: true,
        isActive: true,
        deletedAt: true,
        organizationId: true,
      },
    });
  }
}
