import { describe, expect, it, vi, beforeEach } from "vitest";
import { SourcingService } from "./sourcing.service";
import { SourcingChannel } from "@haihire/shared";

function evaluatePredicate(
  item: Record<string, unknown>,
  pred?: (proxy: unknown) => unknown,
): boolean {
  if (!pred) return true;
  function wrapResult(val: boolean) {
    return {
      and: (other: { value: boolean } | boolean) =>
        wrapResult(val && (typeof other === "boolean" ? other : other.value)),
      value: val,
    };
  }
  const proxy = new Proxy({}, {
    get: (_, prop: string) => {
      const fieldVal = item[prop];
      return {
        eq: (target: unknown) => wrapResult(fieldVal === target),
        in: (targets: unknown[]) =>
          wrapResult(Array.isArray(targets) && targets.includes(fieldVal)),
      };
    },
  });
  const res = pred(proxy) as { value?: boolean } | boolean;
  return typeof res === "boolean" ? res : (res?.value ?? true);
}

describe("SourcingService", () => {
  let service: SourcingService;
  const inMemoryLinks: Array<Record<string, unknown>> = [];
  const inMemoryClicks: Array<Record<string, unknown>> = [];
  const inMemoryJobs: Array<Record<string, unknown>> = [];
  const inMemoryApps: Array<Record<string, unknown>> = [];
  const inMemoryCandidates: Array<Record<string, unknown>> = [];

  let executeTxSpy: ReturnType<typeof vi.fn>;
  let currentMockDb: unknown;

  const mockActivitiesService = {
    createActivity: vi.fn().mockResolvedValue({ id: "act-1" }),
  };

  beforeEach(() => {
    inMemoryLinks.length = 0;
    inMemoryClicks.length = 0;
    inMemoryJobs.length = 0;
    inMemoryApps.length = 0;
    inMemoryCandidates.length = 0;

    function createQueryBuilder(
      items: Array<Record<string, unknown>>,
      predicates: Array<(proxy: unknown) => unknown> = [],
    ) {
      return {
        where: (pred: (proxy: unknown) => unknown) =>
          createQueryBuilder(items, [...predicates, pred]),
        all: async () =>
          items.filter((item) => predicates.every((p) => evaluatePredicate(item, p))),
        first: async () =>
          items.find((item) => predicates.every((p) => evaluatePredicate(item, p))) || null,
      };
    }

    const mockDb = {
      orm: {
        public: {
          Job: {
            select: vi.fn().mockImplementation(() => createQueryBuilder(inMemoryJobs)),
          },
          Candidate: {
            select: vi.fn().mockImplementation(() => createQueryBuilder(inMemoryCandidates)),
          },
          User: {
            select: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                first: vi.fn().mockResolvedValue({ name: "Recruiter Bob" }),
              }),
            }),
          },
          Application: {
            select: vi.fn().mockImplementation(() => createQueryBuilder(inMemoryApps)),
          },
          TrackingClick: {
            select: vi.fn().mockImplementation(() => createQueryBuilder(inMemoryClicks)),
            create: vi.fn().mockImplementation(async (data) => {
              inMemoryClicks.push(data);
              return data;
            }),
          },
          TrackingLink: {
            select: vi.fn().mockImplementation(() => createQueryBuilder(inMemoryLinks)),
            create: vi.fn().mockImplementation(async (data) => {
              inMemoryLinks.push(data);
              return data;
            }),
            where: vi.fn().mockImplementation((pred) => ({
              update: vi.fn().mockImplementation(async (updateData) => {
                const item = inMemoryLinks.find((l) => evaluatePredicate(l, pred));
                if (item) {
                  Object.assign(item, updateData);
                }
                return item;
              }),
            })),
          },
        },
      },
    };

    currentMockDb = mockDb;

    executeTxSpy = vi.fn().mockImplementation(async (fn: (tx: typeof mockDb) => Promise<unknown>) => {
      return fn(mockDb);
    });

    const mockPrisma = {
      db: mockDb,
      executeTx: executeTxSpy,
      transaction: executeTxSpy,
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

  it("should record public clicks and increment click count in transaction", async () => {
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
    expect(executeTxSpy).toHaveBeenCalledTimes(1);
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

  it("should strictly scope getStats to current organization and never leak other tenant data", async () => {
    // Org-1 resources
    inMemoryJobs.push({ id: "job-org1", title: "Dev Org 1", organizationId: "org-1" });
    inMemoryCandidates.push({ id: "cand-org1", name: "Alice", email: "alice@org1.com", organizationId: "org-1" });
    inMemoryApps.push({
      id: "app-org1",
      jobId: "job-org1",
      candidateId: "cand-org1",
      stage: "APPLIED",
      sourceChannel: SourcingChannel.LINKEDIN,
      createdAt: new Date().toISOString(),
    });

    // Org-2 resources (other tenant)
    inMemoryJobs.push({ id: "job-org2", title: "Dev Org 2", organizationId: "org-2" });
    inMemoryCandidates.push({ id: "cand-org2", name: "Bob", email: "bob@org2.com", organizationId: "org-2" });
    inMemoryApps.push({
      id: "app-org2",
      jobId: "job-org2",
      candidateId: "cand-org2",
      stage: "APPLIED",
      sourceChannel: SourcingChannel.INDEED,
      createdAt: new Date().toISOString(),
    });

    const statsOrg1 = await service.getStats("org-1", "all");

    // Only org-1's applications should be included
    expect(statsOrg1.totalApplications).toBe(1);
    expect(statsOrg1.channelBreakdown).toHaveLength(1);
    expect(statsOrg1.channelBreakdown[0].channel).toBe(SourcingChannel.LINKEDIN);

    // Org-2 data must not appear
    const org2Source = statsOrg1.channelBreakdown.find((c) => c.channel === SourcingChannel.INDEED);
    expect(org2Source).toBeUndefined();
  });

  it("recordClick handles concurrent calls without lost updates", async () => {
    inMemoryLinks.push({
      id: "link-concurrent",
      token: "lnk-conc1",
      source: SourcingChannel.LINKEDIN,
      clicksCount: 0,
      isActive: true,
      deletedAt: null,
    });

    // Simulate async I/O delay in transaction to test concurrent race condition resilience
    executeTxSpy.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      await new Promise((resolve) => setTimeout(resolve, 2));
      return fn(currentMockDb);
    });

    // Fire 10 concurrent click events with the same token
    const clickPromises = Array.from({ length: 10 }, (_, i) =>
      service.recordClick("lnk-conc1", "https://linkedin.com", `10.0.0.${i + 1}`, `TestAgent-${i}`),
    );

    const results = await Promise.all(clickPromises);

    expect(results.every((r) => r.success)).toBe(true);
    expect(inMemoryLinks[0].clicksCount).toBe(10);
    expect(inMemoryClicks).toHaveLength(10);
    expect(executeTxSpy).toHaveBeenCalledTimes(10);
  });

  it("should rollback click counter if tracking click log creation fails in transaction", async () => {
    inMemoryLinks.push({
      id: "link-fail",
      token: "lnk-fail",
      source: SourcingChannel.LINKEDIN,
      clicksCount: 10,
      isActive: true,
      deletedAt: null,
    });

    // Simulate database failure during transaction
    executeTxSpy.mockImplementationOnce(async () => {
      // Rollback simulated
      throw new Error("DB Connection Error during transaction");
    });

    await expect(
      service.recordClick("lnk-fail", "https://linkedin.com", "127.0.0.1", "TestAgent"),
    ).rejects.toThrow("DB Connection Error during transaction");

    // Clicks count must remain unchanged
    expect(inMemoryLinks[0].clicksCount).toBe(10);
    expect(inMemoryClicks).toHaveLength(0);
  });
});
