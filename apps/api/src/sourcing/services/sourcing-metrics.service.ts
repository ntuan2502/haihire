import { Inject, Injectable, Optional } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  APP_ERROR_CODES,
  SourcingChannel,
  formatCandidateDisplayName,
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
import { resolveOrgNameDisplayOrder } from "../../common/candidate-name.util";
import { findMatchingCandidateIds } from "../../common/person-search.util";
import {
  AppForbiddenException,
  AppNotFoundException,
} from "../../common/app-exception";
import { PrismaService } from "../../prisma/prisma.service";
import { toTimestamp } from "../../common/date.util";
import { SourcingLinksService } from "./sourcing-links.service";
import { SourcingQueryService } from "./sourcing-query.service";

const PIPELINE_STAGES = [
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "HIRED",
  "REJECTED",
] as const;

@Injectable()
export class SourcingMetricsService {
  private readonly queryService: SourcingQueryService;

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(SourcingLinksService)
    private readonly linksService?: SourcingLinksService,
    @Optional()
    @Inject(SourcingQueryService)
    queryService?: SourcingQueryService,
  ) {
    this.queryService = queryService ?? new SourcingQueryService(this.prisma);
  }

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
    const minTimestamp = this.resolveMinTimestamp(now, timeRange);

    const jobs = await this.queryService.getOrganizationJobs(organizationId);
    const orgJobIds = new Set(jobs.map((j) => j.id));
    const jobTitleMap = new Map(jobs.map((j) => [j.id, j.title]));

    if (jobId && !orgJobIds.has(jobId)) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
        "Access denied: job does not belong to the active organization.",
      );
    }
    const targetJobIds = jobId ? [jobId] : Array.from(orgJobIds);
    if (targetJobIds.length === 0) {
      return this.emptyStats();
    }

    const rawApplications =
      await this.queryService.getApplicationsForJobs(targetJobIds);
    const filteredApplications = rawApplications.filter((app) => {
      if (minTimestamp !== null && toTimestamp(app.createdAt) < minTimestamp)
        return false;
      return true;
    });

    const totalApplications = filteredApplications.length;
    const candidateIds = Array.from(
      new Set(filteredApplications.map((a) => a.candidateId)),
    );
    const [candidates, nameOrder] = await Promise.all([
      this.queryService.getCandidatesByIds(organizationId, candidateIds),
      resolveOrgNameDisplayOrder(this.prisma, organizationId),
    ]);
    const candidateMap = new Map(
      candidates.map((c) => [
        c.id,
        {
          name: formatCandidateDisplayName(c, nameOrder) || "Unknown Candidate",
          firstName: c.firstName ?? null,
          lastName: c.lastName ?? null,
          displayName: c.displayName ?? null,
          email: c.email,
        },
      ]),
    );

    const trackingLinks =
      await this.queryService.getTrackingLinks(organizationId);
    const nonDeletedLinks = trackingLinks.filter((l) => !l.deletedAt);
    const activeLinksCount = nonDeletedLinks.filter((l) => l.isActive).length;
    const totalLinksCount = nonDeletedLinks.length;

    let trackedCount = 0;
    const channelCounts: Record<string, number> = {};
    const linkAppCountMap = new Map<string, number>();
    const stageFunnelBySource: Record<
      string,
      {
        new: number;
        screening: number;
        interview: number;
        offer: number;
        hired: number;
        rejected: number;
      }
    > = {};

    for (const app of filteredApplications) {
      const channel =
        (app.sourceChannel as SourcingChannel) || SourcingChannel.DIRECT;
      const isTracked =
        !!app.trackingLinkId ||
        channel !== SourcingChannel.DIRECT ||
        !!app.referrerDomain;
      if (isTracked) trackedCount++;

      channelCounts[channel] = (channelCounts[channel] || 0) + 1;
      if (app.trackingLinkId) {
        linkAppCountMap.set(
          app.trackingLinkId,
          (linkAppCountMap.get(app.trackingLinkId) || 0) + 1,
        );
      }

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
    const attributionRate =
      totalApplications > 0
        ? Math.round((trackedCount / totalApplications) * 100)
        : 100;

    const channelBreakdown = Object.entries(channelCounts)
      .map(([channel, count]) => ({
        channel: channel as SourcingChannel,
        count,
        percentage:
          totalApplications > 0
            ? Math.round((count / totalApplications) * 100)
            : 0,
      }))
      .sort((a, b) => b.count - a.count);

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
          jobTitle: l.jobId ? (jobTitleMap.get(l.jobId) ?? null) : null,
          clicks,
          apps,
          cvr,
        };
      })
      .sort((a, b) => b.clicks - a.clicks || b.apps - a.apps)
      .slice(0, 5);

    const referrerCounts: Record<string, number> = {};
    for (const app of filteredApplications) {
      if (app.referrerDomain) {
        referrerCounts[app.referrerDomain] =
          (referrerCounts[app.referrerDomain] || 0) + 1;
      }
    }

    const targetLinkIds = nonDeletedLinks
      .filter((l) => (jobId ? l.jobId === jobId : true))
      .map((l) => l.id);
    const clicks = await this.queryService.getClicksForLinks(targetLinkIds);
    for (const clk of clicks) {
      if (clk.referrerDomain) {
        if (minTimestamp !== null && toTimestamp(clk.createdAt) < minTimestamp)
          continue;
        referrerCounts[clk.referrerDomain] =
          (referrerCounts[clk.referrerDomain] || 0) + 1;
      }
    }

    const topReferrers = Object.entries(referrerCounts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const recentAttributed = [...filteredApplications]
      .filter(
        (a) => !!a.trackingLinkId || a.sourceChannel !== SourcingChannel.DIRECT,
      )
      .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))
      .slice(0, 5)
      .map((app) => {
        const candidateInfo = candidateMap.get(app.candidateId);
        return {
          applicationId: app.id,
          candidateId: app.candidateId,
          candidateName: candidateInfo?.name || "Unknown Candidate",
          firstName: candidateInfo?.firstName ?? null,
          lastName: candidateInfo?.lastName ?? null,
          displayName: candidateInfo?.displayName ?? null,
          candidateEmail: candidateInfo?.email || "",
          jobTitle: jobTitleMap.get(app.jobId) || "Job",
          source:
            (app.sourceChannel as SourcingChannel) || SourcingChannel.DIRECT,
          sourceDetails: app.sourceDetails,
          campaign: app.utmCampaign,
          stage: String(app.stage),
          appliedAt: new Date(toTimestamp(app.createdAt)).toISOString(),
        };
      });

    const conversionBySource = Object.entries(stageFunnelBySource).map(
      ([channel, stages]) => {
        const total =
          stages.new +
          stages.screening +
          stages.interview +
          stages.offer +
          stages.hired +
          stages.rejected;
        const hireRate =
          total > 0 ? Math.round((stages.hired / total) * 100) : 0;
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

    const link = await this.queryService.getTrackingLinkById(id);
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

    let jobTitle: string | null = null;
    let jobType: string | null = null;
    if (link.jobId) {
      const j = await this.queryService.getJobById(
        organizationId,
        link.jobId as string,
      );
      jobTitle = j?.title || null;
      jobType = j?.type || null;
    }

    const now = Date.now();
    const minTimestamp = this.resolveMinTimestamp(now, timeRange);

    const allClicks = await this.queryService.getClicksForLink(link.id);
    const filteredClicks = allClicks.filter((c) => {
      if (minTimestamp !== null)
        return toTimestamp(c.createdAt) >= minTimestamp;
      return true;
    });

    const clicks =
      timeRange === "all"
        ? Math.max(link.clicksCount || 0, allClicks.length)
        : filteredClicks.length;

    const allAttributedApps =
      await this.queryService.getAttributedApplicationsForLink(link.id);
    const allTimeAttributed = allAttributedApps.length;
    const filteredApps = allAttributedApps.filter((a) => {
      if (minTimestamp !== null)
        return toTimestamp(a.createdAt) >= minTimestamp;
      return true;
    });

    const applications = filteredApps.length;
    const cvr = clicks > 0 ? Math.round((applications / clicks) * 100) : 0;
    const hiredCount = filteredApps.filter((a) => a.stage === "HIRED").length;
    const hireRate =
      applications > 0 ? Math.round((hiredCount / applications) * 100) : 0;

    const stageCounts = new Map<string, number>();
    for (const s of PIPELINE_STAGES) stageCounts.set(s, 0);
    for (const app of filteredApps) {
      const s = String(app.stage);
      stageCounts.set(s, (stageCounts.get(s) || 0) + 1);
    }

    const pipelineStages: PipelineStageBreakdown[] = PIPELINE_STAGES.map(
      (stg) => {
        const cnt = stageCounts.get(stg) || 0;
        const pct =
          applications > 0 ? Math.round((cnt / applications) * 100) : 0;
        return { stage: stg, count: cnt, percentage: pct };
      },
    );

    const applicationsOverTime = this.calculateApplicationsOverTime(
      now,
      timeRange,
      filteredApps,
    );

    const candidateIds = Array.from(
      new Set(filteredApps.map((a) => a.candidateId)),
    );
    const candidates = await this.queryService.getCandidatesByIds(
      organizationId,
      candidateIds,
    );
    const nameOrder = await resolveOrgNameDisplayOrder(
      this.prisma,
      organizationId,
    );
    const candMap = new Map(
      candidates.map((c) => [
        c.id,
        {
          name: formatCandidateDisplayName(c, nameOrder) || "Unknown Candidate",
          firstName: c.firstName ?? null,
          lastName: c.lastName ?? null,
          displayName: c.displayName ?? null,
          email: c.email,
        },
      ]),
    );

    const appJobIds = Array.from(new Set(filteredApps.map((a) => a.jobId)));
    const jobs = await this.queryService.getJobsByIds(
      organizationId,
      appJobIds,
    );
    const jobMap = new Map(
      jobs.map((j) => [j.id, { title: j.title, type: j.type }]),
    );

    const attributedApplications: AttributedApplicationDetailItem[] =
      filteredApps
        .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))
        .map((a) => {
          const cand = candMap.get(a.candidateId);
          const jobInfo = jobMap.get(a.jobId);
          return {
            applicationId: a.id,
            candidateId: a.candidateId,
            candidateName: cand?.name || "Unknown Candidate",
            firstName: cand?.firstName ?? null,
            lastName: cand?.lastName ?? null,
            displayName: cand?.displayName ?? null,
            candidateEmail: cand?.email || "",
            jobId: a.jobId,
            jobTitle: jobInfo?.title || jobTitle || "Role",
            jobType: jobInfo?.type || jobType || null,
            referrer: a.referrerDomain || a.sourceDetails || null,
            campaign:
              a.utmCampaign || link.utmCampaign || link.campaign || null,
            utmSource: a.utmSource || null,
            utmMedium: a.utmMedium || null,
            utmCampaign:
              a.utmCampaign || link.utmCampaign || link.campaign || null,
            utmTerm: a.utmTerm || link.utmTerm || null,
            utmContent: a.utmContent || link.utmContent || null,
            stage: String(a.stage),
            appliedAt: new Date(toTimestamp(a.createdAt)).toISOString(),
          };
        });

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
    const referrerDomains: TopReferrerItem[] = Array.from(
      domainCounts.entries(),
    )
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
        utmSource:
          link.utmSource ??
          (link.source ? String(link.source).toLowerCase() : null),
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
    const limit =
      pagination.limit && pagination.limit > 0 ? pagination.limit : 20;

    const where: Prisma.ApplicationWhereInput = {
      organizationId,
    };

    if (pagination.jobId) {
      const job = await this.prisma.job.findFirst({
        where: { id: pagination.jobId, organizationId, deletedAt: null },
        select: { id: true },
      });
      if (!job) {
        throw new AppForbiddenException(
          APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
          "Access denied to this job's attribution log",
        );
      }
      where.jobId = pagination.jobId;
    }

    if (pagination.source) {
      where.sourceChannel = pagination.source;
    }

    if (pagination.search && pagination.search.trim()) {
      const q = pagination.search.trim();
      const matchedCandidateIds = await findMatchingCandidateIds(this.prisma, {
        organizationId,
        rawSearch: pagination.search,
      });
      where.OR = [
        ...(matchedCandidateIds.length > 0
          ? [{ candidateId: { in: matchedCandidateIds } }]
          : []),
        { utmCampaign: { contains: q, mode: "insensitive" } },
        { sourceDetails: { contains: q, mode: "insensitive" } },
      ];
    }

    const [apps, total, nameOrder] = await Promise.all([
      this.prisma.application.findMany({
        where,
        include: {
          candidate: true,
          job: { select: { title: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.application.count({ where }),
      resolveOrgNameDisplayOrder(this.prisma, organizationId),
    ]);

    const missingRelations = apps.some((a) => !a.candidate || !a.job);
    let candidateMap: Map<
      string,
      {
        name: string;
        firstName: string | null;
        lastName: string | null;
        displayName: string | null;
        email: string;
      }
    > | null = null;
    let jobMap: Map<string, string> | null = null;

    if (missingRelations && apps.length > 0) {
      const candidateIds = Array.from(
        new Set(apps.map((a) => a.candidateId).filter(Boolean)),
      );
      const jobIds = Array.from(
        new Set(apps.map((a) => a.jobId).filter(Boolean)),
      );

      const [candidates, jobs] = await Promise.all([
        candidateIds.length > 0
          ? this.prisma.candidate.findMany({
              where: { id: { in: candidateIds } },
            })
          : [],
        jobIds.length > 0
          ? this.prisma.job.findMany({
              where: { id: { in: jobIds } },
              select: { id: true, title: true },
            })
          : [],
      ]);

      candidateMap = new Map(
        candidates.map((cand) => [
          cand.id,
          {
            name:
              formatCandidateDisplayName(cand, nameOrder) ||
              "Unknown Candidate",
            firstName: cand.firstName ?? null,
            lastName: cand.lastName ?? null,
            displayName: cand.displayName ?? null,
            email: cand.email,
          },
        ]),
      );
      jobMap = new Map(jobs.map((j) => [j.id, j.title]));
    }

    const data: AttributionLogItem[] = apps.map((a) => {
      const c = a.candidate;
      const fallbackCand = candidateMap?.get(a.candidateId);
      const candName = c
        ? formatCandidateDisplayName(c, nameOrder) || "Unknown Candidate"
        : fallbackCand?.name || "Unknown Candidate";
      const jobTitle = a.job?.title || jobMap?.get(a.jobId) || "Job";
      return {
        applicationId: a.id,
        candidateId: a.candidateId,
        candidateName: candName,
        firstName: c?.firstName ?? fallbackCand?.firstName ?? null,
        lastName: c?.lastName ?? fallbackCand?.lastName ?? null,
        displayName: c?.displayName ?? fallbackCand?.displayName ?? null,
        candidateEmail: c?.email ?? fallbackCand?.email ?? "",
        jobId: a.jobId,
        jobTitle,
        source: (a.sourceChannel as SourcingChannel) || SourcingChannel.DIRECT,
        sourceDetails: a.sourceDetails,
        campaign: a.utmCampaign,
        stage: String(a.stage),
        appliedAt: new Date(toTimestamp(a.createdAt)).toISOString(),
      };
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  private resolveMinTimestamp(
    now: number,
    timeRange: TimeRangeFilter,
  ): number | null {
    if (timeRange === "7d") return now - 7 * 24 * 60 * 60 * 1000;
    if (timeRange === "30d") return now - 30 * 24 * 60 * 60 * 1000;
    if (timeRange === "90d") return now - 90 * 24 * 60 * 60 * 1000;
    return null;
  }

  private calculateApplicationsOverTime(
    now: number,
    timeRange: TimeRangeFilter,
    filteredApps: Array<{ createdAt: string | Date }>,
  ): TimeSeriesPoint[] {
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

    return Array.from(dayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private emptyStats(): SourcingStats {
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
}
