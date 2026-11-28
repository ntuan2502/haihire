import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class SourcingQueryService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async getOrganizationJobs(organizationId: string) {
    return this.prisma.job.findMany({
      where: { organizationId, deletedAt: null },
      select: {
        id: true,
        title: true,
        organizationId: true,
      },
    });
  }

  async getApplicationsForJobs(
    jobIds: string[],
    options?: { minTimestamp?: number | null; organizationId?: string },
  ) {
    if (jobIds.length === 0) return [];
    return this.prisma.application.findMany({
      where: {
        jobId: { in: jobIds },
        ...(options?.organizationId
          ? { organizationId: options.organizationId }
          : {}),
        ...(options?.minTimestamp != null
          ? { createdAt: { gte: new Date(options.minTimestamp) } }
          : {}),
        candidate: { deletedAt: null },
        job: { deletedAt: null },
      },
      select: {
        organizationId: true,
        id: true,
        jobId: true,
        candidateId: true,
        stage: true,
        sourceChannel: true,
        sourceDetails: true,
        referrerDomain: true,
        utmCampaign: true,
        trackingLinkId: true,
        createdAt: true,
      },
    });
  }

  async getCandidatesByIds(organizationId: string, candidateIds: string[]) {
    if (candidateIds.length === 0) return [];
    return this.prisma.candidate.findMany({
      where: {
        organizationId,
        id: { in: candidateIds },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        displayName: true,
        email: true,
        deletedAt: true,
      },
    });
  }

  async getTrackingLinks(organizationId: string) {
    return this.prisma.trackingLink.findMany({
      where: { organizationId, deletedAt: null },
      select: {
        id: true,
        organizationId: true,
        name: true,
        token: true,
        source: true,
        jobId: true,
        clicksCount: true,
        isActive: true,
        deletedAt: true,
      },
    });
  }

  async getTrackingLinkById(id: string) {
    return this.prisma.trackingLink.findFirst({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        name: true,
        token: true,
        source: true,
        customSource: true,
        jobId: true,
        campaign: true,
        medium: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        utmTerm: true,
        utmContent: true,
        clicksCount: true,
        isActive: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getJobById(organizationId: string, id: string) {
    return this.prisma.job.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: { title: true, type: true },
    });
  }

  async getJobsByIds(organizationId: string, jobIds: string[]) {
    if (jobIds.length === 0) return [];
    return this.prisma.job.findMany({
      where: {
        organizationId,
        id: { in: jobIds },
        deletedAt: null,
      },
      select: { id: true, title: true, type: true, deletedAt: true },
    });
  }

  async getClicksForLinks(
    linkIds: string[],
    options?: { minTimestamp?: number | null; organizationId?: string },
  ) {
    if (linkIds.length === 0) return [];
    return this.prisma.trackingClick.findMany({
      where: {
        trackingLinkId: { in: linkIds },
        ...(options?.organizationId
          ? { organizationId: options.organizationId }
          : {}),
        ...(options?.minTimestamp != null
          ? { createdAt: { gte: new Date(options.minTimestamp) } }
          : {}),
      },
      select: {
        organizationId: true,
        trackingLinkId: true,
        referrerDomain: true,
        createdAt: true,
      },
    });
  }

  async getClickAggregatesForLinks(
    linkIds: string[],
    options?: { minTimestamp?: number | null; organizationId?: string },
  ): Promise<
    Array<{
      trackingLinkId: string | null;
      referrerDomain: string | null;
      count: number;
    }>
  > {
    if (linkIds.length === 0) return [];

    if (typeof this.prisma.trackingClick.groupBy === "function") {
      const grouped = await this.prisma.trackingClick.groupBy({
        by: ["trackingLinkId", "referrerDomain"],
        where: {
          trackingLinkId: { in: linkIds },
          ...(options?.organizationId
            ? { organizationId: options.organizationId }
            : {}),
          ...(options?.minTimestamp != null
            ? { createdAt: { gte: new Date(options.minTimestamp) } }
            : {}),
        },
        _count: { _all: true },
      });
      return grouped.map((row) => ({
        trackingLinkId: row.trackingLinkId,
        referrerDomain: row.referrerDomain,
        count:
          typeof row._count === "object" && row._count !== null
            ? (row._count._all ?? 0)
            : 0,
      }));
    }

    const rawClicks = await this.getClicksForLinks(linkIds, options);
    const aggMap = new Map<
      string,
      {
        trackingLinkId: string | null;
        referrerDomain: string | null;
        count: number;
      }
    >();
    for (const clk of rawClicks) {
      const key = `${clk.trackingLinkId ?? ""}\u0000${clk.referrerDomain ?? ""}`;
      const existing = aggMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        aggMap.set(key, {
          trackingLinkId: clk.trackingLinkId,
          referrerDomain: clk.referrerDomain,
          count: 1,
        });
      }
    }
    return Array.from(aggMap.values());
  }

  async getClicksForLink(
    linkId: string,
    organizationId?: string,
    options?: { minTimestamp?: number | null },
  ) {
    return this.prisma.trackingClick.findMany({
      where: {
        trackingLinkId: linkId,
        ...(organizationId ? { organizationId } : {}),
        ...(options?.minTimestamp != null
          ? { createdAt: { gte: new Date(options.minTimestamp) } }
          : {}),
      },
      select: {
        organizationId: true,
        id: true,
        referrerDomain: true,
        createdAt: true,
      },
    });
  }

  async getAttributedApplicationsForLink(
    linkId: string,
    organizationId?: string,
  ) {
    return this.prisma.application.findMany({
      where: {
        trackingLinkId: linkId,
        ...(organizationId ? { organizationId } : {}),
        candidate: { deletedAt: null },
        job: { deletedAt: null },
      },
      select: {
        organizationId: true,
        id: true,
        candidateId: true,
        jobId: true,
        stage: true,
        referrerDomain: true,
        sourceDetails: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        utmTerm: true,
        utmContent: true,
        createdAt: true,
      },
    });
  }
}
