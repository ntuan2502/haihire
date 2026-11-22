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
      organizationMember: {
        findMany: async () => [{ organizationId: "org-2" }],
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
      organizationMember: {
        findMany: async () => [{ organizationId: "org-other" }],
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

  it("should synchronize req.user organizationId, role, and isOwner to the requested membership", async () => {
    const mockPrisma = {
      organizationMember: {
        findMany: async () => [
          {
            organizationId: "org-2",
            role: "MEMBER",
            organization: { ownerId: "usr-owner-2" },
          },
        ],
      },
    } as never;

    const guard = new TenantGuard(mockPrisma);
    const req = {
      user: {
        id: "usr-1",
        organizationId: "org-1",
        role: "ADMIN",
        isOwner: true,
      },
      query: { organizationId: "org-2" },
      body: {},
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
    expect(req.user.organizationId).toBe("org-2");
    expect(req.user.role).toBe("MEMBER");
    expect(req.user.isOwner).toBe(false);
  });
});
