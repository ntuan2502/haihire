import { describe, it, expect, vi, beforeEach } from "vitest";
import { RolesGuard } from "./roles.guard";
import { Reflector } from "@nestjs/core";
import { AppForbiddenException } from "../common/app-exception";
import { PERMISSION_KEY } from "./require-permission.decorator";
import { Role, type Permission } from "@haihire/shared";
import type { ExecutionContext } from "@nestjs/common";

describe("RequirePermissionGuard (RolesGuard RBAC 6-Role Matrix)", () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const createMockContext = (
    user: { id: string; role: string } | null,
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

  const setRequiredPermission = (permission: Permission) => {
    vi.spyOn(reflector, "getAllAndOverride").mockImplementation((key) => {
      if (key === PERMISSION_KEY) {
        return permission;
      }
      return undefined;
    });
  };

  it("should allow request if no permission or role is required", () => {
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);
    const context = createMockContext({ id: "user-1", role: Role.MEMBER });

    expect(guard.canActivate(context)).toBe(true);
  });

  it("should throw AppForbiddenException if user is missing in request", () => {
    setRequiredPermission("job:view");
    const context = createMockContext(null);

    expect(() => guard.canActivate(context)).toThrow(AppForbiddenException);
  });

  describe("OWNER role privileges", () => {
    it("OWNER bypasses all permissions including billing and sensitive actions", () => {
      const ownerContext = createMockContext({
        id: "owner-1",
        role: Role.OWNER,
      });

      setRequiredPermission("org:manage_billing");
      expect(guard.canActivate(ownerContext)).toBe(true);

      setRequiredPermission("job:delete");
      expect(guard.canActivate(ownerContext)).toBe(true);

      setRequiredPermission("settings:manage_integrations");
      expect(guard.canActivate(ownerContext)).toBe(true);
    });
  });

  describe("ADMIN role permissions & boundaries", () => {
    it("ADMIN can manage members, jobs, candidates, but CANNOT manage billing", () => {
      const adminContext = createMockContext({
        id: "admin-1",
        role: Role.ADMIN,
      });

      setRequiredPermission("org:manage_members");
      expect(guard.canActivate(adminContext)).toBe(true);

      setRequiredPermission("job:create");
      expect(guard.canActivate(adminContext)).toBe(true);

      setRequiredPermission("settings:manage_integrations");
      expect(guard.canActivate(adminContext)).toBe(true);

      // Boundary: ADMIN cannot manage billing (only OWNER)
      setRequiredPermission("org:manage_billing");
      expect(() => guard.canActivate(adminContext)).toThrow(
        AppForbiddenException,
      );
    });
  });

  describe("RECRUITER role permissions & boundaries", () => {
    it("RECRUITER has CRUD on job/app/candidate, but CANNOT manage billing or settings", () => {
      const recruiterContext = createMockContext({
        id: "recruiter-1",
        role: Role.RECRUITER,
      });

      // CRUD jobs allowed
      setRequiredPermission("job:create");
      expect(guard.canActivate(recruiterContext)).toBe(true);
      setRequiredPermission("job:update");
      expect(guard.canActivate(recruiterContext)).toBe(true);
      setRequiredPermission("job:delete");
      expect(guard.canActivate(recruiterContext)).toBe(true);

      // CRUD candidates & applications allowed
      setRequiredPermission("candidate:create");
      expect(guard.canActivate(recruiterContext)).toBe(true);
      setRequiredPermission("application:update_stage");
      expect(guard.canActivate(recruiterContext)).toBe(true);

      // Boundary: RECRUITER cannot manage settings or billing
      setRequiredPermission("settings:manage_integrations");
      expect(() => guard.canActivate(recruiterContext)).toThrow(
        AppForbiddenException,
      );

      setRequiredPermission("org:manage_billing");
      expect(() => guard.canActivate(recruiterContext)).toThrow(
        AppForbiddenException,
      );

      setRequiredPermission("org:manage_members");
      expect(() => guard.canActivate(recruiterContext)).toThrow(
        AppForbiddenException,
      );
    });
  });

  describe("HIRING_MANAGER role permissions & boundaries", () => {
    it("HIRING_MANAGER can view and update stage, but CANNOT delete jobs or applications", () => {
      const hmContext = createMockContext({
        id: "hm-1",
        role: Role.HIRING_MANAGER,
      });

      setRequiredPermission("job:view");
      expect(guard.canActivate(hmContext)).toBe(true);

      setRequiredPermission("application:update_stage");
      expect(guard.canActivate(hmContext)).toBe(true);

      setRequiredPermission("interview:scorecard_submit");
      expect(guard.canActivate(hmContext)).toBe(true);

      // Boundary: Cannot delete jobs or applications
      setRequiredPermission("job:delete");
      expect(() => guard.canActivate(hmContext)).toThrow(AppForbiddenException);

      setRequiredPermission("application:delete");
      expect(() => guard.canActivate(hmContext)).toThrow(AppForbiddenException);

      setRequiredPermission("candidate:delete");
      expect(() => guard.canActivate(hmContext)).toThrow(AppForbiddenException);
    });
  });

  describe("INTERVIEWER role permissions & boundaries", () => {
    it("INTERVIEWER can submit scorecard and view basic info, but CANNOT delete jobs or update stage", () => {
      const interviewerContext = createMockContext({
        id: "intv-1",
        role: Role.INTERVIEWER,
      });

      setRequiredPermission("interview:scorecard_submit");
      expect(guard.canActivate(interviewerContext)).toBe(true);

      setRequiredPermission("candidate:view_basic");
      expect(guard.canActivate(interviewerContext)).toBe(true);

      setRequiredPermission("interview:view");
      expect(guard.canActivate(interviewerContext)).toBe(true);

      // Boundary: Cannot delete jobs, cannot update stage, cannot view full candidate PII
      setRequiredPermission("job:delete");
      expect(() => guard.canActivate(interviewerContext)).toThrow(
        AppForbiddenException,
      );

      setRequiredPermission("application:update_stage");
      expect(() => guard.canActivate(interviewerContext)).toThrow(
        AppForbiddenException,
      );

      setRequiredPermission("candidate:view");
      expect(() => guard.canActivate(interviewerContext)).toThrow(
        AppForbiddenException,
      );
    });
  });

  describe("MEMBER role permissions & boundaries (read-only baseline)", () => {
    it("MEMBER has read-only access and CANNOT perform write operations", () => {
      const memberContext = createMockContext({
        id: "member-1",
        role: Role.MEMBER,
      });

      // Read access allowed
      setRequiredPermission("job:view");
      expect(guard.canActivate(memberContext)).toBe(true);

      setRequiredPermission("application:view");
      expect(guard.canActivate(memberContext)).toBe(true);

      setRequiredPermission("candidate:view_basic");
      expect(guard.canActivate(memberContext)).toBe(true);

      // Write operations forbidden
      setRequiredPermission("job:create");
      expect(() => guard.canActivate(memberContext)).toThrow(
        AppForbiddenException,
      );

      setRequiredPermission("application:update_stage");
      expect(() => guard.canActivate(memberContext)).toThrow(
        AppForbiddenException,
      );

      setRequiredPermission("interview:create");
      expect(() => guard.canActivate(memberContext)).toThrow(
        AppForbiddenException,
      );

      setRequiredPermission("sourcing:create");
      expect(() => guard.canActivate(memberContext)).toThrow(
        AppForbiddenException,
      );
    });
  });
});
