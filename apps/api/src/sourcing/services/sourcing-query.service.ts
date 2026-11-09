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
      where: { organizationId },
      select: {
        id: true,
        title: true,
        organizationId: true,
      },
    });
  }

  async getApplicationsForJobs(jobIds: string[]) {
    if (jobIds.length === 0) return [];
    return this.prisma.application.findMany({
      where: { jobId: { in: jobIds } },
      select: {
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
      select: { id: true, name: true, email: true },
    });
  }

  async getTrackingLinks(organizationId: string) {
    return this.prisma.trackingLink.findMany({
      where: { organizationId },
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
      where: { id, organizationId },
      select: { title: true, type: true },
    });
  }

  async getJobsByIds(organizationId: string, jobIds: string[]) {
    if (jobIds.length === 0) return [];
    return this.prisma.job.findMany({
      where: {
        organizationId,
        id: { in: jobIds },
      },
      select: { id: true, title: true, type: true },
    });
  }

  async getClicksForLinks(linkIds: string[]) {
    if (linkIds.length === 0) return [];
    return this.prisma.trackingClick.findMany({
      where: { trackingLinkId: { in: linkIds } },
      select: {
        referrerDomain: true,
        createdAt: true,
      },
    });
  }

  async getClicksForLink(linkId: string) {
    return this.prisma.trackingClick.findMany({
      where: { trackingLinkId: linkId },
      select: {
        id: true,
        referrerDomain: true,
        createdAt: true,
      },
    });
  }

  async getAttributedApplicationsForLink(linkId: string) {
    return this.prisma.application.findMany({
      where: { trackingLinkId: linkId },
      select: {
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
