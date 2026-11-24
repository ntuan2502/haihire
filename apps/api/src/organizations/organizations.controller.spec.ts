import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";
import { RolesGuard } from "../auth/roles.guard";
import { Reflector } from "@nestjs/core";
import {
  AppForbiddenException,
  AppBadRequestException,
} from "../common/app-exception";
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
    switchOrg: vi.fn(),
    joinByToken: vi.fn(),
    getMyOrg: vi.fn(),
    updateMyOrg: vi.fn(),
    deleteMyOrg: vi.fn(),
    transferOwnership: vi.fn(),
    getMembers: vi.fn(),
    getInterviewers: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
    leaveOrganization: vi.fn(),
    getRolePermissionsMatrix: vi.fn(),
    updateRolePermissions: vi.fn(),
    resetRolePermissions: vi.fn(),
    getAuditLogs: vi.fn(),
    exportAuditLogs: vi.fn(),
    uploadMyOrgLogo: vi.fn(),
    deleteMyOrgLogo: vi.fn(),
    preparePublicOrgLogo: vi.fn(),
    getInviteLinks: vi.fn(),
    resendInviteLink: vi.fn(),
    getInviteLinkUsages: vi.fn(),
    getPublicInvite: vi.fn(),
  };

  const mockAuthService = {
    issueOrgSessionTokens: vi.fn().mockResolvedValue({
      accessToken: "switched-access",
      refreshToken: "switched-refresh",
      hasOrg: true,
      role: Role.ADMIN,
    }),
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
    controller = new OrganizationsController(
      service,
      mockAuthService as unknown as never,
    );
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
      mockService.getMyOrg.mockResolvedValue(null);

      // Act
      const canActivate = rolesGuard.canActivate(context);
      expect(canActivate).toBe(true);

      const result = await controller.deleteMyOrg(ownerReq);

      // Assert
      expect(mockService.deleteMyOrg).toHaveBeenCalledWith(
        "user-owner",
        "org-1",
      );
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
      expect(mockService.deleteMyOrg).toHaveBeenCalledWith(
        "user-admin-other",
        "org-1",
      );
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
      mockService.getMyOrg.mockResolvedValueOnce(null);
      expect(rolesGuard.canActivate(newOwnerDeleteContext)).toBe(true);
      const deleteResult = await controller.deleteMyOrg(newOwnerReq);
      expect(deleteResult).toEqual({
        success: true,
        message: "Organization deleted successfully",
      });
      expect(mockService.deleteMyOrg).toHaveBeenCalledWith(
        "user-admin-other",
        "org-1",
      );
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
        "org-1",
      );
      expect(result).toEqual({ success: true, role: Role.RECRUITER });
    });
  });

  describe("Members & Interviewers RBAC Endpoints", () => {
    describe("GET /organizations/my/members", () => {
      it("allows ADMIN with org:manage_members and delegates to getMembers", async () => {
        const context = createMockContext(
          nonOwnerAdminReq,
          controller.getMembers,
        );
        expect(rolesGuard.canActivate(context)).toBe(true);

        const members = [
          {
            id: "u-1",
            name: "Admin",
            email: "admin@haihire.local",
            role: Role.ADMIN,
          },
        ];
        mockService.getMembers.mockResolvedValueOnce(members);

        const result = await controller.getMembers(nonOwnerAdminReq);
        expect(mockService.getMembers).toHaveBeenCalledWith(
          "user-admin-other",
          "org-1",
        );
        expect(result).toEqual(members);
      });

      it("rejects MEMBER without org:manage_members -> 403 Forbidden", () => {
        const context = createMockContext(memberReq, controller.getMembers);
        expect(() => rolesGuard.canActivate(context)).toThrow(
          AppForbiddenException,
        );
        expect(mockService.getMembers).not.toHaveBeenCalled();
      });
    });

    describe("GET /organizations/my/interviewers", () => {
      it("allows ADMIN and RECRUITER with interview:create and delegates to getInterviewers", async () => {
        const adminContext = createMockContext(
          nonOwnerAdminReq,
          controller.getInterviewers,
        );
        expect(rolesGuard.canActivate(adminContext)).toBe(true);

        const recruiterReq = {
          user: {
            id: "user-recruiter",
            email: "recruiter@haihire.local",
            role: Role.RECRUITER,
            organizationId: "org-1",
          },
        };
        const recruiterContext = createMockContext(
          recruiterReq,
          controller.getInterviewers,
        );
        expect(rolesGuard.canActivate(recruiterContext)).toBe(true);

        const interviewers = [
          {
            id: "user-recruiter",
            name: "Recruiter",
            email: "recruiter@haihire.local",
            role: Role.RECRUITER,
          },
        ];
        mockService.getInterviewers.mockResolvedValueOnce(interviewers);

        const result = await controller.getInterviewers(recruiterReq);
        expect(mockService.getInterviewers).toHaveBeenCalledWith(
          "user-recruiter",
          "org-1",
        );
        expect(result).toEqual(interviewers);
      });

      it("rejects MEMBER without interview:create -> 403 Forbidden", () => {
        const context = createMockContext(
          memberReq,
          controller.getInterviewers,
        );
        expect(() => rolesGuard.canActivate(context)).toThrow(
          AppForbiddenException,
        );
        expect(mockService.getInterviewers).not.toHaveBeenCalled();
      });
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
          "org-1",
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
          "org-1",
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

      it("rejects updating ADMIN role permissions with 400 ORG_ADMIN_PERMISSIONS_IMMUTABLE", async () => {
        const context = createMockContext(
          nonOwnerAdminReq,
          controller.updateRolePermissions,
        );
        expect(rolesGuard.canActivate(context)).toBe(true);

        mockService.updateRolePermissions.mockRejectedValueOnce(
          new AppBadRequestException(
            APP_ERROR_CODES.ORG_ADMIN_PERMISSIONS_IMMUTABLE,
            "ADMIN role permissions are immutable and cannot be modified",
          ),
        );

        await expect(
          controller.updateRolePermissions(nonOwnerAdminReq, Role.ADMIN, {
            permissions: [{ permission: "job:create", granted: false }],
          }),
        ).rejects.toMatchObject({
          code: APP_ERROR_CODES.ORG_ADMIN_PERMISSIONS_IMMUTABLE,
        });
      });

      it("calls resetAllRolePermissions when admin requests reset of all roles", async () => {
        const context = createMockContext(
          ownerReq,
          controller.resetAllRolePermissions,
        );
        expect(rolesGuard.canActivate(context)).toBe(true);

        mockService.resetRolePermissions.mockResolvedValueOnce({ deleted: 4 });

        const result = await controller.resetAllRolePermissions(ownerReq);
        expect(result).toEqual({ deleted: 4 });
        expect(mockService.resetRolePermissions).toHaveBeenCalledWith(
          ownerReq.user.id,
          undefined,
          "org-1",
        );
      });

      it("calls resetSingleRolePermissions when admin requests reset of specific role", async () => {
        const context = createMockContext(
          nonOwnerAdminReq,
          controller.resetSingleRolePermissions,
        );
        expect(rolesGuard.canActivate(context)).toBe(true);

        mockService.resetRolePermissions.mockResolvedValueOnce({ deleted: 1 });

        const result = await controller.resetSingleRolePermissions(
          nonOwnerAdminReq,
          Role.RECRUITER,
        );
        expect(result).toEqual({ deleted: 1 });
        expect(mockService.resetRolePermissions).toHaveBeenCalledWith(
          nonOwnerAdminReq.user.id,
          Role.RECRUITER,
          "org-1",
        );
      });

      it("rejects non-admin MEMBER from calling reset endpoints -> 403 Forbidden", () => {
        const contextAll = createMockContext(
          memberReq,
          controller.resetAllRolePermissions,
        );
        expect(() => rolesGuard.canActivate(contextAll)).toThrow(
          AppForbiddenException,
        );

        const contextSingle = createMockContext(
          memberReq,
          controller.resetSingleRolePermissions,
        );
        expect(() => rolesGuard.canActivate(contextSingle)).toThrow(
          AppForbiddenException,
        );
      });

      it("rejects resetting ADMIN role with 400 ORG_ADMIN_PERMISSIONS_IMMUTABLE", async () => {
        const context = createMockContext(
          nonOwnerAdminReq,
          controller.resetSingleRolePermissions,
        );
        expect(rolesGuard.canActivate(context)).toBe(true);

        mockService.resetRolePermissions.mockRejectedValueOnce(
          new AppBadRequestException(
            APP_ERROR_CODES.ORG_ADMIN_PERMISSIONS_IMMUTABLE,
            "ADMIN role permissions are immutable and cannot be reset",
          ),
        );

        await expect(
          controller.resetSingleRolePermissions(nonOwnerAdminReq, Role.ADMIN),
        ).rejects.toMatchObject({
          code: APP_ERROR_CODES.ORG_ADMIN_PERMISSIONS_IMMUTABLE,
        });
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

  describe("GET /organizations/my/audit-log", () => {
    it("delegates to service.getAuditLogs with query parameters and user id", async () => {
      const mockResult = {
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
      };
      mockService.getAuditLogs.mockResolvedValue(mockResult);

      const result = await controller.getAuditLogs(ownerReq, {
        action: "ROLE_PERMISSIONS_UPDATED",
        resource: "ROLE_PERMISSIONS",
        limit: 20,
        offset: 0,
      });

      expect(service.getAuditLogs).toHaveBeenCalledWith(
        "user-owner",
        {
          action: "ROLE_PERMISSIONS_UPDATED",
          resource: "ROLE_PERMISSIONS",
          limit: 20,
          offset: 0,
        },
        "org-1",
      );
      expect(result).toBe(mockResult);
    });

    it("allows ADMIN access to audit log endpoint via RolesGuard", async () => {
      const context = createMockContext(ownerReq, controller.getAuditLogs);
      const allowed = await rolesGuard.canActivate(context);
      expect(allowed).toBe(true);
    });

    it("rejects regular MEMBER without org:view_audit_log -> 403 Forbidden", () => {
      const context = createMockContext(memberReq, controller.getAuditLogs);
      expect(() => rolesGuard.canActivate(context)).toThrow(
        AppForbiddenException,
      );
    });
  });

  describe("GET /organizations/my/audit-log/export", () => {
    it("streams CSV/JSON export headers and delegates filtered export to service", async () => {
      mockService.exportAuditLogs.mockResolvedValue({
        filename: "audit-log-2026-11-25.csv",
        mimeType: "text/csv; charset=utf-8",
        content: "id,action\nlog-1,ORG_UPDATED",
      });

      const mockRes = {
        setHeader: vi.fn(),
        send: vi.fn(),
      };

      await controller.exportAuditLogs(
        ownerReq,
        { action: "ORG_UPDATED", format: "csv" },
        mockRes as never,
      );

      expect(service.exportAuditLogs).toHaveBeenCalledWith(
        "user-owner",
        expect.objectContaining({ action: "ORG_UPDATED" }),
        "csv",
        "org-1",
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "text/csv; charset=utf-8",
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        'attachment; filename="audit-log-2026-11-25.csv"',
      );
      expect(mockRes.send).toHaveBeenCalledWith("id,action\nlog-1,ORG_UPDATED");
    });

    it("rejects regular MEMBER without org:view_audit_log -> 403 Forbidden", () => {
      const context = createMockContext(memberReq, controller.exportAuditLogs);
      expect(() => rolesGuard.canActivate(context)).toThrow(
        AppForbiddenException,
      );
    });
  });

  describe("GET /organizations/my/invite-links", () => {
    it("allows ADMIN access to invite links via RolesGuard", async () => {
      const context = createMockContext(ownerReq, controller.getInviteLinks);
      const allowed = await rolesGuard.canActivate(context);
      expect(allowed).toBe(true);
    });

    it("rejects regular MEMBER without org:manage_members -> 403 Forbidden", () => {
      const context = createMockContext(memberReq, controller.getInviteLinks);
      expect(() => rolesGuard.canActivate(context)).toThrow(
        AppForbiddenException,
      );
    });
  });

  describe("PATCH /organizations/my", () => {
    it("allows ADMIN with org:update to update localization fields", async () => {
      const context = createMockContext(ownerReq, controller.updateMyOrg);
      expect(rolesGuard.canActivate(context)).toBe(true);

      const dto = {
        defaultLanguage: "vi" as const,
        timezone: "Asia/Ho_Chi_Minh",
        dateFormat: "DD/MM/YYYY" as const,
        timeFormat: "24H" as const,
        nameDisplayOrder: "LAST_FIRST" as const,
        defaultCurrency: "VND" as const,
      };
      const expected = { id: "org-1", name: "Acme", slug: "acme", ...dto };
      mockService.updateMyOrg.mockResolvedValueOnce(expected);

      const result = await controller.updateMyOrg(ownerReq, dto);
      expect(mockService.updateMyOrg).toHaveBeenCalledWith(
        "user-owner",
        dto,
        "org-1",
      );
      expect(result).toEqual(expected);
    });

    it("rejects non-admin MEMBER without org:update -> 403 Forbidden", () => {
      const context = createMockContext(memberReq, controller.updateMyOrg);
      expect(() => rolesGuard.canActivate(context)).toThrow(
        AppForbiddenException,
      );
    });
  });

  describe("POST /organizations/switch & invite-links/join/:token session cookies (BUG-03)", () => {
    it("re-issues HttpOnly access & refresh cookies scoped to the switched/joined organization", async () => {
      const mockRes = { cookie: vi.fn() };
      mockService.switchOrg.mockResolvedValueOnce({
        success: true,
        organization: { id: "org-2", name: "Org Two" },
      });

      await controller.switchOrg(
        ownerReq,
        { organizationId: "org-2" },
        mockRes as never,
      );

      expect(mockAuthService.issueOrgSessionTokens).toHaveBeenCalledWith(
        "user-owner",
        "org-2",
      );
      expect(mockRes.cookie).toHaveBeenCalledWith(
        "haihire_token",
        "switched-access",
        expect.objectContaining({ httpOnly: true }),
      );
      expect(mockRes.cookie).toHaveBeenCalledWith(
        "haihire_refresh_token",
        "switched-refresh",
        expect.objectContaining({ httpOnly: true }),
      );

      mockRes.cookie.mockClear();
      mockService.joinByToken.mockResolvedValueOnce({
        success: true,
        organization: { id: "org-3", name: "Org Three" },
        role: Role.RECRUITER,
      });
      await controller.joinByToken(ownerReq, "tok-123", mockRes as never);
      expect(mockAuthService.issueOrgSessionTokens).toHaveBeenCalledWith(
        "user-owner",
        "org-3",
      );
    });
  });

  describe("Organization Logo Endpoints (POST/DELETE my/logo & GET public/:id/logo)", () => {
    it("enforces org:update permission on uploadMyOrgLogo and deleteMyOrgLogo", async () => {
      const allowedCtx = createMockContext(
        ownerReq,
        controller.uploadMyOrgLogo,
      );
      expect(rolesGuard.canActivate(allowedCtx)).toBe(true);

      const deniedUploadCtx = createMockContext(
        memberReq,
        controller.uploadMyOrgLogo,
      );
      expect(() => rolesGuard.canActivate(deniedUploadCtx)).toThrow(
        AppForbiddenException,
      );

      const deniedDeleteCtx = createMockContext(
        memberReq,
        controller.deleteMyOrgLogo,
      );
      expect(() => rolesGuard.canActivate(deniedDeleteCtx)).toThrow(
        AppForbiddenException,
      );

      const file = {
        originalname: "logo.png",
        mimetype: "image/png",
        size: 16,
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      } as Express.Multer.File;
      mockService.uploadMyOrgLogo.mockResolvedValueOnce({
        id: "org-1",
        logoUrl: "/organizations/public/org-1/logo?v=123",
      });

      const uploaded = await controller.uploadMyOrgLogo(ownerReq, file);
      expect(mockService.uploadMyOrgLogo).toHaveBeenCalledWith(
        "user-owner",
        file,
        "org-1",
      );
      expect(uploaded.logoUrl).toBe("/organizations/public/org-1/logo?v=123");

      mockService.deleteMyOrgLogo.mockResolvedValueOnce({
        id: "org-1",
        logoUrl: null,
      });
      const removed = await controller.deleteMyOrgLogo(ownerReq);
      expect(mockService.deleteMyOrgLogo).toHaveBeenCalledWith(
        "user-owner",
        "org-1",
      );
      expect(removed.logoUrl).toBeNull();
    });

    it("streams public org logo with nosniff and immutable cache headers when version query is present", async () => {
      const mockStream = {
        on: vi.fn().mockReturnThis(),
        pipe: vi.fn(),
      };
      mockService.preparePublicOrgLogo.mockResolvedValueOnce({
        stream: mockStream,
        mimeType: "image/webp",
      });
      const mockRes = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        end: vi.fn(),
        headersSent: false,
      };

      await controller.getPublicOrgLogo(
        "00000000-0000-4000-8000-000000000001",
        mockRes as never,
        "1700000000",
      );

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "image/webp",
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "X-Content-Type-Options",
        "nosniff",
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Cache-Control",
        "public, max-age=31536000, immutable",
      );
      expect(mockStream.pipe).toHaveBeenCalledWith(mockRes);
    });

    it("applies generous 600 req/min rate limit override on public org logo endpoint without skipping throttle completely", () => {
      expect(
        Reflect.getMetadata(
          "THROTTLER:LIMITdefault",
          OrganizationsController.prototype.getPublicOrgLogo,
        ),
      ).toBe(600);
      expect(
        Reflect.getMetadata(
          "THROTTLER:TTLdefault",
          OrganizationsController.prototype.getPublicOrgLogo,
        ),
      ).toBe(60000);
      expect(
        Reflect.getMetadata(
          "THROTTLER:SKIPdefault",
          OrganizationsController.prototype.getPublicOrgLogo,
        ),
      ).toBeUndefined();
    });
  });

  describe("Invite Tracking & Resend Endpoints", () => {
    it("passes includeRevoked query flag, forwards callerId on public preview, and delegates resend/usages", async () => {
      mockService.getInviteLinks.mockResolvedValueOnce([]);
      await controller.getInviteLinks(ownerReq, { includeRevoked: true });
      expect(mockService.getInviteLinks).toHaveBeenCalledWith(
        "user-owner",
        "org-1",
        true,
      );

      mockService.resendInviteLink.mockResolvedValueOnce({ id: "link-new" });
      await controller.resendInviteLink(
        ownerReq,
        "00000000-0000-4000-8000-000000000010",
      );
      expect(mockService.resendInviteLink).toHaveBeenCalledWith(
        "user-owner",
        "00000000-0000-4000-8000-000000000010",
        "org-1",
      );

      mockService.getInviteLinkUsages.mockResolvedValueOnce([]);
      await controller.getInviteLinkUsages(
        ownerReq,
        "00000000-0000-4000-8000-000000000010",
      );
      expect(mockService.getInviteLinkUsages).toHaveBeenCalledWith(
        "user-owner",
        "00000000-0000-4000-8000-000000000010",
        "org-1",
      );

      mockService.getPublicInvite.mockResolvedValueOnce({ valid: true });
      await controller.getPublicInvite("tok-123", ownerReq);
      expect(mockService.getPublicInvite).toHaveBeenCalledWith(
        "tok-123",
        "user-owner",
      );

      mockService.getPublicInvite.mockResolvedValueOnce({ valid: true });
      await controller.getPublicInvite("tok-123", undefined);
      expect(mockService.getPublicInvite).toHaveBeenCalledWith("tok-123", null);
    });
  });

  describe("POST /organizations/my/leave", () => {
    it("leaves active org and syncs session cookies to next remaining organization when user belongs to another org", async () => {
      const nextOrg = { id: "org-2", name: "Beta Inc", slug: "beta-inc" };
      mockService.leaveOrganization.mockResolvedValueOnce({
        success: true,
        organizationId: "org-1",
        organizationName: "Acme Corp",
        message: "Successfully left the organization",
      });
      mockService.getMyOrg.mockResolvedValueOnce(nextOrg);

      const res = await controller.leaveMyOrg(nonOwnerAdminReq);

      expect(mockService.leaveOrganization).toHaveBeenCalledWith(
        "user-admin-other",
        "org-1",
      );
      expect(mockService.getMyOrg).toHaveBeenCalledWith("user-admin-other");
      expect(mockAuthService.issueOrgSessionTokens).toHaveBeenCalledWith(
        "user-admin-other",
        "org-2",
      );
      expect(res.nextOrganization).toEqual(nextOrg);
    });

    it("syncs session cookies to null when caller has no remaining organizations", async () => {
      mockService.leaveOrganization.mockResolvedValueOnce({
        success: true,
        organizationId: "org-1",
        organizationName: "Acme Corp",
        message: "Successfully left the organization",
      });
      mockService.getMyOrg.mockResolvedValueOnce(null);

      const res = await controller.leaveMyOrg(memberReq);

      expect(mockAuthService.issueOrgSessionTokens).toHaveBeenCalledWith(
        "user-member",
        null,
      );
      expect(res.nextOrganization).toBeNull();
    });
  });
});
