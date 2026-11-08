import { describe, it, expect, beforeEach } from "vitest";
import { TenantGuard } from "../common/guards/tenant.guard";
import { AppForbiddenException } from "../common/app-exception";
import { CandidatesService } from "../candidates/candidates.service";
import type { ExecutionContext } from "@nestjs/common";

describe("Tenant Isolation & Cross-Tenant Security Verification", () => {
  interface MockDbState {
    orgs: Array<{ id: string; name: string }>;
    orgMembers: Array<{ id: string; userId: string; organizationId: string; role: string }>;
    jobs: Array<{ id: string; organizationId: string; title: string; status: string }>;
    candidates: Array<{ id: string; organizationId: string; name: string; email: string }>;
    applications: Array<{ id: string; jobId: string; candidateId: string; stage: string }>;
  }

  let dbState: MockDbState;
  let tenantGuard: TenantGuard;
  let candidatesService: CandidatesService;

  beforeEach(() => {
    dbState = {
      orgs: [
        { id: "org-alpha", name: "Alpha Tech Corp" },
        { id: "org-beta", name: "Beta Financials" },
      ],
      orgMembers: [
        { id: "m-1", userId: "usr-alpha", organizationId: "org-alpha", role: "ADMIN" },
        { id: "m-2", userId: "usr-beta", organizationId: "org-beta", role: "ADMIN" },
      ],
      jobs: [
        { id: "job-alpha-1", organizationId: "org-alpha", title: "Alpha Architect", status: "PUBLISHED" },
        { id: "job-beta-1", organizationId: "org-beta", title: "Beta Trader", status: "PUBLISHED" },
      ],
      candidates: [
        { id: "cand-alpha-1", organizationId: "org-alpha", name: "Nguyen Alpha", email: "alpha@test.com" },
        { id: "cand-beta-1", organizationId: "org-beta", name: "Tran Beta", email: "beta@test.com" },
      ],
      applications: [],
    };

    const mockPrisma = {
      db: {
        orm: {
          public: {
            OrganizationMember: {
              select: () => ({
                where: (_predicate: unknown) => ({
                  all: async () => {
                    // Match by userId and organizationId if queried
                    return dbState.orgMembers;
                  },
                }),
              }),
            },
            Job: {
              select: () => ({
                where: (_predicate: (j: { organizationId: { eq: (id: string) => boolean }; id: { eq: (id: string) => boolean } }) => unknown) => ({
                  all: async () => {
                    return dbState.jobs;
                  },
                  first: async () => {
                    return dbState.jobs[0];
                  },
                }),
              }),
            },
            Candidate: {
              select: () => ({
                where: (_predicate: (c: { organizationId: { eq: (id: string) => boolean }; id: { eq: (id: string) => boolean } }) => unknown) => ({
                  all: async () => {
                    return dbState.candidates;
                  },
                  first: async () => {
                    return dbState.candidates[0];
                  },
                }),
              }),
            },
          },
        },
      },
    };

    tenantGuard = new TenantGuard(mockPrisma as never);
    candidatesService = new CandidatesService(mockPrisma as never, {} as never);
  });

  describe("TenantGuard Cross-Tenant Request Rejection", () => {
    it("permits requests when user accesses their own organization resources", async () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: "usr-alpha", organizationId: "org-alpha" },
            query: { organizationId: "org-alpha" },
            body: {},
          }),
        }),
      } as unknown as ExecutionContext;

      const allowed = await tenantGuard.canActivate(mockContext);
      expect(allowed).toBe(true);
    });

    it("rejects cross-tenant requests with AppForbiddenException when Org Alpha tries to access Org Beta", async () => {
      // Mock prisma returning only org-alpha memberships for usr-alpha
      const mockPrismaRestricted = {
        db: {
          orm: {
            public: {
              OrganizationMember: {
                select: () => ({
                  where: () => ({
                    all: async () => [{ organizationId: "org-alpha" }],
                  }),
                }),
              },
            },
          },
        },
      };

      const restrictedGuard = new TenantGuard(mockPrismaRestricted as never);

      const crossTenantContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: "usr-alpha", organizationId: "org-alpha" },
            query: { organizationId: "org-beta" }, // Malicious or cross-tenant query
            body: {},
          }),
        }),
      } as unknown as ExecutionContext;

      await expect(restrictedGuard.canActivate(crossTenantContext)).rejects.toThrow(
        AppForbiddenException
      );
    });
  });

  describe("Service Layer Multi-Tenant Query Scoping", () => {
    it("returns empty result set when organizationId is missing or invalid", async () => {
      const result = await candidatesService.findAll(undefined);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
