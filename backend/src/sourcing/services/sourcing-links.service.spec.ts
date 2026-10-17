import { describe, expect, it, beforeEach } from "vitest";
import { APP_ERROR_CODES, SourcingChannel } from "@haihire/shared";
import { SourcingLinksService, parseDomain } from "./sourcing-links.service";
import {
  AppForbiddenException,
  AppNotFoundException,
} from "../../common/app-exception";
import {
  createMockTable,
  MockTable,
} from "../../test/helpers/prisma-composer-mock";
import type { PrismaService } from "../../prisma/prisma.service";

describe("SourcingLinksService", () => {
  let service: SourcingLinksService;

  let trackingLinkTable: MockTable<Record<string, unknown>>;
  let jobTable: MockTable<Record<string, unknown>>;
  let applicationTable: MockTable<Record<string, unknown>>;

  let mockPrisma: PrismaService;

  beforeEach(() => {
    trackingLinkTable = createMockTable([
      {
        id: "link-1",
        organizationId: "org-1",
        name: "LinkedIn Hiring Campaign",
        token: "tok-linkedin-1",
        source: SourcingChannel.LINKEDIN,
        customSource: null,
        jobId: "job-1",
        campaign: "q4-growth",
        medium: "social",
        utmSource: "linkedin",
        utmMedium: "social",
        utmCampaign: "q4-growth",
        clicksCount: 15,
        isActive: true,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "link-2",
        organizationId: "org-1",
        name: "Indeed Sponsored Ads",
        token: "tok-indeed-2",
        source: SourcingChannel.INDEED,
        customSource: "sponsored",
        jobId: "job-2",
        campaign: "tech-talent",
        medium: "cpc",
        utmSource: "indeed",
        utmMedium: "cpc",
        utmCampaign: "tech-talent",
        clicksCount: 30,
        isActive: false,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "link-deleted",
        organizationId: "org-1",
        name: "Deleted Link",
        token: "tok-deleted",
        source: SourcingChannel.OTHER,
        clicksCount: 5,
        isActive: false,
        deletedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "link-diff-org",
        organizationId: "org-other",
        name: "Other Org Link",
        token: "tok-other-org",
        source: SourcingChannel.REFERRAL,
        clicksCount: 10,
        isActive: true,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    jobTable = createMockTable([
      {
        id: "job-1",
        title: "Frontend Engineer",
        organizationId: "org-1",
      },
      {
        id: "job-2",
        title: "Backend Engineer",
        organizationId: "org-1",
      },
    ]);

    applicationTable = createMockTable([
      {
        id: "app-1",
        trackingLinkId: "link-1",
      },
      {
        id: "app-2",
        trackingLinkId: "link-1",
      },
    ]);

    mockPrisma = {
      db: {
        orm: {
          public: {
            TrackingLink: trackingLinkTable,
            Job: jobTable,
            Application: applicationTable,
          },
        },
      },
    } as unknown as PrismaService;

    service = new SourcingLinksService(mockPrisma);
  });

  describe("Utility: parseDomain", () => {
    it("parses valid URLs and extracts normalized hostname without www", () => {
      expect(parseDomain("https://www.linkedin.com/jobs/view/123")).toBe(
        "linkedin.com",
      );
      expect(parseDomain("http://indeed.com")).toBe("indeed.com");
      expect(parseDomain("careers.google.com")).toBe("careers.google.com");
    });

    it("returns null on empty, null, or invalid URLs", () => {
      expect(parseDomain(null)).toBeNull();
      expect(parseDomain("")).toBeNull();
      expect(parseDomain("   ")).toBeNull();
    });
  });

  describe("Group 1: updateLink", () => {
    it("updates link name and source successfully", async () => {
      await service.updateLink("org-1", "link-1", {
        name: "Updated LinkedIn Post",
        source: SourcingChannel.TWITTER_X,
      });

      const updated = trackingLinkTable.store.find((l) => l.id === "link-1");
      expect(updated?.name).toBe("Updated LinkedIn Post");
      expect(updated?.source).toBe(SourcingChannel.TWITTER_X);
    });

    it("updates full UTM parameters", async () => {
      await service.updateLink("org-1", "link-1", {
        utmSource: "twitter",
        utmMedium: "cpc",
        utmCampaign: "fall-hiring",
        utmTerm: "react",
        utmContent: "banner-ad",
      });

      const updated = trackingLinkTable.store.find((l) => l.id === "link-1");
      expect(updated?.utmSource).toBe("twitter");
      expect(updated?.utmMedium).toBe("cpc");
      expect(updated?.utmCampaign).toBe("fall-hiring");
      expect(updated?.utmTerm).toBe("react");
      expect(updated?.utmContent).toBe("banner-ad");
    });

    it("toggles isActive status", async () => {
      await service.updateLink("org-1", "link-1", {
        isActive: false,
      });

      const updated = trackingLinkTable.store.find((l) => l.id === "link-1");
      expect(updated?.isActive).toBe(false);
    });

    it("throws AppNotFoundException when link does not exist", async () => {
      await expect(
        service.updateLink("org-1", "non-existent-link", { name: "New Name" }),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.TRACKING_LINK_NOT_FOUND,
      });
    });

    it("throws AppNotFoundException when link is soft-deleted", async () => {
      await expect(
        service.updateLink("org-1", "link-deleted", { name: "Revive Attempt" }),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.TRACKING_LINK_NOT_FOUND,
      });
    });

    it("throws AppForbiddenException on cross-tenant link update", async () => {
      await expect(
        service.updateLink("org-1", "link-diff-org", { name: "Steal Link" }),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
      });
    });
  });

  describe("Group 2: deleteLink", () => {
    it("soft-deletes link and deactivates it", async () => {
      await service.deleteLink("org-1", "link-1");

      const link = trackingLinkTable.store.find((l) => l.id === "link-1");
      expect(link?.deletedAt).toBeDefined();
      expect(link?.isActive).toBe(false);
    });

    it("throws AppNotFoundException when link does not exist", async () => {
      await expect(
        service.deleteLink("org-1", "non-existent-link"),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.TRACKING_LINK_NOT_FOUND,
      });
    });

    it("throws AppNotFoundException when link is already soft-deleted", async () => {
      await expect(
        service.deleteLink("org-1", "link-deleted"),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.TRACKING_LINK_NOT_FOUND,
      });
    });

    it("throws AppForbiddenException on cross-tenant delete attempt", async () => {
      await expect(
        service.deleteLink("org-1", "link-diff-org"),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
      });
    });
  });

  describe("Group 3: findLinkByToken", () => {
    it("finds tracking link by exact token match", async () => {
      const link = await service.findLinkByToken("tok-linkedin-1");
      expect(link).toBeDefined();
      expect(link?.id).toBe("link-1");
      expect(link?.name).toBe("LinkedIn Hiring Campaign");
    });

    it("returns null when token does not match any link", async () => {
      const link = await service.findLinkByToken("non-existent-token");
      expect(link).toBeNull();
    });

    it("returns null when token is empty string", async () => {
      const link = await service.findLinkByToken("");
      expect(link).toBeNull();
    });
  });

  describe("Group 4: getLinks Filters & Search", () => {
    it("filters tracking links by isActive status and jobId", async () => {
      const resActive = await service.getLinks("org-1", {
        isActive: true,
        jobId: "job-1",
      });
      expect(resActive.total).toBe(1);
      expect(resActive.data[0]?.id).toBe("link-1");
      expect(resActive.data[0]?.jobTitle).toBe("Frontend Engineer");
      expect(resActive.data[0]?.applicationsCount).toBe(2);

      const resInactive = await service.getLinks("org-1", { isActive: false });
      expect(resInactive.total).toBe(1);
      expect(resInactive.data[0]?.id).toBe("link-2");
    });

    it("searches tracking links by name, token, or campaign", async () => {
      const byName = await service.getLinks("org-1", { search: "hiring" });
      expect(byName.total).toBe(1);
      expect(byName.data[0]?.id).toBe("link-1");

      const byToken = await service.getLinks("org-1", { search: "tok-indeed" });
      expect(byToken.total).toBe(1);
      expect(byToken.data[0]?.id).toBe("link-2");

      const byCampaign = await service.getLinks("org-1", {
        search: "tech-talent",
      });
      expect(byCampaign.total).toBe(1);
      expect(byCampaign.data[0]?.id).toBe("link-2");
    });
  });
});
