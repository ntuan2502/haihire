import "reflect-metadata";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "@haihire/shared";
import { SourcingController } from "./sourcing.controller";
import type { SourcingService } from "./sourcing.service";
import { RolesGuard } from "../auth/roles.guard";
import { AppForbiddenException } from "../common/app-exception";

describe("SourcingController RBAC & Guard Authorization", () => {
  let rolesGuard: RolesGuard;
  const mockSourcingService = {
    getStats: vi.fn(),
    getLinks: vi.fn(),
    getLinkDetails: vi.fn(),
    getAttributionLog: vi.fn(),
    createLink: vi.fn(),
    updateLink: vi.fn(),
    deleteLink: vi.fn(),
    recordClick: vi.fn(),
  };

  const createMockContext = (
    user: { id?: string; role?: string; organizationId?: string | null },
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    handler: Function,
  ): ExecutionContext => {
    return {
      getClass: () => SourcingController,
      getHandler: () => handler,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    rolesGuard = new RolesGuard(new Reflector());
    new SourcingController(mockSourcingService as unknown as SourcingService);
  });

  const endpoints = [
    ["getStats", SourcingController.prototype.getStats],
    ["getLinks", SourcingController.prototype.getLinks],
    ["getLinkDetails", SourcingController.prototype.getLinkDetails],
    ["getAttributionLog", SourcingController.prototype.getAttributionLog],
  ] as const;

  it.each(endpoints)(
    "%s endpoint has RolesGuard configured",
    (_name, handler) => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, handler) ?? [];
      expect(guards).toContain(RolesGuard);
    },
  );

  it.each(endpoints)(
    "%s rejects MEMBER without sourcing:view -> 403 Forbidden",
    (_name, handler) => {
      const context = createMockContext(
        { id: "member-1", role: Role.MEMBER, organizationId: "org-1" },
        handler,
      );
      expect(() => rolesGuard.canActivate(context)).toThrow(
        AppForbiddenException,
      );
    },
  );

  it.each(endpoints)(
    "%s rejects INTERVIEWER without sourcing:view -> 403 Forbidden",
    (_name, handler) => {
      const context = createMockContext(
        { id: "intv-1", role: Role.INTERVIEWER, organizationId: "org-1" },
        handler,
      );
      expect(() => rolesGuard.canActivate(context)).toThrow(
        AppForbiddenException,
      );
    },
  );

  it.each(endpoints)(
    "%s allows RECRUITER with sourcing:view",
    (_name, handler) => {
      const context = createMockContext(
        { id: "recruiter-1", role: Role.RECRUITER, organizationId: "org-1" },
        handler,
      );
      expect(rolesGuard.canActivate(context)).toBe(true);
    },
  );

  it.each(endpoints)(
    "%s allows HIRING_MANAGER with sourcing:view",
    (_name, handler) => {
      const context = createMockContext(
        { id: "hm-1", role: Role.HIRING_MANAGER, organizationId: "org-1" },
        handler,
      );
      expect(rolesGuard.canActivate(context)).toBe(true);
    },
  );
});
