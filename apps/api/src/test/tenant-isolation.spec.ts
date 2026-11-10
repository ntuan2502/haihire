import { describe, it, expect, beforeEach, vi } from "vitest";
import { TenantGuard } from "../common/guards/tenant.guard";
import { AppForbiddenException } from "../common/app-exception";
import { CandidatesService } from "../candidates/candidates.service";
import { createMockPrismaService } from "./helpers/prisma-composer-mock";
import type { ExecutionContext } from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service";

describe("Tenant Isolation & Cross-Tenant Security Verification", () => {
  let prisma: ReturnType<typeof createMockPrismaService>;
  let guard: TenantGuard;
  let candidates: CandidatesService;

  const context = (organizationId: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: "usr-alpha", organizationId: "org-alpha" },
          query: { organizationId },
          body: {},
        }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    prisma = createMockPrismaService({
      organizationMember: [
        { id: "m-alpha", userId: "usr-alpha", organizationId: "org-alpha" },
      ],
      candidate: [
        {
          id: "cand-alpha",
          organizationId: "org-alpha",
          name: "Alpha",
          email: "alpha@test.com",
          deletedAt: null,
        },
        {
          id: "cand-beta",
          organizationId: "org-beta",
          name: "Beta",
          email: "beta@test.com",
          deletedAt: null,
        },
      ],
      application: [],
    });
    guard = new TenantGuard(prisma as unknown as PrismaService);
    candidates = new CandidatesService(
      prisma as unknown as PrismaService,
      {} as never,
    );
  });

  it("permits the active organization", async () => {
    expect(await guard.canActivate(context("org-alpha"))).toBe(true);
  });

  it("rejects a foreign organization after querying the authenticated user's memberships", async () => {
    const memberships = vi.spyOn(prisma.organizationMember, "findMany");
    await expect(guard.canActivate(context("org-beta"))).rejects.toThrow(
      AppForbiddenException,
    );
    expect(memberships).toHaveBeenCalledWith({
      where: { userId: "usr-alpha" },
      select: { organizationId: true },
    });
  });

  it("permits another organization only when a persistent membership exists", async () => {
    vi.spyOn(prisma.organizationMember, "findMany").mockResolvedValueOnce([
      {
        id: "m-alpha",
        userId: "usr-alpha",
        organizationId: "org-alpha",
        role: "ADMIN",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "m-beta",
        userId: "usr-alpha",
        organizationId: "org-beta",
        role: "ADMIN",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    expect(await guard.canActivate(context("org-beta"))).toBe(true);
    expect(prisma.organizationMember.findMany).toHaveBeenCalledWith({
      where: { userId: "usr-alpha" },
      select: { organizationId: true },
    });
  });

  it("fails closed when the membership lookup fails", async () => {
    vi.spyOn(prisma.organizationMember, "findMany").mockRejectedValueOnce(
      new Error("DB unavailable"),
    );
    await expect(guard.canActivate(context("org-beta"))).rejects.toThrow(
      AppForbiddenException,
    );
  });

  it("returns no candidates and makes no candidate query without a tenant", async () => {
    const query = vi.spyOn(prisma.candidate, "findMany");
    const result = await candidates.findAll(undefined);
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
    expect(query).not.toHaveBeenCalled();
  });

  it("returns only active-tenant candidates from mixed-tenant storage and scopes both queries", async () => {
    const query = vi.spyOn(prisma.candidate, "findMany");
    const count = vi.spyOn(prisma.candidate, "count");
    const result = await candidates.findAll(undefined, undefined, "org-alpha");
    expect(result.data.map((candidate) => candidate.id)).toEqual([
      "cand-alpha",
    ]);
    expect(result.total).toBe(1);
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-alpha", deletedAt: null },
      }),
    );
    expect(count).toHaveBeenCalledWith({
      where: { organizationId: "org-alpha", deletedAt: null },
    });
  });

  it("rejects a foreign query tenant before reading any candidates", async () => {
    const query = vi.spyOn(prisma.candidate, "findMany");
    await expect(
      candidates.findAll("org-beta", undefined, "org-alpha"),
    ).rejects.toThrow(AppForbiddenException);
    expect(query).not.toHaveBeenCalled();
  });
});
