import { describe, expect, it } from "vitest";
import { TenantGuard } from "./tenant.guard";
import { AppForbiddenException } from "../app-exception";
import type { ExecutionContext } from "@nestjs/common";

describe("TenantGuard", () => {
  it("should allow request if no organizationId is requested", async () => {
    const mockPrisma = {} as never;
    const guard = new TenantGuard(mockPrisma);

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: "usr-1", organizationId: "org-1" },
          query: {},
          body: {},
        }),
      }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it("should allow request if requested organizationId matches user organizationId", async () => {
    const mockPrisma = {} as never;
    const guard = new TenantGuard(mockPrisma);

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: "usr-1", organizationId: "org-1" },
          query: { organizationId: "org-1" },
          body: {},
        }),
      }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it("should allow request if user is persistent member of requested org", async () => {
    const mockPrisma = {
      db: {
        orm: {
          public: {
            OrganizationMember: {
              select: () => ({
                where: () => ({
                  all: async () => [{ organizationId: "org-2" }],
                }),
              }),
            },
          },
        },
      },
    } as never;

    const guard = new TenantGuard(mockPrisma);

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: "usr-1", organizationId: "org-1" },
          query: { organizationId: "org-2" },
          body: {},
        }),
      }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it("should throw AppForbiddenException if user has no membership in requested org", async () => {
    const mockPrisma = {
      db: {
        orm: {
          public: {
            OrganizationMember: {
              select: () => ({
                where: () => ({
                  all: async () => [{ organizationId: "org-other" }],
                }),
              }),
            },
          },
        },
      },
    } as never;

    const guard = new TenantGuard(mockPrisma);

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: "usr-1", organizationId: "org-1" },
          query: { organizationId: "org-forbidden" },
          body: {},
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      AppForbiddenException,
    );
  });
});
