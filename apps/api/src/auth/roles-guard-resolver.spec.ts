import { describe, it, expect, vi, beforeEach } from "vitest";
import { RolesGuard } from "./roles.guard";
import { PermissionResolverService } from "./permission-resolver.service";
import { Reflector } from "@nestjs/core";
import { AppForbiddenException } from "../common/app-exception";
import { PERMISSION_KEY } from "./require-permission.decorator";
import { Role } from "@haihire/shared";
import type { ExecutionContext } from "@nestjs/common";

describe("RolesGuard with PermissionResolverService Integration", () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let mockResolver: Partial<PermissionResolverService>;

  const createMockContext = (
    user: {
      id: string;
      role: Role;
      organizationId?: string;
      isOwner?: boolean;
      organization?: { ownerId?: string };
    } | null,
  ): ExecutionContext =>
    ({
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = new Reflector();
    mockResolver = {
      resolvePermission: vi.fn(),
    };
    guard = new RolesGuard(
      reflector,
      mockResolver as PermissionResolverService,
    );
  });

  it("1. Owner bypasses permissions synchronously without consulting resolver", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockImplementation((key) => {
      if (key === PERMISSION_KEY) return "candidate:view";
      return undefined;
    });

    const context = createMockContext({
      id: "owner-1",
      role: Role.MEMBER,
      isOwner: true,
      organizationId: "org-1",
    });

    const allowed = guard.canActivate(context);
    expect(allowed).toBe(true);
    expect(mockResolver.resolvePermission).not.toHaveBeenCalled();
  });

  it("2. Consults PermissionResolverService for non-owner and allows access when granted", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockImplementation((key) => {
      if (key === PERMISSION_KEY) return "candidate:view";
      return undefined;
    });

    vi.mocked(mockResolver.resolvePermission!).mockResolvedValue(true);

    const context = createMockContext({
      id: "usr-1",
      role: Role.MEMBER,
      organizationId: "org-1",
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockResolver.resolvePermission).toHaveBeenCalledWith(
      "org-1",
      Role.MEMBER,
      "candidate:view",
    );
  });

  it("3. Throws AppForbiddenException when PermissionResolverService resolves to false", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockImplementation((key) => {
      if (key === PERMISSION_KEY) return "job:delete";
      return undefined;
    });

    vi.mocked(mockResolver.resolvePermission!).mockResolvedValue(false);

    const context = createMockContext({
      id: "usr-2",
      role: Role.RECRUITER,
      organizationId: "org-1",
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      AppForbiddenException,
    );
  });
});
