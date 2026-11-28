import { describe, it, expect, vi, beforeEach } from "vitest";
import { Role } from "@haihire/shared";

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("./client", () => ({
  api: mockApi,
  getApiBaseUrl: vi.fn(() => "/api"),
}));

import { authApi } from "./auth";
import { organizationsApi } from "./organizations";
import { activitiesApi } from "./activities";
import { notificationsApi } from "./notifications";

describe("Core Web API Clients (auth, organizations, activities, notifications)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.get.mockResolvedValue({ data: { ok: true } });
    mockApi.post.mockResolvedValue({ data: { ok: true } });
    mockApi.patch.mockResolvedValue({ data: { ok: true } });
    mockApi.put.mockResolvedValue({ data: { ok: true } });
    mockApi.delete.mockResolvedValue({ data: { ok: true } });
  });

  describe("authApi", () => {
    it("covers session, profile, password, preferences, and security log endpoints", async () => {
      await expect(authApi.getMe()).resolves.toEqual({ ok: true });
      expect(mockApi.get).toHaveBeenCalledWith("/auth/me");

      await authApi.logout();
      expect(mockApi.post).toHaveBeenCalledWith("/auth/logout");

      await authApi.changePassword({
        currentPassword: "old",
        newPassword: "new",
      });
      expect(mockApi.post).toHaveBeenCalledWith("/auth/change-password", {
        currentPassword: "old",
        newPassword: "new",
      });

      await authApi.refreshToken("rt-123");
      expect(mockApi.post).toHaveBeenCalledWith("/auth/refresh", {
        refreshToken: "rt-123",
      });

      await authApi.getMyPermissions();
      expect(mockApi.get).toHaveBeenCalledWith("/auth/me/permissions");

      await authApi.updatePreferences({ preferredLanguage: "vi" });
      expect(mockApi.patch).toHaveBeenCalledWith("/auth/me/preferences", {
        preferredLanguage: "vi",
      });

      await authApi.updateProfile({ name: "Alice" });
      expect(mockApi.patch).toHaveBeenCalledWith("/auth/me/profile", {
        name: "Alice",
      });

      const avatarFile = new File(["img"], "avatar.png", { type: "image/png" });
      await authApi.uploadAvatar(avatarFile);
      const [avatarUrl, avatarBody, avatarCfg] =
        mockApi.post.mock.calls.at(-1)!;
      expect(avatarUrl).toBe("/auth/me/avatar");
      expect(avatarBody).toBeInstanceOf(FormData);
      expect((avatarBody as FormData).get("file")).toBe(avatarFile);
      expect(avatarCfg).toEqual({
        headers: { "Content-Type": "multipart/form-data" },
      });

      await authApi.updateAvatarSource("GRAVATAR");
      expect(mockApi.patch).toHaveBeenCalledWith("/auth/me/avatar", {
        source: "GRAVATAR",
      });

      await authApi.getSessions();
      expect(mockApi.get).toHaveBeenCalledWith("/auth/sessions");

      await authApi.revokeSession("sess/1");
      expect(mockApi.delete).toHaveBeenCalledWith("/auth/sessions/sess%2F1");

      await authApi.revokeOtherSessions();
      expect(mockApi.post).toHaveBeenCalledWith("/auth/sessions/revoke-others");

      await authApi.getSecurityLogs({ category: "all" });
      expect(mockApi.get).toHaveBeenLastCalledWith("/auth/security-logs");

      await authApi.getSecurityLogs({
        category: "security",
        limit: 20,
        offset: 40,
      });
      expect(mockApi.get).toHaveBeenLastCalledWith(
        "/auth/security-logs?category=security&limit=20&offset=40",
      );
    });
  });

  describe("organizationsApi", () => {
    it("covers org lifecycle, members, invites, RBAC permissions, and audit log endpoints", async () => {
      await organizationsApi.getPublicOrg("acme");
      expect(mockApi.get).toHaveBeenCalledWith("/organizations/public/acme");

      await organizationsApi.getMyOrg();
      expect(mockApi.get).toHaveBeenCalledWith("/organizations/my");

      await organizationsApi.getMyOrgs();
      expect(mockApi.get).toHaveBeenCalledWith("/organizations/my/all");

      await organizationsApi.switchOrg("org-2");
      expect(mockApi.post).toHaveBeenCalledWith("/organizations/switch", {
        organizationId: "org-2",
      });

      await organizationsApi.getMembers();
      expect(mockApi.get).toHaveBeenCalledWith("/organizations/my/members");

      await organizationsApi.getInterviewers();
      expect(mockApi.get).toHaveBeenCalledWith(
        "/organizations/my/interviewers",
      );

      await organizationsApi.updateMyOrg({ name: "Acme Corp" });
      expect(mockApi.patch).toHaveBeenCalledWith("/organizations/my", {
        name: "Acme Corp",
      });

      const logoFile = new File(["logo"], "logo.png", { type: "image/png" });
      await organizationsApi.uploadMyOrgLogo(logoFile);
      const [logoUrl, logoBody, logoCfg] = mockApi.post.mock.calls.at(-1)!;
      expect(logoUrl).toBe("/organizations/my/logo");
      expect(logoBody).toBeInstanceOf(FormData);
      expect(logoCfg).toEqual({
        headers: { "Content-Type": "multipart/form-data" },
      });

      await organizationsApi.deleteMyOrgLogo();
      expect(mockApi.delete).toHaveBeenCalledWith("/organizations/my/logo");

      await organizationsApi.deleteMyOrg();
      expect(mockApi.delete).toHaveBeenCalledWith("/organizations/my");

      await organizationsApi.leaveMyOrg();
      expect(mockApi.post).toHaveBeenCalledWith("/organizations/my/leave");

      await organizationsApi.transferOwnership("usr-9");
      expect(mockApi.post).toHaveBeenCalledWith(
        "/organizations/my/transfer-ownership",
        { newOwnerUserId: "usr-9" },
      );

      await organizationsApi.createInviteLink({
        email: "new@example.com",
        role: Role.RECRUITER,
      });
      expect(mockApi.post).toHaveBeenCalledWith(
        "/organizations/my/invite-links",
        { email: "new@example.com", role: Role.RECRUITER },
      );

      await organizationsApi.getInviteLinks();
      expect(mockApi.get).toHaveBeenLastCalledWith(
        "/organizations/my/invite-links",
        { params: undefined },
      );

      await organizationsApi.getInviteLinks({ includeRevoked: true });
      expect(mockApi.get).toHaveBeenLastCalledWith(
        "/organizations/my/invite-links",
        { params: { includeRevoked: "true" } },
      );

      await organizationsApi.resendInviteLink("inv-1");
      expect(mockApi.post).toHaveBeenCalledWith(
        "/organizations/my/invite-links/inv-1/resend",
      );

      await organizationsApi.getInviteLinkUsages("inv-1");
      expect(mockApi.get).toHaveBeenCalledWith(
        "/organizations/my/invite-links/inv-1/usages",
      );

      await organizationsApi.revokeInviteLink("inv-1");
      expect(mockApi.delete).toHaveBeenCalledWith(
        "/organizations/my/invite-links/inv-1",
      );

      await organizationsApi.getPublicInvite("tok-1");
      expect(mockApi.get).toHaveBeenCalledWith(
        "/organizations/invite-links/public/tok-1",
      );

      await organizationsApi.joinByToken("tok-1");
      expect(mockApi.post).toHaveBeenCalledWith(
        "/organizations/invite-links/join/tok-1",
      );

      await organizationsApi.updateMemberRole("mem-1", Role.HIRING_MANAGER);
      expect(mockApi.patch).toHaveBeenCalledWith(
        "/organizations/my/members/mem-1/role",
        { role: Role.HIRING_MANAGER },
      );

      await organizationsApi.removeMember("mem-1");
      expect(mockApi.delete).toHaveBeenCalledWith(
        "/organizations/my/members/mem-1",
      );

      await organizationsApi.getRolePermissionsMatrix();
      expect(mockApi.get).toHaveBeenCalledWith(
        "/organizations/my/roles/permissions",
      );

      await organizationsApi.updateRolePermissions(Role.RECRUITER, [
        { permission: "job:create", granted: true },
      ]);
      expect(mockApi.patch).toHaveBeenCalledWith(
        `/organizations/my/roles/${Role.RECRUITER}/permissions`,
        { permissions: [{ permission: "job:create", granted: true }] },
      );

      await organizationsApi.resetRolePermissions();
      expect(mockApi.post).toHaveBeenLastCalledWith(
        "/organizations/my/roles/reset",
      );

      await organizationsApi.resetRolePermissions(Role.RECRUITER);
      expect(mockApi.post).toHaveBeenLastCalledWith(
        `/organizations/my/roles/${Role.RECRUITER}/reset`,
      );

      await organizationsApi.getAuditLogs();
      expect(mockApi.get).toHaveBeenLastCalledWith(
        "/organizations/my/audit-log",
      );

      await organizationsApi.getAuditLogs({
        action: "JOB_CREATED",
        resource: "JOB",
        actorId: "u-1",
        targetId: "j-1",
        search: "backend",
        from: "2026-01-01",
        to: "2026-01-31",
        limit: 25,
        offset: 0,
      });
      expect(mockApi.get).toHaveBeenLastCalledWith(
        "/organizations/my/audit-log?action=JOB_CREATED&resource=JOB&actorId=u-1&targetId=j-1&search=backend&from=2026-01-01&to=2026-01-31&limit=25&offset=0",
      );

      await organizationsApi.exportAuditLogs(
        { action: "JOB_CREATED", search: "q" },
        "csv",
      );
      expect(mockApi.get).toHaveBeenLastCalledWith(
        "/organizations/my/audit-log/export?action=JOB_CREATED&search=q&format=csv",
        { responseType: "blob" },
      );

      await organizationsApi.getAuditLogStats();
      expect(mockApi.get).toHaveBeenCalledWith(
        "/organizations/my/audit-log/stats",
      );

      await organizationsApi.updateAuditLogRetention(90);
      expect(mockApi.patch).toHaveBeenCalledWith(
        "/organizations/my/audit-log/retention",
        { retentionDays: 90 },
      );
    });
  });

  describe("activitiesApi & notificationsApi", () => {
    it("covers activity queries/creation and notification read toggles", async () => {
      await activitiesApi.getByCandidate("cand-1", {
        organizationId: null,
        page: 1,
        limit: 10,
      });
      expect(mockApi.get).toHaveBeenCalledWith("/activities/candidate/cand-1", {
        params: { organizationId: undefined, page: 1, limit: 10 },
      });

      await activitiesApi.getByApplication("app-1", {
        organizationId: "org-1",
        page: 2,
      });
      expect(mockApi.get).toHaveBeenCalledWith(
        "/activities/application/app-1",
        {
          params: { organizationId: "org-1", page: 2, limit: undefined },
        },
      );

      await activitiesApi.create({ type: "NOTE", targetId: "app-1" });
      expect(mockApi.post).toHaveBeenCalledWith("/activities", {
        type: "NOTE",
        targetId: "app-1",
      });

      await notificationsApi.list({ unreadOnly: true, limit: undefined });
      expect(mockApi.get).toHaveBeenLastCalledWith("/notifications", {
        params: { unreadOnly: true },
      });

      await notificationsApi.list();
      expect(mockApi.get).toHaveBeenLastCalledWith("/notifications", undefined);

      await notificationsApi.markRead();
      expect(mockApi.patch).toHaveBeenCalledWith("/notifications/read");

      await notificationsApi.markRead("notif-1");
      expect(mockApi.patch).toHaveBeenCalledWith("/notifications/notif-1/read");

      await notificationsApi.markUnread("notif-1");
      expect(mockApi.patch).toHaveBeenCalledWith(
        "/notifications/notif-1/unread",
      );
    });
  });
});
