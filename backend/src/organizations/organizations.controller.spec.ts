import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";
import { RolesGuard } from "../auth/roles.guard";
import { Reflector } from "@nestjs/core";
import { AppForbiddenException } from "../common/app-exception";
import { APP_ERROR_CODES, Role, type Permission } from "@haihire/shared";
import type { ExecutionContext } from "@nestjs/common";
import { PermissionResolverService } from "../auth/permission-resolver.service";

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
    updateMemberRole: vi.fn(),
    getRolePermissionsMatrix: vi.fn(),
    updateRolePermissions: vi.fn(),
  };

  const ownerReq = {
    user: {
      id: "user-owner",
      email: "owner@haihire.local",
      role: Role.ADMIN,
      organizationId: "org-1",
      isOwner: true,
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

  const createMockContext = (
    req: { user?: unknown },
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    handler: Function = controller.deleteMyOrg,
  ): ExecutionContext =>
    ({
      getHandler: () => handler,
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
      await expect(controller.deleteMyOrg(nonOwnerAdminReq)).rejects.toThrow(
        AppForbiddenException,
      );
      expect(mockService.deleteMyOrg).toHaveBeenCalledWith("user-admin-other");
    });

    it("Case 3: blocks non-admin member from deleting org -> 403 Forbidden", () => {
      // Arrange
      const context = createMockContext(memberReq);

      // Act & Assert
      expect(() => rolesGuard.canActivate(context)).toThrow(
        AppForbiddenException,
      );
      expect(mockService.deleteMyOrg).not.toHaveBeenCalled();
    });

    it("Case 4: simulates ownership transfer lifecycle (Transfer -> Old Owner Blocked -> New Owner Succeeds)", async () => {
      // 1. Initial State: Transfer ownership to nonOwnerAdmin
      mockService.transferOwnership.mockResolvedValueOnce({
        success: true,
        message: "Ownership transferred successfully",
      });
      const transferContext = createMockContext(ownerReq);
      expect(rolesGuard.canActivate(transferContext)).toBe(true);

      const transferResult = await controller.transferOwnership(ownerReq, {
        newOwnerUserId: "user-admin-other",
      });
      expect(transferResult).toEqual({
        success: true,
        message: "Ownership transferred successfully",
      });

      // 2. Old owner calling deleteMyOrg -> service rejects with 403 ORG_FORBIDDEN_ACTION
      mockService.deleteMyOrg.mockRejectedValueOnce(
        new AppForbiddenException(
          APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
          "Only the organization owner can delete this organization.",
        ),
      );
      const oldOwnerDeleteContext = createMockContext(ownerReq);
      expect(rolesGuard.canActivate(oldOwnerDeleteContext)).toBe(true);
      await expect(controller.deleteMyOrg(ownerReq)).rejects.toThrow(
        AppForbiddenException,
      );

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

  describe("PATCH /organizations/my/members/:memberId/role", () => {
    it("delegates to organizationsService.updateMemberRole with caller ID, target member ID, and role", async () => {
      mockService.updateMemberRole.mockResolvedValueOnce({
        success: true,
        role: Role.RECRUITER,
      });

      const result = await controller.updateMemberRole(ownerReq, "member-1", {
        role: Role.RECRUITER,
      });

      expect(mockService.updateMemberRole).toHaveBeenCalledWith(
        "user-owner",
        "member-1",
        Role.RECRUITER,
      );
      expect(result).toEqual({ success: true, role: Role.RECRUITER });
    });
  });

  describe("Roles & Permissions Matrix Endpoints", () => {
    describe("GET /organizations/my/roles/permissions", () => {
      it("allows ADMIN to access and delegates to getRolePermissionsMatrix", async () => {
        const context = createMockContext(
          nonOwnerAdminReq,
          controller.getRolePermissionsMatrix,
        );
        expect(rolesGuard.canActivate(context)).toBe(true);

        const mockMatrix = {
          [Role.ADMIN]: { "org:manage_roles": true },
        };
        mockService.getRolePermissionsMatrix.mockResolvedValueOnce(mockMatrix);

        const result =
          await controller.getRolePermissionsMatrix(nonOwnerAdminReq);
        expect(mockService.getRolePermissionsMatrix).toHaveBeenCalledWith(
          "user-admin-other",
        );
        expect(result).toEqual(mockMatrix);
      });

      it("rejects non-admin MEMBER without org:manage_roles permission -> 403 Forbidden", () => {
        const context = createMockContext(
          memberReq,
          controller.getRolePermissionsMatrix,
        );
        expect(() => rolesGuard.canActivate(context)).toThrow(
          AppForbiddenException,
        );
        expect(mockService.getRolePermissionsMatrix).not.toHaveBeenCalled();
      });
    });

    describe("PATCH /organizations/my/roles/:role/permissions", () => {
      it("allows ADMIN to update role permissions and delegates to service", async () => {
        const context = createMockContext(
          nonOwnerAdminReq,
          controller.updateRolePermissions,
        );
        expect(rolesGuard.canActivate(context)).toBe(true);

        mockService.updateRolePermissions.mockResolvedValueOnce({
          role: Role.RECRUITER,
          permissions: { "org:delete": true },
        });

        const result = await controller.updateRolePermissions(
          nonOwnerAdminReq,
          Role.RECRUITER,
          {
            permissions: [{ permission: "org:delete", granted: true }],
          },
        );

        expect(mockService.updateRolePermissions).toHaveBeenCalledWith(
          "user-admin-other",
          Role.RECRUITER,
          [{ permission: "org:delete", granted: true }],
        );
        expect(result).toEqual({
          role: Role.RECRUITER,
          permissions: { "org:delete": true },
        });
      });

      it("rejects non-admin MEMBER from calling PATCH role permissions -> 403 Forbidden", () => {
        const context = createMockContext(
          memberReq,
          controller.updateRolePermissions,
        );
        expect(() => rolesGuard.canActivate(context)).toThrow(
          AppForbiddenException,
        );
        expect(mockService.updateRolePermissions).not.toHaveBeenCalled();
      });
    });

    describe("Dynamic DB override integration with RolesGuard", () => {
      it("grants access to RECRUITER when org:manage_roles is overridden to true in DB", async () => {
        const mockResolver = {
          resolvePermission: vi
            .fn()
            .mockImplementation(
              async (
                _orgId: string,
                role: Role,
                perm: Permission,
              ): Promise<boolean> => {
                if (role === Role.RECRUITER && perm === "org:manage_roles") {
                  return true;
                }
                return false;
              },
            ),
        } as unknown as PermissionResolverService;

        const asyncGuard = new RolesGuard(reflector, mockResolver);
        const recruiterReq = {
          user: {
            id: "user-recruiter",
            email: "recruiter@haihire.local",
            role: Role.RECRUITER,
            organizationId: "org-1",
          },
        };

        const context = createMockContext(
          recruiterReq,
          controller.getRolePermissionsMatrix,
        );
        const canActivatePromise = asyncGuard.canActivate(context);
        const allowed = await canActivatePromise;

        expect(allowed).toBe(true);
      });
    });
  });
});
