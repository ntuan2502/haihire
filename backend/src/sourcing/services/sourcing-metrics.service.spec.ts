import { describe, expect, it, beforeEach } from "vitest";
import { APP_ERROR_CODES, SourcingChannel } from "@haihire/shared";
import { SourcingMetricsService } from "./sourcing-metrics.service";
import { AppForbiddenException } from "../../common/app-exception";
import {
  createMockTable,
  type MockTable,
} from "../../test/helpers/prisma-composer-mock";
import type { PrismaService } from "../../prisma/prisma.service";

describe("SourcingMetricsService", () => {
  let service: SourcingMetricsService;

  let jobTable: MockTable<Record<string, unknown>>;
  let applicationTable: MockTable<Record<string, unknown>>;
  let candidateTable: MockTable<Record<string, unknown>>;
  let trackingLinkTable: MockTable<Record<string, unknown>>;
  let trackingClickTable: MockTable<Record<string, unknown>>;

  let mockPrisma: PrismaService;

  const NOW = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  beforeEach(() => {
    jobTable = createMockTable([
      {
        id: "job-1",
        title: "Staff Frontend Architect",
        organizationId: "org-1",
        type: "FULL_TIME",
      },
      {
        id: "job-2",
        title: "Lead DevOps Engineer",
        organizationId: "org-1",
        type: "CONTRACT",
      },
      {
        id: "job-other",
        title: "Other Org Job",
        organizationId: "org-other",
        type: "FULL_TIME",
      },
    ]);

    candidateTable = createMockTable([
      {
        id: "cand-1",
        organizationId: "org-1",
        name: "Alice Walker",
        email: "alice@example.com",
      },
      {
        id: "cand-2",
        organizationId: "org-1",
        name: "Bob Stone",
        email: "bob@example.com",
      },
      {
        id: "cand-3",
        organizationId: "org-1",
        name: "Charlie Brown",
        email: "charlie@example.com",
      },
    ]);

    trackingLinkTable = createMockTable([
      {
        id: "link-1",
        organizationId: "org-1",
        name: "LinkedIn Post Q4",
        token: "tok-linkedin",
        source: SourcingChannel.LINKEDIN,
        customSource: "feed-post",
        jobId: "job-1",
        campaign: "q4-growth",
        medium: "social",
        utmSource: "linkedin",
        utmMedium: "social",
        utmCampaign: "q4-growth",
        clicksCount: 20,
        isActive: true,
        deletedAt: null,
        createdAt: new Date(NOW - 10 * ONE_DAY_MS).toISOString(),
        updatedAt: new Date(NOW - 5 * ONE_DAY_MS).toISOString(),
      },
      {
        id: "link-2",
        organizationId: "org-1",
        name: "Indeed Sponsored",
        token: "tok-indeed",
        source: SourcingChannel.INDEED,
        jobId: "job-2",
        campaign: "devops-hiring",
        clicksCount: 50,
        isActive: true,
        deletedAt: null,
        createdAt: new Date(NOW - 40 * ONE_DAY_MS).toISOString(),
        updatedAt: new Date(NOW - 20 * ONE_DAY_MS).toISOString(),
      },
      {
        id: "link-deleted",
        organizationId: "org-1",
        name: "Archived Link",
        token: "tok-archived",
        source: SourcingChannel.OTHER,
        clicksCount: 5,
        isActive: false,
        deletedAt: new Date(NOW - 2 * ONE_DAY_MS).toISOString(),
      },
      {
        id: "link-diff-org",
        organizationId: "org-other",
        name: "Competitor Link",
        token: "tok-comp",
        source: SourcingChannel.REFERRAL,
        clicksCount: 100,
        isActive: true,
        deletedAt: null,
      },
    ]);

    trackingClickTable = createMockTable([
      {
        id: "click-1",
        trackingLinkId: "link-1",
        referrerDomain: "linkedin.com",
        createdAt: new Date(NOW - 5 * ONE_DAY_MS).toISOString(),
      },
      {
        id: "click-2",
        trackingLinkId: "link-1",
        referrerDomain: "google.com",
        createdAt: new Date(NOW - 2 * ONE_DAY_MS).toISOString(),
      },
      {
        id: "click-3",
        trackingLinkId: "link-1",
        referrerDomain: "linkedin.com",
        createdAt: new Date(NOW - 80 * ONE_DAY_MS).toISOString(),
      },
      {
        id: "click-4",
        trackingLinkId: "link-2",
        referrerDomain: "indeed.com",
        createdAt: new Date(NOW - 15 * ONE_DAY_MS).toISOString(),
      },
    ]);

    applicationTable = createMockTable([
      {
        id: "app-1",
        jobId: "job-1",
        candidateId: "cand-1",
        stage: "HIRED",
        sourceChannel: SourcingChannel.LINKEDIN,
        sourceDetails: "feed-post",
        referrerDomain: "linkedin.com",
        utmCampaign: "q4-growth",
        trackingLinkId: "link-1",
        createdAt: new Date(NOW - 4 * ONE_DAY_MS).toISOString(),
      },
      {
        id: "app-2",
        jobId: "job-1",
        candidateId: "cand-2",
        stage: "INTERVIEW",
        sourceChannel: SourcingChannel.LINKEDIN,
        sourceDetails: "feed-post",
        referrerDomain: "linkedin.com",
        utmCampaign: "q4-growth",
        trackingLinkId: "link-1",
        createdAt: new Date(NOW - 25 * ONE_DAY_MS).toISOString(),
      },
      {
        id: "app-3",
        jobId: "job-2",
        candidateId: "cand-3",
        stage: "APPLIED",
        sourceChannel: SourcingChannel.INDEED,
        sourceDetails: null,
        referrerDomain: "indeed.com",
        utmCampaign: "devops-hiring",
        trackingLinkId: "link-2",
        createdAt: new Date(NOW - 50 * ONE_DAY_MS).toISOString(),
      },
    ]);

    mockPrisma = {
      db: {
        orm: {
          public: {
            Job: jobTable,
            Application: applicationTable,
            Candidate: candidateTable,
            TrackingLink: trackingLinkTable,
            TrackingClick: trackingClickTable,
          },
        },
      },
    } as unknown as PrismaService;

    service = new SourcingMetricsService(mockPrisma);
  });

  describe("Group 1: getStats Filters & Analytics", () => {
    it("throws AppForbiddenException when organizationId is missing", async () => {
      await expect(service.getStats("")).rejects.toThrow(AppForbiddenException);
    });

    it("returns zero metrics gracefully when organization has no jobs", async () => {
      const stats = await service.getStats("org-empty");
      expect(stats.totalApplications).toBe(0);
      expect(stats.activeLinksCount).toBe(0);
      expect(stats.attributionRate).toBe(0);
      expect(stats.topLinks).toEqual([]);
    });

    it("filters stats by timeRange 30d accurately", async () => {
      const stats = await service.getStats("org-1", "30d");
      // app-1 (4d ago) and app-2 (25d ago) match; app-3 (50d ago) is excluded
      expect(stats.totalApplications).toBe(2);
      expect(stats.trackedCount).toBe(2);
      expect(stats.attributionRate).toBe(100);
      expect(stats.activeLinksCount).toBe(2);
    });

    it("filters stats by jobId parameter", async () => {
      const stats = await service.getStats("org-1", "all", "job-2");
      expect(stats.totalApplications).toBe(1);
      expect(stats.recentAttributed[0]?.jobTitle).toBe("Lead DevOps Engineer");
    });

    it("aggregates domain breakdown and ranks top tracking links", async () => {
      const stats = await service.getStats("org-1", "all");
      expect(stats.totalApplications).toBe(3);
      expect(stats.topLinks.length).toBeGreaterThan(0);
      // link-2 has 50 clicks, link-1 has 20 clicks
      expect(stats.topLinks[0]?.id).toBe("link-2");
      expect(stats.topReferrers.some((r) => r.domain === "linkedin.com")).toBe(
        true,
      );
    });
  });

  describe("Group 2: getLinkDetails Analytics Engine", () => {
    it("throws AppForbiddenException when organizationId is empty", async () => {
      await expect(service.getLinkDetails("", "link-1")).rejects.toThrow(
        AppForbiddenException,
      );
    });

    it("throws AppNotFoundException when link does not exist", async () => {
      await expect(
        service.getLinkDetails("org-1", "non-existent"),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.TRACKING_LINK_NOT_FOUND,
      });
    });

    it("throws AppNotFoundException when link is soft-deleted", async () => {
      await expect(
        service.getLinkDetails("org-1", "link-deleted"),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.TRACKING_LINK_NOT_FOUND,
      });
    });

    it("throws AppForbiddenException on cross-tenant access attempt", async () => {
      await expect(
        service.getLinkDetails("org-1", "link-diff-org"),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
      });
    });

    it("computes happy path link details with conversion rates and stage funnel", async () => {
      const details = await service.getLinkDetails("org-1", "link-1", "30d");

      expect(details.link.id).toBe("link-1");
      expect(details.link.name).toBe("LinkedIn Post Q4");
      expect(details.link.jobTitle).toBe("Staff Frontend Architect");
      expect(details.stats.applications).toBe(2);
      expect(
        details.pipeline.stages.find((s) => s.stage === "HIRED")?.count,
      ).toBe(1);
      expect(
        details.pipeline.stages.find((s) => s.stage === "INTERVIEW")?.count,
      ).toBe(1);
      expect(details.stats.cvr).toBeGreaterThan(0);
      expect(details.stats.hireRate).toBe(50);
    });

    it("maps candidate names and emails into attributed applications list", async () => {
      const details = await service.getLinkDetails("org-1", "link-1", "all");
      expect(details.attributedApplications).toHaveLength(2);
      const appAlice = details.attributedApplications.find(
        (a) => a.candidateEmail === "alice@example.com",
      );
      expect(appAlice).toBeDefined();
      expect(appAlice?.candidateName).toBe("Alice Walker");
      expect(appAlice?.stage).toBe("HIRED");
    });

    it("aggregates top referrer domains specifically for the tracking link", async () => {
      const details = await service.getLinkDetails("org-1", "link-1", "all");
      expect(details.referrerDomains.length).toBeGreaterThan(0);
      const linkedInRef = details.referrerDomains.find(
        (r) => r.domain === "linkedin.com",
      );
      expect(linkedInRef?.count).toBe(4);
    });

    it("gracefully handles links with zero clicks and zero applications", async () => {
      trackingLinkTable.store.push({
        id: "link-empty",
        organizationId: "org-1",
        name: "Empty Fresh Link",
        token: "tok-fresh",
        source: SourcingChannel.CAREER_SITE,
        clicksCount: 0,
        isActive: true,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const details = await service.getLinkDetails(
        "org-1",
        "link-empty",
        "all",
      );
      expect(details.stats.clicks).toBe(0);
      expect(details.stats.applications).toBe(0);
      expect(details.stats.cvr).toBe(0);
      expect(details.stats.hireRate).toBe(0);
      expect(details.attributedApplications).toEqual([]);
      expect(details.referrerDomains).toEqual([]);
    });

    it("filters clicks and applications according to timeRange 7d", async () => {
      const details7d = await service.getLinkDetails("org-1", "link-1", "7d");
      // app-1 was 4 days ago (in 7d); app-2 was 25 days ago (out of 7d)
      expect(details7d.stats.applications).toBe(1);
      expect(details7d.attributedApplications[0]?.candidateName).toBe(
        "Alice Walker",
      );
    });
  });

  describe("Group 3: getAttributionLog Paginated Audit Log", () => {
    it("returns paginated attribution log for organization jobs", async () => {
      const result = await service.getAttributionLog("org-1", {
        page: 1,
        limit: 10,
      });
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.data).toHaveLength(3);
    });

    it("filters attribution log by jobId", async () => {
      const result = await service.getAttributionLog("org-1", {
        jobId: "job-2",
      });
      expect(result.total).toBe(1);
      expect(result.data[0]?.jobTitle).toBe("Lead DevOps Engineer");
    });

    it("filters attribution log by sourceChannel", async () => {
      const result = await service.getAttributionLog("org-1", {
        source: SourcingChannel.INDEED,
      });
      expect(result.total).toBe(1);
      expect(result.data[0]?.source).toBe(SourcingChannel.INDEED);
    });

    it("searches attribution log by candidate name case-insensitively", async () => {
      const result = await service.getAttributionLog("org-1", {
        search: "alice",
      });
      expect(result.total).toBe(1);
      expect(result.data[0]?.candidateName).toBe("Alice Walker");
    });

    it("searches attribution log by candidate email", async () => {
      const result = await service.getAttributionLog("org-1", {
        search: "bob@example",
      });
      expect(result.total).toBe(1);
      expect(result.data[0]?.candidateName).toBe("Bob Stone");
    });

    it("searches attribution log by UTM campaign", async () => {
      const result = await service.getAttributionLog("org-1", {
        search: "devops-hiring",
      });
      expect(result.total).toBe(1);
      expect(result.data[0]?.candidateName).toBe("Charlie Brown");
    });

    it("returns empty structure when organization has no jobs or query matches nothing", async () => {
      const noJobsResult = await service.getAttributionLog("org-empty", {});
      expect(noJobsResult.total).toBe(0);
      expect(noJobsResult.data).toEqual([]);

      const noMatchResult = await service.getAttributionLog("org-1", {
        search: "non-existent-keyword",
      });
      expect(noMatchResult.total).toBe(0);
      expect(noMatchResult.data).toEqual([]);
    });
  });
});
