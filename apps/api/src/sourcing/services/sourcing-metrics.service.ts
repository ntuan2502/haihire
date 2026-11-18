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
    const timeFilteredApps = rawApplications.filter((app) => {
      if (minTimestamp !== null && toTimestamp(app.createdAt) < minTimestamp)
        return false;
      return true;
    });

    const candidateIds = Array.from(
      new Set(timeFilteredApps.map((a) => a.candidateId)),
    );
    const [candidates, nameOrder] = await Promise.all([
      this.queryService.getCandidatesByIds(organizationId, candidateIds),
      resolveOrgNameDisplayOrder(this.prisma, organizationId),
    ]);
    const deletedCandidateIds = new Set(
      candidates.filter((c) => Boolean(c.deletedAt)).map((c) => c.id),
    );
    const filteredApplications = timeFilteredApps.filter(
      (app) => !deletedCandidateIds.has(app.candidateId),
    );
    const totalApplications = filteredApplications.length;
    const candidateMap = new Map(
      candidates
        .filter((c) => !c.deletedAt)
        .map((c) => [
          c.id,
          {
            name:
              formatCandidateDisplayName(c, nameOrder) || "Unknown Candidate",
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
        : 0;

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

    const referrerCounts: Record<string, number> = {};
    for (const app of filteredApplications) {
      if (app.referrerDomain) {
        referrerCounts[app.referrerDomain] =
          (referrerCounts[app.referrerDomain] || 0) + 1;
      }
    }

    const filteredLinks = nonDeletedLinks.filter((l) =>
      jobId ? l.jobId === jobId : true,
    );
    const targetLinkIds = filteredLinks.map((l) => l.id);
    const clicks = await this.queryService.getClicksForLinks(targetLinkIds);
    const linkClickCountMap = new Map<string, number>();
    for (const clk of clicks) {
      if (minTimestamp !== null && toTimestamp(clk.createdAt) < minTimestamp)
        continue;
      if (clk.trackingLinkId) {
        linkClickCountMap.set(
          clk.trackingLinkId,
          (linkClickCountMap.get(clk.trackingLinkId) || 0) + 1,
        );
      }
      if (clk.referrerDomain) {
        referrerCounts[clk.referrerDomain] =
          (referrerCounts[clk.referrerDomain] || 0) + 1;
      }
    }

    const topLinks = filteredLinks
      .map((l) => {
        const apps = linkAppCountMap.get(l.id) || 0;
        const periodClicks = linkClickCountMap.get(l.id) || 0;
        const linkClicks =
          timeRange === "all"
            ? Math.max(l.clicksCount || 0, periodClicks)
            : periodClicks;
        const cvr = linkClicks > 0 ? Math.round((apps / linkClicks) * 100) : 0;
        return {
          id: l.id,
          name: l.name,
          token: l.token,
          source: l.source as SourcingChannel,
          jobTitle: l.jobId ? (jobTitleMap.get(l.jobId) ?? null) : null,
          clicks: linkClicks,
          apps,
          cvr,
        };
      })
      .sort((a, b) => b.clicks - a.clicks || b.apps - a.apps)
      .slice(0, 5);

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

    const rawAttributedApps =
      await this.queryService.getAttributedApplicationsForLink(link.id);
    const rawCandidateIds = Array.from(
      new Set(rawAttributedApps.map((a) => a.candidateId)),
    );
    const rawJobIds = Array.from(
      new Set(rawAttributedApps.map((a) => a.jobId)),
    );
    const [candidates, jobs, nameOrder] = await Promise.all([
      this.queryService.getCandidatesByIds(organizationId, rawCandidateIds),
      this.queryService.getJobsByIds(organizationId, rawJobIds),
      resolveOrgNameDisplayOrder(this.prisma, organizationId),
    ]);
    const deletedCandidateIds = new Set(
      candidates.filter((c) => Boolean(c.deletedAt)).map((c) => c.id),
    );
    const deletedJobIds = new Set(
      jobs
        .filter((j) => Boolean((j as { deletedAt?: unknown }).deletedAt))
        .map((j) => j.id),
    );
    const allAttributedApps = rawAttributedApps.filter(
      (a) =>
        !deletedCandidateIds.has(a.candidateId) && !deletedJobIds.has(a.jobId),
    );

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

    const candMap = new Map(
      candidates
        .filter((c) => !c.deletedAt)
        .map((c) => [
          c.id,
          {
            name:
              formatCandidateDisplayName(c, nameOrder) || "Unknown Candidate",
            firstName: c.firstName ?? null,
            lastName: c.lastName ?? null,
            displayName: c.displayName ?? null,
            email: c.email,
          },
        ]),
    );

    const jobMap = new Map(
      jobs
        .filter((j) => !(j as { deletedAt?: unknown }).deletedAt)
        .map((j) => [j.id, { title: j.title, type: j.type }]),
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
      timeRange?: TimeRangeFilter;
    },
  ): Promise<PaginatedResult<AttributionLogItem>> {
    const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
    const limit =
      pagination.limit && pagination.limit > 0 ? pagination.limit : 20;
    const minTimestamp = pagination.timeRange
      ? this.resolveMinTimestamp(Date.now(), pagination.timeRange)
      : null;

    const where: Prisma.ApplicationWhereInput = {
      organizationId,
      candidate: { deletedAt: null },
      job: { deletedAt: null },
      ...(minTimestamp !== null
        ? { createdAt: { gte: new Date(minTimestamp) } }
        : {}),
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
          job: { select: { title: true, deletedAt: true } },
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
    const deletedFallbackCandIds = new Set<string>();
    const deletedFallbackJobIds = new Set<string>();

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
              where: { id: { in: candidateIds }, organizationId },
            })
          : [],
        jobIds.length > 0
          ? this.prisma.job.findMany({
              where: { id: { in: jobIds }, organizationId },
              select: { id: true, title: true, deletedAt: true },
            })
          : [],
      ]);

      for (const cand of candidates) {
        if (cand.deletedAt) deletedFallbackCandIds.add(cand.id);
      }
      for (const j of jobs) {
        if ((j as { deletedAt?: unknown }).deletedAt) {
          deletedFallbackJobIds.add(j.id);
        }
      }

      candidateMap = new Map(
        candidates
          .filter((cand) => !cand.deletedAt)
          .map((cand) => [
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
      jobMap = new Map(
        jobs
          .filter((j) => !(j as { deletedAt?: unknown }).deletedAt)
          .map((j) => [j.id, j.title]),
      );
    }

    const activeApps = apps.filter(
      (a) =>
        !a.candidate?.deletedAt &&
        !(a.job as { deletedAt?: unknown } | null)?.deletedAt &&
        !deletedFallbackCandIds.has(a.candidateId) &&
        !deletedFallbackJobIds.has(a.jobId) &&
        (minTimestamp === null || toTimestamp(a.createdAt) >= minTimestamp),
    );
    const activeTotal =
      activeApps.length < apps.length
        ? Math.max(0, total - (apps.length - activeApps.length))
        : total;

    const data: AttributionLogItem[] = activeApps.map((a) => {
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

    const totalPages = Math.ceil(activeTotal / limit) || 1;

    return {
      data,
      total: activeTotal,
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
