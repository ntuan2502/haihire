import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import type { Response } from "express";

describe("AuthController", () => {
  let controller: AuthController;
  let mockAuthService: {
    login: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
    refreshToken: ReturnType<typeof vi.fn>;
    changePassword: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    logoutWithRefreshToken: ReturnType<typeof vi.fn>;
    getProfile: ReturnType<typeof vi.fn>;
    updatePreferences: ReturnType<typeof vi.fn>;
    uploadAvatar: ReturnType<typeof vi.fn>;
    updateAvatarSource: ReturnType<typeof vi.fn>;
    prepareUserAvatarStream: ReturnType<typeof vi.fn>;
    getMyPermissions: ReturnType<typeof vi.fn>;
  };

  let mockResponse: {
    cookie: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthService = {
      login: vi.fn(),
      register: vi.fn(),
      refreshToken: vi.fn(),
      changePassword: vi.fn(),
      logout: vi.fn(),
      logoutWithRefreshToken: vi.fn(),
      getProfile: vi.fn(),
      updatePreferences: vi.fn(),
      uploadAvatar: vi.fn(),
      updateAvatarSource: vi.fn(),
      prepareUserAvatarStream: vi.fn(),
      getMyPermissions: vi.fn(),
    };
    mockResponse = {
      cookie: vi.fn(),
    };
    controller = new AuthController(mockAuthService as unknown as AuthService);
  });

  describe("changePassword (F03 fix)", () => {
    it("updates password and sets haihire_token HttpOnly cookie with new accessToken", async () => {
      // Arrange
      const userId = "user-123";
      const newAccessToken = "new-jwt-access-token";
      const changePassResult = {
        success: true,
        accessToken: newAccessToken,
        refreshToken: "new-refresh-token",
        user: {
          id: userId,
          email: "user@haihire.local",
          name: "Test User",
          role: "ADMIN",
          avatarUrl: null,
          organizationId: "org-1",
          createdAt: new Date(),
        },
      };

      mockAuthService.changePassword.mockResolvedValue(changePassResult);

      const req = { user: { id: userId } };
      const dto = {
        currentPassword: "OldPassword123!",
        newPassword: "NewPassword123!",
      };

      // Act
      const result = await controller.changePassword(
        req,
        dto,
        mockResponse as unknown as Response,
      );

      // Assert
      expect(mockAuthService.changePassword).toHaveBeenCalledWith(
        userId,
        dto.currentPassword,
        dto.newPassword,
        undefined,
      );
      expect(result).toBe(changePassResult);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "haihire_token",
        newAccessToken,
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        }),
      );
    });
  });

  describe("login, register, and refresh cookie setting", () => {
    it("login sets haihire_token and haihire_refresh_token HttpOnly cookies", async () => {
      const loginResult = {
        accessToken: "access-token-login",
        refreshToken: "refresh-token-login",
        user: { id: "u-1" },
      };
      mockAuthService.login.mockResolvedValue(loginResult);

      const result = await controller.login(
        { email: "a@b.com", password: "pwd" },
        mockResponse as unknown as Response,
      );

      expect(result).toBe(loginResult);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "haihire_token",
        "access-token-login",
        expect.objectContaining({ httpOnly: true }),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "haihire_refresh_token",
        "refresh-token-login",
        expect.objectContaining({ httpOnly: true }),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "haihire_has_org",
        "false",
        expect.objectContaining({ httpOnly: false }),
      );
    });

    it("refresh extracts refresh token from cookie when body is empty and syncs haihire_has_org", async () => {
      const refreshResult = {
        accessToken: "new-access",
        refreshToken: "new-refresh",
        hasOrg: true,
      };
      mockAuthService.refreshToken.mockResolvedValue(refreshResult);

      const req = {
        cookies: {
          haihire_refresh_token: "cookie-refresh-token",
        },
      };

      const result = await controller.refresh(
        req,
        {},
        mockResponse as unknown as Response,
      );

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith({
        refreshToken: "cookie-refresh-token",
      });
      expect(result).toBe(refreshResult);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "haihire_token",
        "new-access",
        expect.objectContaining({ httpOnly: true }),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "haihire_refresh_token",
        "new-refresh",
        expect.objectContaining({ httpOnly: true }),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "haihire_has_org",
        "true",
        expect.objectContaining({ httpOnly: false }),
      );
    });

    it("refresh clears all auth cookies when refreshToken is missing or invalid", async () => {
      mockAuthService.refreshToken.mockRejectedValue(
        new Error("Token expired"),
      );

      await expect(
        controller.refresh(
          { cookies: {} },
          {},
          mockResponse as unknown as Response,
        ),
      ).rejects.toThrow();

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "haihire_token",
        "",
        expect.objectContaining({ maxAge: 0, httpOnly: true }),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "haihire_refresh_token",
        "",
        expect.objectContaining({ maxAge: 0, httpOnly: true }),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "haihire_has_org",
        "",
        expect.objectContaining({ maxAge: 0, httpOnly: false }),
      );

      vi.clearAllMocks();
      await expect(
        controller.refresh(
          { cookies: { haihire_refresh_token: "revoked" } },
          {},
          mockResponse as unknown as Response,
        ),
      ).rejects.toThrow("Token expired");

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "haihire_token",
        "",
        expect.objectContaining({ maxAge: 0, httpOnly: true }),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "haihire_has_org",
        "",
        expect.objectContaining({ maxAge: 0, httpOnly: false }),
      );
    });

    it("logout clears haihire_token, haihire_refresh_token, and haihire_has_org cookies with maxAge 0 and forwards active orgId", async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(
        { user: { id: "u-1", organizationId: "org-2" } },
        mockResponse as unknown as Response,
      );

      expect(result).toEqual({ success: true });
      expect(mockAuthService.logout).toHaveBeenCalledWith("u-1", "org-2");
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "haihire_token",
        "",
        expect.objectContaining({ maxAge: 0, httpOnly: true }),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "haihire_refresh_token",
        "",
        expect.objectContaining({ maxAge: 0, httpOnly: true }),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "haihire_has_org",
        "",
        expect.objectContaining({ maxAge: 0, httpOnly: false }),
      );
    });

    it("getMyPermissions delegates to authService.getMyPermissions", async () => {
      const user = {
        id: "u-1",
        role: "MEMBER" as const,
        organizationId: "org-1",
        isOwner: false,
      };
      const expectedPermissions = { permissions: ["candidate:view"] };
      mockAuthService.getMyPermissions.mockResolvedValue(expectedPermissions);

      const result = await controller.getMyPermissions({ user });

      expect(mockAuthService.getMyPermissions).toHaveBeenCalledWith(user);
      expect(result).toBe(expectedPermissions);
    });

    it("updatePreferences delegates to authService.updatePreferences", async () => {
      const dto = {
        preferredLanguage: "en" as const,
        preferredTimezone: "Asia/Tokyo",
      };
      const expectedUser = {
        id: "u-1",
        preferredLanguage: "en",
        preferredTimezone: "Asia/Tokyo",
      };
      mockAuthService.updatePreferences.mockResolvedValue(expectedUser);

      const result = await controller.updatePreferences(
        { user: { id: "u-1" } },
        dto,
      );

      expect(mockAuthService.updatePreferences).toHaveBeenCalledWith(
        "u-1",
        dto,
        undefined,
      );
      expect(result).toBe(expectedUser);
    });

    it("getProfile passes active organizationId from JWT payload to authService.getProfile", async () => {
      mockAuthService.getProfile.mockResolvedValue({
        id: "u-1",
        organizationId: "org-2",
      });

      const result = await controller.getProfile(
        { user: { id: "u-1", organizationId: "org-2" } },
        mockResponse as unknown as Response,
      );

      expect(mockAuthService.getProfile).toHaveBeenCalledWith("u-1", "org-2");
      expect(result).toEqual({ id: "u-1", organizationId: "org-2" });
    });

    it("refresh returns 401 instead of 500 URIError on malformed cookie encoding, and logout revokes via refresh token when access token is expired", async () => {
      await expect(
        controller.refresh(
          { headers: { cookie: "haihire_refresh_token=%E0%A4%A" } },
          {},
          mockResponse as unknown as Response,
        ),
      ).rejects.toMatchObject({ status: 401 });

      mockAuthService.logoutWithRefreshToken.mockResolvedValue(undefined);
      const logoutRes = await controller.logout(
        {
          user: undefined,
          cookies: { haihire_refresh_token: "valid-refresh-jwt" },
        } as never,
        mockResponse as unknown as Response,
      );
      expect(logoutRes).toEqual({ success: true });
      expect(mockAuthService.logoutWithRefreshToken).toHaveBeenCalledWith(
        "valid-refresh-jwt",
      );
    });

    it("uploadAvatar, updateAvatarSource, and getUserAvatar delegate cleanly and set private cache headers", async () => {
      const mockFile = { originalname: "pic.webp" } as Express.Multer.File;
      const expectedUser = { id: "u-1", avatarSource: "UPLOAD" };
      mockAuthService.uploadAvatar.mockResolvedValue(expectedUser);

      const uploadRes = await controller.uploadAvatar(
        { user: { id: "u-1", organizationId: "org-1" } },
        mockFile,
      );
      expect(mockAuthService.uploadAvatar).toHaveBeenCalledWith(
        "u-1",
        mockFile,
        "org-1",
      );
      expect(uploadRes).toBe(expectedUser);

      mockAuthService.updateAvatarSource.mockResolvedValue({
        id: "u-1",
        avatarSource: "GRAVATAR",
      });
      await controller.updateAvatarSource(
        { user: { id: "u-1", organizationId: "org-1" } },
        { source: "GRAVATAR" },
      );
      expect(mockAuthService.updateAvatarSource).toHaveBeenCalledWith(
        "u-1",
        "GRAVATAR",
        "org-1",
      );

      const mockStream = { on: vi.fn(), pipe: vi.fn() };
      mockAuthService.prepareUserAvatarStream.mockResolvedValue({
        stream: mockStream,
        mimeType: "image/webp",
      });
      const res = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        end: vi.fn(),
      };
      await controller.getUserAvatar(
        { user: { id: "u-viewer" } },
        "00000000-0000-4000-8000-000000000101",
        res as unknown as Response,
        "12345",
      );

      expect(mockAuthService.prepareUserAvatarStream).toHaveBeenCalledWith(
        "u-viewer",
        "00000000-0000-4000-8000-000000000101",
      );
      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/webp");
      expect(res.setHeader).toHaveBeenCalledWith(
        "X-Content-Type-Options",
        "nosniff",
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        "Cache-Control",
        "private, max-age=31536000, immutable",
      );
      expect(mockStream.pipe).toHaveBeenCalledWith(res);
    });
  });
});
