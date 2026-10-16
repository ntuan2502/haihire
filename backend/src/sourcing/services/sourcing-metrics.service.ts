import { Inject, Injectable, Optional } from "@nestjs/common";
import {
  APP_ERROR_CODES,
  SourcingChannel,
  type PaginatedResult,
  type SourcingStats,
  type AttributionLogItem,
  type TrackingLinkDetail,
  type TimeRangeFilter,
  type PipelineStageBreakdown,
  type TimeSeriesPoint,
  type AttributedApplicationDetailItem,
  type TopReferrerItem,
} from "@haihire/shared";
import {
  AppForbiddenException,
  AppNotFoundException,
} from "../../common/app-exception";
import { PrismaService } from "../../prisma/prisma.service";
import { toTimestamp } from "../../common/date.util";
import { SourcingLinksService } from "./sourcing-links.service";

@Injectable()
export class SourcingMetricsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(SourcingLinksService)
    private readonly linksService?: SourcingLinksService,
  ) {}

  async getStats(
    organizationId: string,
    timeRange: "7d" | "30d" | "90d" | "all" = "30d",
    jobId?: string,
  ): Promise<SourcingStats> {
    if (!organizationId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
        "Organization ID is required",
      );
    }

    const now = Date.now();
    let minTimestamp: number | null = null;
    if (timeRange === "7d") {
      minTimestamp = now - 7 * 24 * 60 * 60 * 1000;
    } else if (timeRange === "30d") {
      minTimestamp = now - 30 * 24 * 60 * 60 * 1000;
    } else if (timeRange === "90d") {
      minTimestamp = now - 90 * 24 * 60 * 60 * 1000;
    }

    // 1. Fetch organization's jobs
    const jobs = await this.prisma.db.orm.public.Job.select(
      "id",
      "title",
      "organizationId",
    )
      .where((j) => j.organizationId.eq(organizationId))
      .all();

    const orgJobIds = new Set(jobs.map((j) => j.id));
    const jobTitleMap = new Map(jobs.map((j) => [j.id, j.title]));

    const targetJobIds = jobId ? [jobId] : Array.from(orgJobIds);
    if (targetJobIds.length === 0) {
      return {
        trackedCount: 0,
        totalApplications: 0,
        attributionRate: 0,
        activeLinksCount: 0,
        totalLinksCount: 0,
        untrackedCount: 0,
        channelBreakdown: [],
        topLinks: [],
        topReferrers: [],
        recentAttributed: [],
        conversionBySource: [],
      };
    }

    // 2. Fetch applications for target jobs (scoped to target jobs belonging to organization)
    const rawApplications = await this.prisma.db.orm.public.Application.select(
      "id",
      "jobId",
      "candidateId",
      "stage",
      "sourceChannel",
      "sourceDetails",
      "referrerDomain",
      "utmCampaign",
      "trackingLinkId",
      "createdAt",
    )
      .where((a) => a.jobId.in(targetJobIds))
      .all();

    const filteredApplications = rawApplications.filter((app) => {
      if (minTimestamp !== null) {
        const appTime = toTimestamp(app.createdAt);
        if (appTime < minTimestamp) return false;
      }
      return true;
    });

    const totalApplications = filteredApplications.length;

    // 3. Fetch candidates info for recent attributed (scoped to organization and candidate IDs)
    const candidateIds = Array.from(
      new Set(filteredApplications.map((a) => a.candidateId)),
    );
    const candidates = candidateIds.length > 0
      ? await this.prisma.db.orm.public.Candidate.select("id", "name", "email")
          .where((c) => c.organizationId.eq(organizationId))
          .where((c) => c.id.in(candidateIds))
          .all()
      : [];
    const candidateMap = new Map(
      candidates.map((c) => [c.id, { name: c.name, email: c.email }]),
    );

    // 4. Fetch tracking links for organization
    const trackingLinks = await this.prisma.db.orm.public.TrackingLink.select(
      "id",
      "organizationId",
      "name",
      "token",
      "source",
      "jobId",
      "clicksCount",
      "isActive",
      "deletedAt",
    )
      .where((l) => l.organizationId.eq(organizationId))
      .all();

    const nonDeletedLinks = trackingLinks.filter((l) => !l.deletedAt);
    const activeLinksCount = nonDeletedLinks.filter((l) => l.isActive).length;
    const totalLinksCount = nonDeletedLinks.length;

    // 5. Tracked vs Untracked
    // Tracked means application came through a tracking link OR a recognized external source (not pure direct without referrer)
    let trackedCount = 0;
    const channelCounts: Record<string, number> = {};
    const linkAppCountMap = new Map<string, number>();

    const stageFunnelBySource: Record<
      string,
      { new: number; screening: number; interview: number; offer: number; hired: number; rejected: number }
    > = {};

    for (const app of filteredApplications) {
      const channel = (app.sourceChannel as SourcingChannel) || SourcingChannel.DIRECT;
      const isTracked = !!app.trackingLinkId || channel !== SourcingChannel.DIRECT || !!app.referrerDomain;

      if (isTracked) {
        trackedCount++;
      }

      // Count by channel
      channelCounts[channel] = (channelCounts[channel] || 0) + 1;

      // Count applications per tracking link
      if (app.trackingLinkId) {
        linkAppCountMap.set(
          app.trackingLinkId,
          (linkAppCountMap.get(app.trackingLinkId) || 0) + 1,
        );
      }

      // Funnel matrix
      if (!stageFunnelBySource[channel]) {
        stageFunnelBySource[channel] = {
          new: 0,
          screening: 0,
          interview: 0,
          offer: 0,
          hired: 0,
          rejected: 0,
        };
      }

      const funnel = stageFunnelBySource[channel];
      const stage = String(app.stage);
      if (stage === "APPLIED") funnel.new++;
      else if (stage === "SCREENING") funnel.screening++;
      else if (stage === "INTERVIEW") funnel.interview++;
      else if (stage === "OFFER") funnel.offer++;
      else if (stage === "HIRED") funnel.hired++;
      else if (stage === "REJECTED") funnel.rejected++;
    }

    const untrackedCount = Math.max(0, totalApplications - trackedCount);
    const attributionRate = totalApplications > 0
      ? Math.round((trackedCount / totalApplications) * 100)
      : 100;

    // 6. Channel breakdown sorted by count desc
    const channelBreakdown = Object.entries(channelCounts)
      .map(([channel, count]) => ({
        channel: channel as SourcingChannel,
        count,
        percentage: totalApplications > 0 ? Math.round((count / totalApplications) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // 7. Top Links
    const topLinks = nonDeletedLinks
      .filter((l) => (jobId ? l.jobId === jobId : true))
      .map((l) => {
        const apps = linkAppCountMap.get(l.id) || 0;
        const clicks = l.clicksCount || 0;
        const cvr = clicks > 0 ? Math.round((apps / clicks) * 100) : 0;
        return {
          id: l.id,
          name: l.name,
          token: l.token,
          source: l.source as SourcingChannel,
          jobTitle: l.jobId ? jobTitleMap.get(l.jobId) ?? null : null,
          clicks,
          apps,
          cvr,
        };
      })
      .sort((a, b) => b.clicks - a.clicks || b.apps - a.apps)
      .slice(0, 5);

    // 8. Top Referrers
    const referrerCounts: Record<string, number> = {};
    for (const app of filteredApplications) {
      if (app.referrerDomain) {
        referrerCounts[app.referrerDomain] = (referrerCounts[app.referrerDomain] || 0) + 1;
      }
    }

    // Also include clicks referrers if available (scoped to organization tracking links)
    const targetLinkIds = nonDeletedLinks
      .filter((l) => (jobId ? l.jobId === jobId : true))
      .map((l) => l.id);
    const clicks = targetLinkIds.length > 0
      ? await this.prisma.db.orm.public.TrackingClick.select(
          "referrerDomain",
          "createdAt",
        )
          .where((c) => c.trackingLinkId.in(targetLinkIds))
          .all()
      : [];
    for (const clk of clicks) {
      if (clk.referrerDomain) {
        if (minTimestamp !== null && toTimestamp(clk.createdAt) < minTimestamp) continue;
        referrerCounts[clk.referrerDomain] = (referrerCounts[clk.referrerDomain] || 0) + 1;
      }
    }

    const topReferrers = Object.entries(referrerCounts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 9. Recent Attributed Candidates (last 5)
    const recentAttributed = [...filteredApplications]
      .filter((a) => !!a.trackingLinkId || a.sourceChannel !== SourcingChannel.DIRECT)
      .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))
      .slice(0, 5)
      .map((app) => {
        const candidateInfo = candidateMap.get(app.candidateId);
        return {
          applicationId: app.id,
          candidateId: app.candidateId,
          candidateName: candidateInfo?.name || "Unknown Candidate",
          candidateEmail: candidateInfo?.email || "",
          jobTitle: jobTitleMap.get(app.jobId) || "Job",
          source: (app.sourceChannel as SourcingChannel) || SourcingChannel.DIRECT,
          sourceDetails: app.sourceDetails,
          campaign: app.utmCampaign,
          stage: String(app.stage),
          appliedAt: new Date(toTimestamp(app.createdAt)).toISOString(),
        };
      });

    // 10. Conversion By Source
    const conversionBySource = Object.entries(stageFunnelBySource).map(
      ([channel, stages]) => {
        const total = stages.new + stages.screening + stages.interview + stages.offer + stages.hired + stages.rejected;
        const hireRate = total > 0 ? Math.round((stages.hired / total) * 100) : 0;
        return {
          source: channel as SourcingChannel,
          new: stages.new,
          screening: stages.screening,
          interview: stages.interview,
          offer: stages.offer,
          hired: stages.hired,
          rejected: stages.rejected,
          hireRate,
        };
      },
    );

    return {
      trackedCount,
      totalApplications,
      attributionRate,
      activeLinksCount,
      totalLinksCount,
      untrackedCount,
      channelBreakdown,
      topLinks,
      topReferrers,
      recentAttributed,
      conversionBySource,
    };
  }

  async getLinkDetails(
    organizationId: string,
    id: string,
    timeRange: TimeRangeFilter = "30d",
  ): Promise<TrackingLinkDetail> {
    if (!organizationId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
        "Organization ID is required",
      );
    }

    const link = await this.prisma.db.orm.public.TrackingLink.select(
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

    // 1. Job details
    let jobTitle: string | null = null;
    let jobType: string | null = null;
    if (link.jobId) {
      const j = await this.prisma.db.orm.public.Job.select("title", "type")
        .where((x) => x.id.eq(link.jobId as string))
        .first();
      jobTitle = j?.title || null;
      jobType = j?.type || null;
    }

    // 2. Time range bounds
    const now = Date.now();
    let minTimestamp: number | null = null;
    if (timeRange === "7d") {
      minTimestamp = now - 7 * 24 * 60 * 60 * 1000;
    } else if (timeRange === "30d") {
      minTimestamp = now - 30 * 24 * 60 * 60 * 1000;
    } else if (timeRange === "90d") {
      minTimestamp = now - 90 * 24 * 60 * 60 * 1000;
    }

    // 3. Fetch clicks for this link
    const allClicks = await this.prisma.db.orm.public.TrackingClick.select(
      "id",
      "referrerDomain",
      "createdAt",
    )
      .where((c) => c.trackingLinkId.eq(link.id))
      .all();

    const filteredClicks = allClicks.filter((c) => {
      if (minTimestamp !== null) {
        return toTimestamp(c.createdAt) >= minTimestamp;
      }
      return true;
    });

    const clicks =
      timeRange === "all"
        ? Math.max(link.clicksCount || 0, allClicks.length)
        : filteredClicks.length;

    // 4. Fetch all applications attributed to this link
    const allAttributedApps = await this.prisma.db.orm.public.Application.select(
      "id",
      "candidateId",
      "jobId",
      "stage",
      "referrerDomain",
      "sourceDetails",
      "utmSource",
      "utmMedium",
      "utmCampaign",
      "utmTerm",
      "utmContent",
      "createdAt",
    )
      .where((a) => a.trackingLinkId.eq(link.id))
      .all();

    const allTimeAttributed = allAttributedApps.length;

    const filteredApps = allAttributedApps.filter((a) => {
      if (minTimestamp !== null) {
        return toTimestamp(a.createdAt) >= minTimestamp;
      }
      return true;
    });

    const applications = filteredApps.length;
    const cvr = clicks > 0 ? Math.round((applications / clicks) * 100) : 0;
    const hiredCount = filteredApps.filter((a) => a.stage === "HIRED").length;
    const hireRate =
      applications > 0 ? Math.round((hiredCount / applications) * 100) : 0;

    // 5. Pipeline stage breakdown
    const STAGES = [
      "APPLIED",
      "SCREENING",
      "INTERVIEW",
      "OFFER",
      "HIRED",
      "REJECTED",
    ];
    const stageCounts = new Map<string, number>();
    for (const s of STAGES) stageCounts.set(s, 0);
    for (const app of filteredApps) {
      const s = String(app.stage);
      stageCounts.set(s, (stageCounts.get(s) || 0) + 1);
    }

    const pipelineStages: PipelineStageBreakdown[] = STAGES.map((stg) => {
      const cnt = stageCounts.get(stg) || 0;
      const pct = applications > 0 ? Math.round((cnt / applications) * 100) : 0;
      return {
        stage: stg,
        count: cnt,
        percentage: pct,
      };
    });

    // 6. Applications Over Time (Timeline/Trend)
    const dayMap = new Map<string, number>();
    const daysToGen =
      timeRange === "7d"
        ? 7
        : timeRange === "30d"
          ? 30
          : timeRange === "90d"
            ? 90
            : 14;

    for (let i = daysToGen - 1; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split("T")[0];
      dayMap.set(dateStr, 0);
    }

    for (const app of filteredApps) {
      const dateStr = new Date(toTimestamp(app.createdAt))
        .toISOString()
        .split("T")[0];
      if (dayMap.has(dateStr)) {
        dayMap.set(dateStr, (dayMap.get(dateStr) || 0) + 1);
      } else if (timeRange === "all") {
        dayMap.set(dateStr, (dayMap.get(dateStr) || 0) + 1);
      }
    }

    const applicationsOverTime: TimeSeriesPoint[] = Array.from(dayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 7. Attributed applications list with candidates and jobs (scoped to organization)
    const candidateIds = Array.from(
      new Set(filteredApps.map((a) => a.candidateId)),
    );
    const candidates =
      candidateIds.length > 0
        ? await this.prisma.db.orm.public.Candidate.select(
            "id",
            "name",
            "email",
          )
            .where((c) => c.organizationId.eq(organizationId))
            .where((c) => c.id.in(candidateIds))
            .all()
        : [];
    const candMap = new Map(
      candidates.map((c) => [c.id, { name: c.name, email: c.email }]),
    );

    const appJobIds = Array.from(new Set(filteredApps.map((a) => a.jobId)));
    const jobs =
      appJobIds.length > 0
        ? await this.prisma.db.orm.public.Job.select("id", "title", "type")
            .where((j) => j.organizationId.eq(organizationId))
            .where((j) => j.id.in(appJobIds))
            .all()
        : [];
    const jobMap = new Map(
      jobs.map((j) => [j.id, { title: j.title, type: j.type }]),
    );

    const attributedApplications: AttributedApplicationDetailItem[] = filteredApps
      .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))
      .map((a) => {
        const cand = candMap.get(a.candidateId);
        const jobInfo = jobMap.get(a.jobId);
        return {
          applicationId: a.id,
          candidateId: a.candidateId,
          candidateName: cand?.name || "Unknown Candidate",
          candidateEmail: cand?.email || "",
          jobId: a.jobId,
          jobTitle: jobInfo?.title || jobTitle || "Role",
          jobType: jobInfo?.type || jobType || null,
          referrer: a.referrerDomain || a.sourceDetails || null,
          campaign: a.utmCampaign || link.utmCampaign || link.campaign || null,
          utmSource: a.utmSource || null,
          utmMedium: a.utmMedium || null,
          utmCampaign: a.utmCampaign || link.utmCampaign || link.campaign || null,
          utmTerm: a.utmTerm || link.utmTerm || null,
          utmContent: a.utmContent || link.utmContent || null,
          stage: String(a.stage),
          appliedAt: new Date(toTimestamp(a.createdAt)).toISOString(),
        };
      });

    // 8. Referrer Domains breakdown
    const domainCounts = new Map<string, number>();
    for (const c of filteredClicks) {
      if (c.referrerDomain) {
        domainCounts.set(
          c.referrerDomain,
          (domainCounts.get(c.referrerDomain) || 0) + 1,
        );
      }
    }
    for (const a of filteredApps) {
      if (a.referrerDomain) {
        domainCounts.set(
          a.referrerDomain,
          (domainCounts.get(a.referrerDomain) || 0) + 1,
        );
      }
    }
    const referrerDomains: TopReferrerItem[] = Array.from(domainCounts.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      link: {
        id: link.id,
        organizationId: link.organizationId,
        name: link.name,
        token: link.token,
        source: link.source as SourcingChannel,
        customSource: link.customSource,
        jobId: link.jobId,
        jobTitle,
        campaign: link.campaign,
        medium: link.medium,
        utmSource: link.utmSource ?? (link.source ? String(link.source).toLowerCase() : null),
        utmMedium: link.utmMedium ?? link.medium ?? null,
        utmCampaign: link.utmCampaign ?? link.campaign ?? null,
        utmTerm: link.utmTerm ?? null,
        utmContent: link.utmContent ?? null,
        clicksCount: link.clicksCount || 0,
        applicationsCount: allTimeAttributed,
        conversionRate:
          (link.clicksCount || 0) > 0
            ? Math.round((allTimeAttributed / link.clicksCount) * 100)
            : 0,
        isActive: link.isActive,
        createdAt: new Date(toTimestamp(link.createdAt)).toISOString(),
        updatedAt: new Date(toTimestamp(link.updatedAt)).toISOString(),
      },
      stats: {
        clicks,
        applications,
        cvr,
        hireRate,
        allTimeAttributed,
      },
      pipeline: {
        total: applications,
        stages: pipelineStages,
      },
      applicationsOverTime,
      attributedApplications,
      referrerDomains,
    };
  }

  async getAttributionLog(
    organizationId: string,
    pagination: {
      page?: number;
      limit?: number;
      search?: string;
      jobId?: string;
      source?: SourcingChannel;
    },
  ): Promise<PaginatedResult<AttributionLogItem>> {
    const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
    const limit = pagination.limit && pagination.limit > 0 ? pagination.limit : 20;

    // Fetch jobs for organization
    const jobs = await this.prisma.db.orm.public.Job.select("id", "title")
      .where((j) => j.organizationId.eq(organizationId))
      .all();
    const orgJobIds = new Set(jobs.map((j) => j.id));
    const jobTitleMap = new Map(jobs.map((j) => [j.id, j.title]));

    const targetJobIds = pagination.jobId ? [pagination.jobId] : Array.from(orgJobIds);
    if (targetJobIds.length === 0) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 1,
      };
    }

    // Fetch applications scoped to target organization jobs
    const allApps = await this.prisma.db.orm.public.Application.select(
      "id",
      "jobId",
      "candidateId",
      "stage",
      "sourceChannel",
      "sourceDetails",
      "utmCampaign",
      "trackingLinkId",
      "createdAt",
    )
      .where((a) => a.jobId.in(targetJobIds))
      .all();

    let filtered = allApps;

    if (pagination.source) {
      filtered = filtered.filter((a) => a.sourceChannel === pagination.source);
    }

    // Fetch candidates scoped to organization
    const candidateIds = Array.from(new Set(filtered.map((a) => a.candidateId)));
    const candidates = candidateIds.length > 0
      ? await this.prisma.db.orm.public.Candidate.select("id", "name", "email")
          .where((c) => c.organizationId.eq(organizationId))
          .where((c) => c.id.in(candidateIds))
          .all()
      : [];
    const candidateMap = new Map(
      candidates.map((c) => [c.id, { name: c.name, email: c.email }]),
    );

    if (pagination.search) {
      const q = pagination.search.toLowerCase();
      filtered = filtered.filter((a) => {
        const c = candidateMap.get(a.candidateId);
        const nameMatch = c?.name?.toLowerCase().includes(q);
        const emailMatch = c?.email?.toLowerCase().includes(q);
        const campaignMatch = a.utmCampaign?.toLowerCase().includes(q);
        return nameMatch || emailMatch || campaignMatch;
      });
    }

    // Sort by appliedAt desc
    filtered.sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt));

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const pageItems = filtered.slice(offset, offset + limit);

    const data: AttributionLogItem[] = pageItems.map((a) => {
      const c = candidateMap.get(a.candidateId);
      return {
        applicationId: a.id,
        candidateId: a.candidateId,
        candidateName: c?.name || "Unknown Candidate",
        candidateEmail: c?.email || "",
        jobId: a.jobId,
        jobTitle: jobTitleMap.get(a.jobId) || "Job",
        source: (a.sourceChannel as SourcingChannel) || SourcingChannel.DIRECT,
        sourceDetails: a.sourceDetails,
        campaign: a.utmCampaign,
        stage: String(a.stage),
        appliedAt: new Date(toTimestamp(a.createdAt)).toISOString(),
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
}
