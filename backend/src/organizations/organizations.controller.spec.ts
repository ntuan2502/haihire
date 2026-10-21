import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";
import { RolesGuard } from "../auth/roles.guard";
import { Reflector } from "@nestjs/core";
import { AppForbiddenException } from "../common/app-exception";
import { APP_ERROR_CODES, Role } from "@haihire/shared";
import type { ExecutionContext } from "@nestjs/common";

describe("OrganizationsController", () => {
  let controller: OrganizationsController;
  let service: OrganizationsService;
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  const mockService = {
    create: vi.fn(),
    getMyOrg: vi.fn(),
    deleteMyOrg: vi.fn(),
  };

  const ownerReq = {
    user: {
      id: "user-owner",
      email: "owner@haihire.local",
      role: Role.ADMIN,
      organizationId: "org-1",
    },
  };

  const nonOwnerAdminReq = {
    user: {
      id: "user-admin-other",
      email: "admin@haihire.local",
      role: Role.ADMIN,
      organizationId: "org-1",
    },
  };

  const memberReq = {
    user: {
      id: "user-member",
      email: "member@haihire.local",
      role: Role.MEMBER,
      organizationId: "org-1",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = mockService as unknown as OrganizationsService;
    controller = new OrganizationsController(service);
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
  });

  const createMockContext = (req: { user?: unknown }): ExecutionContext =>
    ({
      getHandler: () => controller.deleteMyOrg,
      getClass: () => OrganizationsController,
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    }) as unknown as ExecutionContext;

  describe("DELETE /organizations/my (F-003 Owner organization deletion)", () => {
    it("Case 1: allows organization owner (role=ADMIN, user.id === org.ownerId) to delete org -> 200 OK", async () => {
      // Arrange
      const context = createMockContext(ownerReq);
      mockService.deleteMyOrg.mockResolvedValue({ success: true });

      // Act
      const canActivate = rolesGuard.canActivate(context);
      expect(canActivate).toBe(true);

      const result = await controller.deleteMyOrg(ownerReq);

      // Assert
      expect(mockService.deleteMyOrg).toHaveBeenCalledWith("user-owner");
      expect(result).toEqual({ success: true });
    });

    it("Case 2: passes guard for non-owner ADMIN but throws 403 at service layer", async () => {
      // Arrange
      const context = createMockContext(nonOwnerAdminReq);
      mockService.deleteMyOrg.mockRejectedValue(
        new AppForbiddenException(
          APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
          "Only the organization owner can delete this organization.",
        ),
      );

      // Act
      const canActivate = rolesGuard.canActivate(context);
      expect(canActivate).toBe(true);

      // Assert
      await expect(
        controller.deleteMyOrg(nonOwnerAdminReq),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
      });
      expect(mockService.deleteMyOrg).toHaveBeenCalledWith("user-admin-other");
    });

    it("Case 3: rejects MEMBER with 403 at the RolesGuard layer", () => {
      // Arrange
      const context = createMockContext(memberReq);

      // Act & Assert
      expect(() => rolesGuard.canActivate(context)).toThrow(
        AppForbiddenException,
      );
      expect(mockService.deleteMyOrg).not.toHaveBeenCalled();
    });
  });
});
