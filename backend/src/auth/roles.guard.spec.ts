import { describe, it, expect, vi, beforeEach } from "vitest";
import { RolesGuard } from "./roles.guard";
import { Reflector } from "@nestjs/core";
import {
  AppForbiddenException,
  AppUnauthorizedException,
} from "../common/app-exception";
import { PERMISSION_KEY } from "./require-permission.decorator";
import { ROLES_KEY } from "./roles.decorator";
import { Role } from "@haihire/shared";
import type { ExecutionContext } from "@nestjs/common";

describe("RolesGuard", () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const createMockContext = (
    user: {
      id: string;
      role: Role;
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
    guard = new RolesGuard(reflector);
  });

  describe("F-014: Unauthenticated access handling", () => {
    it("should throw AppUnauthorizedException (401) when user is null or undefined", () => {
      vi.spyOn(reflector, "getAllAndOverride").mockImplementation((key) => {
        if (key === PERMISSION_KEY) return "job:view";
        return undefined;
      });

      const context = createMockContext(null);

      expect(() => guard.canActivate(context)).toThrow(
        AppUnauthorizedException,
      );
    });
  });

  describe("ADR-003: Dynamic isOwner bypass", () => {
    it("should allow access when user.isOwner is explicitly true regardless of permissions", () => {
      vi.spyOn(reflector, "getAllAndOverride").mockImplementation((key) => {
        if (key === PERMISSION_KEY) return "org:manage_billing";
        return undefined;
      });

      const context = createMockContext({
        id: "owner-1",
        role: Role.ADMIN,
        isOwner: true,
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it("should allow access when user.id matches user.organization.ownerId", () => {
      vi.spyOn(reflector, "getAllAndOverride").mockImplementation((key) => {
        if (key === PERMISSION_KEY) return "org:manage_billing";
        return undefined;
      });

      const context = createMockContext({
        id: "owner-2",
        role: Role.ADMIN,
        organization: { ownerId: "owner-2" },
      });

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe("Role & Permission evaluation", () => {
    it("should allow access when no roles or permissions are required", () => {
      vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);

      const context = createMockContext({
        id: "member-1",
        role: Role.MEMBER,
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it("should allow access when user has matching role from ROLES_KEY", () => {
      vi.spyOn(reflector, "getAllAndOverride").mockImplementation((key) => {
        if (key === ROLES_KEY) return [Role.ADMIN, Role.RECRUITER];
        return undefined;
      });

      const context = createMockContext({
        id: "recruiter-1",
        role: Role.RECRUITER,
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it("should throw AppForbiddenException (403) when user lacks required role", () => {
      vi.spyOn(reflector, "getAllAndOverride").mockImplementation((key) => {
        if (key === ROLES_KEY) return [Role.ADMIN];
        return undefined;
      });

      const context = createMockContext({
        id: "member-1",
        role: Role.MEMBER,
      });

      expect(() => guard.canActivate(context)).toThrow(AppForbiddenException);
    });

    it("should allow access when user has required permission", () => {
      vi.spyOn(reflector, "getAllAndOverride").mockImplementation((key) => {
        if (key === PERMISSION_KEY) return "job:view";
        return undefined;
      });

      const context = createMockContext({
        id: "member-1",
        role: Role.MEMBER,
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it("should throw AppForbiddenException (403) when user lacks required permission", () => {
      vi.spyOn(reflector, "getAllAndOverride").mockImplementation((key) => {
        if (key === PERMISSION_KEY) return "job:create";
        return undefined;
      });

      const context = createMockContext({
        id: "member-1",
        role: Role.MEMBER,
      });

      expect(() => guard.canActivate(context)).toThrow(AppForbiddenException);
    });
  });
});
