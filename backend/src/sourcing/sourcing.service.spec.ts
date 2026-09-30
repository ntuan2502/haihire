import { describe, expect, it, vi, beforeEach } from "vitest";
import { SourcingService } from "./sourcing.service";
import { SourcingChannel } from "@haihire/shared";

describe("SourcingService", () => {
  let service: SourcingService;
  const inMemoryLinks: Array<Record<string, unknown>> = [];
  const inMemoryClicks: Array<Record<string, unknown>> = [];
  const inMemoryJobs: Array<Record<string, unknown>> = [];
  const inMemoryApps: Array<Record<string, unknown>> = [];
  const inMemoryCandidates: Array<Record<string, unknown>> = [];

  const mockActivitiesService = {
    createActivity: vi.fn().mockResolvedValue({ id: "act-1" }),
  };

  beforeEach(() => {
    inMemoryLinks.length = 0;
    inMemoryClicks.length = 0;
    inMemoryJobs.length = 0;
    inMemoryApps.length = 0;
    inMemoryCandidates.length = 0;

    const mockPrisma = {
      db: {
        orm: {
          public: {
            Job: {
              select: vi.fn().mockReturnValue({
                where: vi.fn().mockImplementation((pred) => ({
                  all: vi.fn().mockImplementation(async () => {
                    return inMemoryJobs.filter((j) => {
                      const rec = { organizationId: { eq: (val: string) => j.organizationId === val } };
                      return pred ? pred(rec) : true;
                    });
                  }),
                  first: vi.fn().mockImplementation(async () => {
                    return inMemoryJobs.find((j) => {
                      const rec = { id: { eq: (val: string) => j.id === val } };
                      return pred ? pred(rec) : true;
                    }) || null;
                  }),
                })),
                all: vi.fn().mockImplementation(async () => inMemoryJobs),
              }),
            },
            Candidate: {
              select: vi.fn().mockReturnValue({
                all: vi.fn().mockImplementation(async () => inMemoryCandidates),
              }),
            },
            User: {
              select: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  first: vi.fn().mockResolvedValue({ name: "Recruiter Bob" }),
                }),
              }),
            },
            Application: {
              select: vi.fn().mockReturnValue({
                all: vi.fn().mockImplementation(async () => inMemoryApps),
              }),
            },
            TrackingClick: {
              select: vi.fn().mockReturnValue({
                all: vi.fn().mockImplementation(async () => inMemoryClicks),
              }),
              create: vi.fn().mockImplementation(async (data) => {
                inMemoryClicks.push(data);
                return data;
              }),
            },
            TrackingLink: {
              select: vi.fn().mockReturnValue({
                where: vi.fn().mockImplementation((pred) => ({
                  all: vi.fn().mockImplementation(async () => {
                    return inMemoryLinks.filter((l) => {
                      const rec = { organizationId: { eq: (val: string) => l.organizationId === val } };
                      return pred ? pred(rec) : true;
                    });
                  }),
                  first: vi.fn().mockImplementation(async () => {
                    return inMemoryLinks.find((l) => {
                      const rec = {
                        id: { eq: (val: string) => l.id === val },
                        token: { eq: (val: string) => l.token === val },
                      };
                      return pred ? pred(rec) : true;
                    }) || null;
                  }),
                })),
              }),
              create: vi.fn().mockImplementation(async (data) => {
                inMemoryLinks.push(data);
                return data;
              }),
              where: vi.fn().mockImplementation((pred) => ({
                update: vi.fn().mockImplementation(async (updateData) => {
                  const item = inMemoryLinks.find((l) => {
                    const rec = { id: { eq: (val: string) => l.id === val } };
                    return pred ? pred(rec) : true;
                  });
                  if (item) {
                    Object.assign(item, updateData);
                  }
                  return item;
                }),
              })),
            },
          },
        },
      },
    };

    service = new SourcingService(mockPrisma as never, mockActivitiesService as never);
  });

  it("should create a new tracking link with unique token", async () => {
    inMemoryJobs.push({ id: "job-1", title: "Senior Developer", organizationId: "org-1" });

    const link = await service.createLink("org-1", "user-1", {
      name: "LinkedIn Hiring Campaign",
      source: SourcingChannel.LINKEDIN,
      jobId: "job-1",
      campaign: "spring-2026",
    });

    expect(link.name).toBe("LinkedIn Hiring Campaign");
    expect(link.source).toBe(SourcingChannel.LINKEDIN);
    expect(link.token).toMatch(/^lnk-[a-f0-9]{6}$/);
    expect(link.jobTitle).toBe("Senior Developer");
    expect(inMemoryLinks).toHaveLength(1);
  });

  it("should record public clicks and increment click count", async () => {
    inMemoryLinks.push({
      id: "link-1",
      token: "lnk-test1",
      source: SourcingChannel.LINKEDIN,
      clicksCount: 2,
      isActive: true,
      deletedAt: null,
    });

    const res = await service.recordClick(
      "lnk-test1",
      "https://www.linkedin.com/feed",
      "127.0.0.1",
      "Mozilla/5.0",
    );

    expect(res.success).toBe(true);
    expect(inMemoryLinks[0].clicksCount).toBe(3);
    expect(inMemoryClicks).toHaveLength(1);
    expect(inMemoryClicks[0].referrerDomain).toBe("linkedin.com");
  });

  it("should return paginated links with conversion rate", async () => {
    inMemoryJobs.push({ id: "job-1", title: "Lead Architect", organizationId: "org-1" });
    inMemoryLinks.push({
      id: "link-1",
      organizationId: "org-1",
      name: "Indeed Link",
      token: "lnk-indeed",
      source: SourcingChannel.INDEED,
      jobId: "job-1",
      clicksCount: 10,
      isActive: true,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    inMemoryApps.push({
      id: "app-1",
      trackingLinkId: "link-1",
      jobId: "job-1",
    });

    const result = await service.getLinks("org-1", { page: 1, limit: 10 });
    expect(result.total).toBe(1);
    expect(result.data[0].applicationsCount).toBe(1);
    expect(result.data[0].clicksCount).toBe(10);
    expect(result.data[0].conversionRate).toBe(10); // 1 / 10 = 10%
  });

  it("should calculate correct sourcing overview stats and funnel", async () => {
    inMemoryJobs.push({ id: "job-1", title: "Product Designer", organizationId: "org-1" });
    inMemoryLinks.push({
      id: "link-1",
      organizationId: "org-1",
      name: "Handshake Interns",
      token: "lnk-handshake",
      source: SourcingChannel.HANDSHAKE,
      jobId: "job-1",
      clicksCount: 50,
      isActive: true,
      deletedAt: null,
    });
    inMemoryApps.push(
      {
        id: "app-1",
        jobId: "job-1",
        candidateId: "cand-1",
        stage: "APPLIED",
        sourceChannel: SourcingChannel.HANDSHAKE,
        trackingLinkId: "link-1",
        createdAt: new Date().toISOString(),
      },
      {
        id: "app-2",
        jobId: "job-1",
        candidateId: "cand-2",
        stage: "HIRED",
        sourceChannel: SourcingChannel.LINKEDIN,
        referrerDomain: "linkedin.com",
        createdAt: new Date().toISOString(),
      },
      {
        id: "app-3",
        jobId: "job-1",
        candidateId: "cand-3",
        stage: "APPLIED",
        sourceChannel: SourcingChannel.DIRECT,
        createdAt: new Date().toISOString(),
      },
    );

    const stats = await service.getStats("org-1", "30d");

    expect(stats.totalApplications).toBe(3);
    expect(stats.trackedCount).toBe(2); // app-1 and app-2
    expect(stats.untrackedCount).toBe(1); // app-3
    expect(stats.attributionRate).toBe(67); // 2/3 = 67%
    expect(stats.activeLinksCount).toBe(1);

    // Channel breakdown
    const handshakeBreakdown = stats.channelBreakdown.find(
      (c) => c.channel === SourcingChannel.HANDSHAKE,
    );
    expect(handshakeBreakdown?.count).toBe(1);

    // Conversion by source
    const linkedinFunnel = stats.conversionBySource.find(
      (f) => f.source === SourcingChannel.LINKEDIN,
    );
    expect(linkedinFunnel?.hired).toBe(1);
    expect(linkedinFunnel?.hireRate).toBe(100);
  });
});
