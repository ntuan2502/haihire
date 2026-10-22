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
    transferOwnership: vi.fn(),
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

  describe("POST /organizations/my/transfer-ownership (Enhancement P1 / F-016)", () => {
    const createTransferContext = (req: { user?: unknown }): ExecutionContext =>
      ({
        getHandler: () => controller.transferOwnership,
        getClass: () => OrganizationsController,
        switchToHttp: () => ({
          getRequest: () => req,
        }),
      }) as unknown as ExecutionContext;

    it("allows owner to transfer ownership -> 200 OK", async () => {
      const context = createTransferContext(ownerReq);
      mockService.transferOwnership.mockResolvedValue({
        success: true,
        newOwnerId: "user-admin-other",
      });

      const canActivate = rolesGuard.canActivate(context);
      expect(canActivate).toBe(true);

      const result = await controller.transferOwnership(ownerReq, {
        newOwnerUserId: "user-admin-other",
      });

      expect(mockService.transferOwnership).toHaveBeenCalledWith(
        "user-owner",
        "user-admin-other",
      );
      expect(result).toEqual({
        success: true,
        newOwnerId: "user-admin-other",
      });
    });

    it("rejects MEMBER with 403 at RolesGuard layer", () => {
      const context = createTransferContext(memberReq);

      expect(() => rolesGuard.canActivate(context)).toThrow(
        AppForbiddenException,
      );
      expect(mockService.transferOwnership).not.toHaveBeenCalled();
    });

    it("simulates full lifecycle: owner transfers ownership, old owner calling deleteMyOrg gets 403, new owner calling deleteMyOrg gets 200", async () => {
      // 1. Transfer ownership from user-owner to user-admin-other
      const transferContext = createTransferContext(ownerReq);
      mockService.transferOwnership.mockResolvedValue({
        success: true,
        newOwnerId: "user-admin-other",
      });
      expect(rolesGuard.canActivate(transferContext)).toBe(true);
      await controller.transferOwnership(ownerReq, {
        newOwnerUserId: "user-admin-other",
      });
      expect(mockService.transferOwnership).toHaveBeenCalledWith(
        "user-owner",
        "user-admin-other",
      );

      // 2. Old owner calling deleteMyOrg -> service rejects with 403 ORG_FORBIDDEN_ACTION
      const oldOwnerDeleteContext = createMockContext(ownerReq);
      mockService.deleteMyOrg.mockRejectedValueOnce(
        new AppForbiddenException(
          APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
          "Only the organization owner can delete this organization.",
        ),
      );
      expect(rolesGuard.canActivate(oldOwnerDeleteContext)).toBe(true);
      await expect(controller.deleteMyOrg(ownerReq)).rejects.toMatchObject({
        code: APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
      });

      // 3. New owner calling deleteMyOrg -> service resolves with 200 OK
      const newOwnerReq = {
        user: {
          id: "user-admin-other",
          email: "admin@haihire.local",
          role: Role.ADMIN,
          organizationId: "org-1",
        },
      };
      const newOwnerDeleteContext = createMockContext(newOwnerReq);
      mockService.deleteMyOrg.mockResolvedValueOnce({
        success: true,
        message: "Organization deleted successfully",
      });
      expect(rolesGuard.canActivate(newOwnerDeleteContext)).toBe(true);
      const deleteResult = await controller.deleteMyOrg(newOwnerReq);
      expect(deleteResult).toEqual({
        success: true,
        message: "Organization deleted successfully",
      });
      expect(mockService.deleteMyOrg).toHaveBeenCalledWith("user-admin-other");
    });
  });
});
