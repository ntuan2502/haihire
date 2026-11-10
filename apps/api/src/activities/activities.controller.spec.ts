import "reflect-metadata";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "@haihire/shared";
import { ActivitiesController } from "./activities.controller";
import type { ActivitiesService } from "./activities.service";
import { RolesGuard } from "../auth/roles.guard";
import { AppForbiddenException } from "../common/app-exception";
import { PERMISSION_KEY } from "../auth/require-permission.decorator";

describe("ActivitiesController RBAC & Guard Authorization", () => {
  let rolesGuard: RolesGuard;
  const mockActivitiesService = {
    findByCandidate: vi.fn(),
    findByApplication: vi.fn(),
    createActivity: vi.fn(),
  };

  const createMockContext = (
    user: {
      id?: string;
      name?: string;
      role?: string;
      organizationId?: string | null;
    },
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    handler: Function,
  ): ExecutionContext => {
    return {
      getClass: () => ActivitiesController,
      getHandler: () => handler,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    rolesGuard = new RolesGuard(new Reflector());
    new ActivitiesController(
      mockActivitiesService as unknown as ActivitiesService,
    );
  });

  it("POST /activities requires candidate:update permission", () => {
    const requiredPermission = Reflect.getMetadata(
      PERMISSION_KEY,
      ActivitiesController.prototype.create,
    );
    expect(requiredPermission).toBe("candidate:update");
  });

  it("POST /activities rejects MEMBER without candidate:update -> 403 Forbidden", () => {
    const context = createMockContext(
      { id: "member-1", role: Role.MEMBER, organizationId: "org-1" },
      ActivitiesController.prototype.create,
    );
    expect(() => rolesGuard.canActivate(context)).toThrow(
      AppForbiddenException,
    );
  });

  it("POST /activities rejects INTERVIEWER without candidate:update -> 403 Forbidden", () => {
    const context = createMockContext(
      { id: "intv-1", role: Role.INTERVIEWER, organizationId: "org-1" },
      ActivitiesController.prototype.create,
    );
    expect(() => rolesGuard.canActivate(context)).toThrow(
      AppForbiddenException,
    );
  });

  it("POST /activities allows RECRUITER with candidate:update", () => {
    const context = createMockContext(
      { id: "recruiter-1", role: Role.RECRUITER, organizationId: "org-1" },
      ActivitiesController.prototype.create,
    );
    expect(rolesGuard.canActivate(context)).toBe(true);
  });

  it("POST /activities allows ADMIN with candidate:update", () => {
    const context = createMockContext(
      { id: "admin-1", role: Role.ADMIN, organizationId: "org-1" },
      ActivitiesController.prototype.create,
    );
    expect(rolesGuard.canActivate(context)).toBe(true);
  });
});
