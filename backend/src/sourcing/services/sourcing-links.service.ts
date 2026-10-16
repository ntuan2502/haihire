import { Inject, Injectable, Optional } from "@nestjs/common";
import crypto from "node:crypto";
import {
  APP_ERROR_CODES,
  SourcingChannel,
  type PaginatedResult,
  type TrackingLinkItem,
} from "@haihire/shared";
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

export function parseDomain(urlStr?: string | null): string | null {
  if (!urlStr) return null;
  try {
    let normalized = urlStr.trim();
    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
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
    const limit = pagination.limit && pagination.limit > 0 ? pagination.limit : 20;

    const links = await this.prisma.db.orm.public.TrackingLink.select(
      "id",
      "organizationId",
      "name",
      "token",
      "source",
      "customSource",
      "jobId",
      "campaign",
      "medium",
      "utmSource",
      "utmMedium",
      "utmCampaign",
      "utmTerm",
      "utmContent",
      "clicksCount",
      "isActive",
      "deletedAt",
      "createdAt",
      "updatedAt",
    )
      .where((l) => l.organizationId.eq(organizationId))
      .all();

    // Filter out deleted links
    let filtered = links.filter((l) => !l.deletedAt);

    if (pagination.isActive !== undefined) {
      filtered = filtered.filter((l) => l.isActive === pagination.isActive);
    }

    if (pagination.jobId) {
      filtered = filtered.filter((l) => l.jobId === pagination.jobId);
    }

    if (pagination.search) {
      const q = pagination.search.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.token.toLowerCase().includes(q) ||
          (l.campaign && l.campaign.toLowerCase().includes(q)) ||
          (l.utmCampaign && l.utmCampaign.toLowerCase().includes(q)),
      );
    }

    // Sort by createdAt desc
    filtered.sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt));

    // Get jobs to map job titles (scoped by organizationId)
    const jobIds = Array.from(new Set(filtered.map((l) => l.jobId).filter(Boolean))) as string[];
    const jobs = jobIds.length > 0
      ? await this.prisma.db.orm.public.Job.select("id", "title")
          .where((j) => j.organizationId.eq(organizationId))
          .where((j) => j.id.in(jobIds))
          .all()
      : [];
    const jobTitleMap = new Map(jobs.map((j) => [j.id, j.title]));

    // Count applications for each link (scoped to links belonging to this organization)
    const scopedLinkIds = filtered.map((l) => l.id);
    const allApps = scopedLinkIds.length > 0
      ? await this.prisma.db.orm.public.Application.select(
          "trackingLinkId",
        )
          .where((a) => a.trackingLinkId.in(scopedLinkIds))
          .all()
      : [];
    const appCountMap = new Map<string, number>();
    for (const app of allApps) {
      if (app.trackingLinkId) {
        appCountMap.set(
          app.trackingLinkId,
          (appCountMap.get(app.trackingLinkId) || 0) + 1,
        );
      }
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const pageItems = filtered.slice(offset, offset + limit);

    const data: TrackingLinkItem[] = pageItems.map((l) => {
      const apps = appCountMap.get(l.id) || 0;
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
        jobTitle: l.jobId ? jobTitleMap.get(l.jobId) ?? null : null,
        campaign: l.campaign,
        medium: l.medium,
        utmSource: l.utmSource ?? (l.source ? String(l.source).toLowerCase() : null),
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
      const job = await this.prisma.db.orm.public.Job.select("id", "organizationId")
        .where((j) => j.id.eq(dto.jobId as string))
        .first();
      if (!job || job.organizationId !== organizationId) {
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

    const created = await this.prisma.db.orm.public.TrackingLink.create({
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
    });

    let jobTitle: string | null = null;
    if (dto.jobId) {
      const j = await this.prisma.db.orm.public.Job.select("title").where((x) => x.id.eq(dto.jobId as string)).first();
      jobTitle = j?.title || null;
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
  ): Promise<void> {
    const link = await this.prisma.db.orm.public.TrackingLink.select(
      "id",
      "organizationId",
      "deletedAt",
    )
      .where((l) => l.id.eq(id))
      .first();

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

    const updateData: Record<string, unknown> = {
      updatedAt: toInstant(),
    };
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.source !== undefined) updateData.source = dto.source;
    if (dto.customSource !== undefined) updateData.customSource = dto.customSource?.trim() || null;
    if (dto.jobId !== undefined) updateData.jobId = dto.jobId || null;
    if (dto.utmSource !== undefined) updateData.utmSource = dto.utmSource?.trim() || null;
    if (dto.utmMedium !== undefined) {
      updateData.utmMedium = dto.utmMedium?.trim() || null;
      updateData.medium = dto.utmMedium?.trim() || null;
    }
    if (dto.utmCampaign !== undefined) {
      updateData.utmCampaign = dto.utmCampaign?.trim() || null;
      updateData.campaign = dto.utmCampaign?.trim() || null;
    }
    if (dto.utmTerm !== undefined) updateData.utmTerm = dto.utmTerm?.trim() || null;
    if (dto.utmContent !== undefined) updateData.utmContent = dto.utmContent?.trim() || null;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    await this.prisma.db.orm.public.TrackingLink.where((l) => l.id.eq(id)).update(updateData);
  }

  async deleteLink(organizationId: string, id: string): Promise<void> {
    const link = await this.prisma.db.orm.public.TrackingLink.select(
      "id",
      "organizationId",
      "deletedAt",
    )
      .where((l) => l.id.eq(id))
      .first();

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

    await this.prisma.db.orm.public.TrackingLink.where((l) => l.id.eq(id)).update({
      deletedAt: toInstant(),
      isActive: false,
      updatedAt: toInstant(),
    });
  }

  async findLinkByToken(token: string) {
    if (!token) return null;
    return this.prisma.db.orm.public.TrackingLink.select(
      "id",
      "token",
      "name",
      "source",
      "customSource",
      "jobId",
      "campaign",
      "medium",
      "isActive",
      "deletedAt",
      "organizationId",
    )
      .where((l) => l.token.eq(token))
      .first();
  }
}
