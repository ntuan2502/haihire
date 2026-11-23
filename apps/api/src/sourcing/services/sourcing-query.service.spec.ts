import { describe, expect, it } from "vitest";
import { SourcingQueryService } from "./sourcing-query.service";
import {
  createMockTable,
  createMockPrismaService,
} from "../../test/helpers/prisma-composer-mock";
import type { PrismaService } from "../../prisma/prisma.service";

describe("SourcingQueryService", () => {
  const jobTable = createMockTable([
    {
      id: "job-1",
      title: "Software Engineer",
      organizationId: "org-1",
      type: "FULL_TIME",
    },
    {
      id: "job-2",
      title: "DevOps Engineer",
      organizationId: "org-1",
      type: "CONTRACT",
    },
    {
      id: "job-3",
      title: "Foreign Job",
      organizationId: "org-2",
      type: "FULL_TIME",
    },
  ]);

  const applicationTable = createMockTable([
    {
      id: "app-1",
      jobId: "job-1",
      candidateId: "cand-1",
      trackingLinkId: "link-1",
    },
  ]);

  const candidateTable = createMockTable([
    {
      id: "cand-1",
      firstName: "Alice",
      lastName: "Smith",
      displayName: null,
      email: "alice@example.com",
      organizationId: "org-1",
    },
  ]);

  const trackingLinkTable = createMockTable([
    {
      id: "link-1",
      organizationId: "org-1",
      name: "LinkedIn Link",
      token: "tok-1",
      clicksCount: 10,
    },
  ]);

  const trackingClickTable = createMockTable([
    { id: "click-1", trackingLinkId: "link-1", referrerDomain: "linkedin.com" },
  ]);

  const mockPrisma = createMockPrismaService({
    job: jobTable,
    application: applicationTable,
    candidate: candidateTable,
    trackingLink: trackingLinkTable,
    trackingClick: trackingClickTable,
  }) as unknown as PrismaService;

  const service = new SourcingQueryService(mockPrisma);

  it("fetches organization jobs isolated by organizationId", async () => {
    const jobs = await service.getOrganizationJobs("org-1");
    expect(jobs.length).toBe(2);
    expect(jobs.every((j) => j.organizationId === "org-1")).toBe(true);
  });

  it("fetches applications for specified job IDs", async () => {
    const apps = await service.getApplicationsForJobs(["job-1"]);
    expect(apps.length).toBe(1);
    expect(apps[0]?.id).toBe("app-1");
  });

  it("returns empty array when querying applications with empty job IDs", async () => {
    const apps = await service.getApplicationsForJobs([]);
    expect(apps).toEqual([]);
  });

  it("fetches candidates by IDs scoped to organization", async () => {
    const candidates = await service.getCandidatesByIds("org-1", ["cand-1"]);
    expect(candidates.length).toBe(1);
    expect(candidates[0]?.firstName).toBe("Alice");
    expect(candidates[0]?.lastName).toBe("Smith");
  });

  it("returns empty array when querying candidates with empty IDs", async () => {
    const candidates = await service.getCandidatesByIds("org-1", []);
    expect(candidates).toEqual([]);
  });

  it("fetches tracking links for organization", async () => {
    const links = await service.getTrackingLinks("org-1");
    expect(links.length).toBe(1);
    expect(links[0]?.id).toBe("link-1");
  });

  it("fetches a single tracking link by ID", async () => {
    const link = await service.getTrackingLinkById("link-1");
    expect(link?.name).toBe("LinkedIn Link");
  });

  it("fetches clicks for link IDs", async () => {
    const clicks = await service.getClicksForLinks(["link-1"]);
    expect(clicks.length).toBe(1);
    expect(clicks[0]?.referrerDomain).toBe("linkedin.com");
  });

  it("returns empty clicks for empty link IDs", async () => {
    const clicks = await service.getClicksForLinks([]);
    expect(clicks).toEqual([]);
  });
});
