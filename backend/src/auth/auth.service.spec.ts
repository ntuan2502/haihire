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

  const mockUsers = [
    {
      id: "usr-admin",
      email: DEMO_ACCOUNTS.ADMIN.email,
      name: DEMO_ACCOUNTS.ADMIN.name,
      password: hashedPassword,
      role: DEMO_ACCOUNTS.ADMIN.role,
      avatarUrl: null,
      organizationId: "org-1",
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
      createdAt: new Date(),
    },
  ];

  beforeEach(() => {
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
              create: vi.fn().mockImplementation(async (data) => {
                const newUser = {
                  ...data,
                  organizationId: null,
                  createdAt: new Date(),
                };
                mockUsers.push(newUser);
                return newUser;
              }),
              upsert: vi.fn().mockImplementation(async ({ create }) => {
                const newUser = {
                  ...create,
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
          return { sub: "usr-admin", type: "refresh" };
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
  });
});
