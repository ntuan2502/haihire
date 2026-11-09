import { describe, expect, it, vi } from "vitest";
import { SourcingLockService } from "./sourcing-lock.service";
import { createMockPrismaService } from "../../test/helpers/prisma-composer-mock";
import type { PrismaService } from "../../prisma/prisma.service";

describe("SourcingLockService concurrency", () => {
  it("counts both clicks when Redis is absent and both transactions read the same snapshot", async () => {
    const links = [{ id: "link-1", token: "token", source: "LINKEDIN", clicksCount: 0, isActive: true, deletedAt: null }];
    const clicks: Record<string, unknown>[] = [];
    const prisma = createMockPrismaService({ trackingLink: links, trackingClick: clicks });
    let reads = 0;
    let releaseReads!: () => void;
    const bothRead = new Promise<void>((resolve) => { releaseReads = resolve; });
    vi.spyOn(prisma.trackingLink, "findFirst").mockImplementation((async () => {
      const snapshot = { ...links[0] };
      if (++reads === 2) releaseReads();
      await bothRead;
      return snapshot;
    }) as unknown as typeof prisma.trackingLink.findFirst);
    const service = new SourcingLockService(prisma as unknown as PrismaService);
    const results = await Promise.all([service.recordClick("token"), service.recordClick("token")]);
    expect(results.every((result) => result.success)).toBe(true);
    expect(links[0].clicksCount).toBe(2);
    expect(clicks).toHaveLength(2);
  });
});
