import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthService } from "./auth.service";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "./constants";

describe("AuthService - Authentication & RBAC (ADMIN and MEMBER)", () => {
  let authService: AuthService;
  let mockPrismaService: unknown;
  let mockJwtService: {
    sign: ReturnType<typeof vi.fn>;
    verify: ReturnType<typeof vi.fn>;
  };

  const validPassword = DEMO_PASSWORD;
  const hashedPassword = bcrypt.hashSync(validPassword, 10);

  let mockUsers: Array<{
    id: string;
    email: string;
    name: string;
    password: string;
    role: "ADMIN" | "MEMBER";
    avatarUrl: string | null;
    organizationId: string | null;
    tokenVersion: number;
    createdAt: Date;
    updatedAt?: Date;
  }>;

  beforeEach(() => {
    mockUsers = [
      {
        id: "usr-admin",
        email: DEMO_ACCOUNTS.ADMIN.email,
        name: DEMO_ACCOUNTS.ADMIN.name,
        password: hashedPassword,
        role: DEMO_ACCOUNTS.ADMIN.role,
        avatarUrl: null,
        organizationId: "org-1",
        tokenVersion: 0,
        createdAt: new Date(),
      },
      {
        id: "usr-member",
        email: DEMO_ACCOUNTS.MEMBER.email,
        name: DEMO_ACCOUNTS.MEMBER.name,
        password: hashedPassword,
        role: DEMO_ACCOUNTS.MEMBER.role,
        avatarUrl: null,
        organizationId: "org-1",
        tokenVersion: 0,
        createdAt: new Date(),
      },
    ];

    mockPrismaService = {
      db: {
        orm: {
          public: {
            User: {
              select: vi.fn().mockImplementation((...fields: string[]) => ({
                where: vi.fn().mockImplementation((predicateFn) => ({
                  first: vi.fn().mockImplementation(async () => {
                    const match = mockUsers.find((u) => {
                      const mockRecord = {
                        email: {
                          eq: (target: string) =>
                            u.email.toLowerCase() === target.toLowerCase(),
                        },
                        id: { eq: (target: string) => u.id === target },
                      };
                      return predicateFn(mockRecord);
                    });

                    if (!match) return null;

                    if (fields.length > 0) {
                      const projected: Record<string, unknown> = {};
                      const matchRecord = match as Record<string, unknown>;
                      for (const field of fields) {
                        projected[field] = matchRecord[field];
                      }
                      return projected;
                    }

                    return { ...match };
                  }),
                })),
              })),
              where: vi.fn().mockImplementation((predicateFn) => ({
                first: vi.fn().mockImplementation(async () => {
                  const match = mockUsers.find((u) => {
                    const mockRecord = {
                      id: { eq: (target: string) => u.id === target },
                      email: { eq: (target: string) => u.email === target },
                    };
                    return predicateFn(mockRecord);
                  });
                  return match || null;
                }),
                update: vi.fn().mockImplementation(async (data) => {
                  const match = mockUsers.find((u) => {
                    const mockRecord = {
                      id: { eq: (target: string) => u.id === target },
                      email: { eq: (target: string) => u.email === target },
                    };
                    return predicateFn(mockRecord);
                  });
                  if (match) {
                    Object.assign(match, data);
                  }
                  return match;
                }),
              })),
              create: vi.fn().mockImplementation(async (data) => {
                const newUser = {
                  ...data,
                  tokenVersion: data.tokenVersion ?? 0,
                  organizationId: null,
                  createdAt: new Date(),
                };
                mockUsers.push(newUser);
                return newUser;
              }),
              upsert: vi.fn().mockImplementation(async ({ create }) => {
                const newUser = {
                  ...create,
                  tokenVersion: create.tokenVersion ?? 0,
                  organizationId: null,
                  createdAt: new Date(),
                };
                mockUsers.push(newUser);
                return newUser;
              }),
            },
            Organization: {
              select: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  first: vi.fn().mockImplementation(async () => ({
                    id: "org-1",
                    name: "Acme Corp",
                    slug: "acme",
                    ownerId: "usr-admin",
                  })),
                }),
              }),
            },
          },
        },
      },
    };

    mockJwtService = {
      sign: vi.fn().mockReturnValue("mocked-jwt-access-token-tun-io-vn"),
      verify: vi.fn().mockImplementation((token: string) => {
        if (token === "valid-refresh-token") {
          return { sub: "usr-admin", type: "refresh", tokenVersion: 0 };
        }
        if (token === "revoked-refresh-token") {
          return { sub: "usr-admin", type: "refresh", tokenVersion: 0 };
        }
        throw new Error("Invalid token");
      }),
    };

    authService = new AuthService(
      mockPrismaService as never,
      mockJwtService as never,
    );
  });

  it("1. Should successfully login Admin and return ADMIN role with isOwner=true", async () => {
    const result = await authService.login({
      email: DEMO_ACCOUNTS.ADMIN.email,
      password: DEMO_PASSWORD,
    });

    expect(result).toHaveProperty(
      "accessToken",
      "mocked-jwt-access-token-tun-io-vn",
    );
    expect(result.user.role).toBe(DEMO_ACCOUNTS.ADMIN.role);
    expect(result.user.isOwner).toBe(true);
    expect(mockJwtService.sign).toHaveBeenCalledWith({
      sub: "usr-admin",
      email: DEMO_ACCOUNTS.ADMIN.email,
      role: DEMO_ACCOUNTS.ADMIN.role,
      tokenVersion: 0,
    });
  });

  it("2. Should successfully login Member and return MEMBER role with isOwner=false", async () => {
    const result = await authService.login({
      email: DEMO_ACCOUNTS.MEMBER.email,
      password: DEMO_PASSWORD,
    });

    expect(result.accessToken).toBeDefined();
    expect(result.user.role).toBe(DEMO_ACCOUNTS.MEMBER.role);
    expect(result.user.isOwner).toBe(false);
  });

  it("3. Should throw UnauthorizedException when password is wrong", async () => {
    await expect(
      authService.login({
        email: "admin@tun.io.vn",
        password: "wrong-password",
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("4. Should throw UnauthorizedException when email does not exist", async () => {
    await expect(
      authService.login({
        email: "unknown@tun.io.vn",
        password: DEMO_PASSWORD,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("5. Should retrieve profile with isOwner and sanitized fields", async () => {
    const profile = await authService.getProfile("usr-admin");
    expect(profile.role).toBe("ADMIN");
    expect(profile.isOwner).toBe(true);
  });

  describe("Registration Flow", () => {
    it("6. Should register a new user successfully with default MEMBER role", async () => {
      const result = await authService.register({
        name: "New Member",
        email: "newmember@company.com",
        password: "securepassword",
      });

      expect(result).toBeDefined();
      expect(result.accessToken).toBe("mocked-jwt-access-token-tun-io-vn");
      expect(result.user.name).toBe("New Member");
      expect(result.user.email).toBe("newmember@company.com");
      expect(result.user.role).toBe("MEMBER");
      expect(result.user.organizationId).toBeNull();
      expect(result.user.tokenVersion).toBe(0);
    });

    it("7. Should throw ConflictException if email is already registered", async () => {
      await expect(
        authService.register({
          name: "Duplicate Admin",
          email: DEMO_ACCOUNTS.ADMIN.email,
          password: DEMO_PASSWORD,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("RefreshToken Flow", () => {
    it("8. Should refresh token successfully when valid refreshToken is provided", async () => {
      const result = await authService.refreshToken({
        refreshToken: "valid-refresh-token",
      });

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
    });

    it("9. Should throw UnauthorizedException when invalid or expired refreshToken is provided", async () => {
      await expect(
        authService.refreshToken({
          refreshToken: "invalid-token",
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("10. Should throw UnauthorizedException when refreshToken tokenVersion does not match user tokenVersion", async () => {
      // Simulate logout incrementing user's tokenVersion
      mockUsers[0].tokenVersion = 1;

      await expect(
        authService.refreshToken({
          refreshToken: "revoked-refresh-token", // Decoded tokenVersion is 0
        }),
      ).rejects.toThrow("Token has been revoked");
    });
  });

  describe("Logout & Password Revocation Flow", () => {
    it("11. Should increment user tokenVersion on logout", async () => {
      expect(mockUsers[0].tokenVersion).toBe(0);

      await authService.logout("usr-admin");

      expect(mockUsers[0].tokenVersion).toBe(1);
    });

    it("12. Should increment user tokenVersion and update password on changePassword", async () => {
      expect(mockUsers[0].tokenVersion).toBe(0);

      const result = await authService.changePassword(
        "usr-admin",
        DEMO_PASSWORD,
        "new-secure-pass-123",
      );

      expect(result.success).toBe(true);
      expect(mockUsers[0].tokenVersion).toBe(1);
      expect(bcrypt.compareSync("new-secure-pass-123", mockUsers[0].password)).toBe(true);
    });

    it("13. Should reject changePassword when current password does not match", async () => {
      await expect(
        authService.changePassword(
          "usr-admin",
          "incorrect-pass",
          "new-secure-pass-123",
        ),
      ).rejects.toThrow("Current password does not match");

      expect(mockUsers[0].tokenVersion).toBe(0);
    });
  });
});
