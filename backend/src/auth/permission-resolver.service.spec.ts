import { describe, it, expect, vi, beforeEach } from "vitest";
import { PermissionResolverService } from "./permission-resolver.service";
import type { PrismaService } from "../prisma/prisma.service";
import { Role } from "@haihire/shared";

describe("PermissionResolverService (Dynamic DB Overrides & Fallback Matrix)", () => {
  let service: PermissionResolverService;
  let mockRecords: Array<{
    organizationId: string;
    role: string;
    permission: string;
    granted: boolean;
  }>;
  let selectQueryFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRecords = [];

    selectQueryFn = vi.fn().mockImplementation((...fields: string[]) => ({
      where: vi.fn().mockImplementation((predicateFn) => ({
        all: vi.fn().mockImplementation(async () => {
          return mockRecords
            .filter((r) => {
              const mockRecord = {
                organizationId: {
                  eq: (target: string) => r.organizationId === target,
                },
                role: {
                  eq: (target: string) => r.role === target,
                },
                permission: {
                  eq: (target: string) => r.permission === target,
                },
              };
              return predicateFn(mockRecord);
            })
            .map((r) => {
              const proj: Record<string, unknown> = {};
              for (const f of fields) proj[f] = r[f as keyof typeof r];
              return proj;
            });
        }),
      })),
    }));

    const mockPrismaService = {
      db: {
        orm: {
          public: {
            OrganizationRolePermission: {
              select: selectQueryFn,
            },
          },
        },
      },
    };

    service = new PermissionResolverService(
      mockPrismaService as unknown as PrismaService,
    );
  });

  it("1. Falls back to static permissions matrix when org has no custom overrides", async () => {
    // MEMBER does not have candidate:view by default
    const memberCanView = await service.resolvePermission(
      "org-1",
      Role.MEMBER,
      "candidate:view",
    );
    expect(memberCanView).toBe(false);

    // ADMIN has job:create by default
    const adminCanCreateJob = await service.resolvePermission(
      "org-1",
      Role.ADMIN,
      "job:create",
    );
    expect(adminCanCreateJob).toBe(true);
  });

  it("2. Falls back to static permissions matrix when organizationId is null or undefined", async () => {
    const res = await service.resolvePermission(null, Role.ADMIN, "org:delete");
    expect(res).toBe(true);
  });

  it("3. Returns true when organization explicitly overrides permission with granted=true", async () => {
    mockRecords.push({
      organizationId: "org-custom",
      role: Role.MEMBER,
      permission: "candidate:view",
      granted: true,
    });

    const result = await service.resolvePermission(
      "org-custom",
      Role.MEMBER,
      "candidate:view",
    );
    expect(result).toBe(true);
  });

  it("4. Returns false when organization explicitly overrides permission with granted=false (even if default is true)", async () => {
    // RECRUITER by default has job:create = true
    mockRecords.push({
      organizationId: "org-custom",
      role: Role.RECRUITER,
      permission: "job:create",
      granted: false,
    });

    const result = await service.resolvePermission(
      "org-custom",
      Role.RECRUITER,
      "job:create",
    );
    expect(result).toBe(false);
  });

  it("5. Caches queries in memory to avoid repetitive DB calls and respects invalidateCache", async () => {
    // First query executes DB fetch
    await service.resolvePermission("org-cached", Role.MEMBER, "job:view");
    expect(selectQueryFn).toHaveBeenCalledTimes(1);

    // Second query uses cache (no DB call)
    await service.resolvePermission(
      "org-cached",
      Role.MEMBER,
      "candidate:view",
    );
    expect(selectQueryFn).toHaveBeenCalledTimes(1);

    // Invalidate cache for org-cached
    service.invalidateCache("org-cached");

    // Next query hits DB again
    await service.resolvePermission("org-cached", Role.MEMBER, "job:view");
    expect(selectQueryFn).toHaveBeenCalledTimes(2);

    // Invalidate all cache
    service.invalidateCache();
    await service.resolvePermission("org-cached", Role.MEMBER, "job:view");
    expect(selectQueryFn).toHaveBeenCalledTimes(3);
  });
});
