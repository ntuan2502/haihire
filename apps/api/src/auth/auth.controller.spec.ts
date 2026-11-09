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
    it("login sets haihire_token HttpOnly cookie", async () => {
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
    });

    it("logout clears haihire_token cookie with maxAge 0", async () => {
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
    });
  });
});
