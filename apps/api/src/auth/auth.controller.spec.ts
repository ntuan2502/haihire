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
    getProfile: ReturnType<typeof vi.fn>;
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
      getProfile: vi.fn(),
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

    it("logout clears haihire_token, haihire_refresh_token, and haihire_has_org cookies with maxAge 0", async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(
        { user: { id: "u-1" } },
        mockResponse as unknown as Response,
      );

      expect(result).toEqual({ success: true });
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
  });
});
