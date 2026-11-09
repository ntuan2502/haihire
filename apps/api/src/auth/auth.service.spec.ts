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
      user: {
        findFirst: vi
          .fn()
          .mockImplementation(
            async ({ where }: { where: { email?: string; id?: string } }) => {
              return (
                mockUsers.find((u) => {
                  if (
                    where.email &&
                    u.email.toLowerCase() !== where.email.toLowerCase()
                  )
                    return false;
                  if (where.id && u.id !== where.id) return false;
                  return true;
                }) || null
              );
            },
          ),
        findUnique: vi
          .fn()
          .mockImplementation(
            async ({ where }: { where: { email?: string; id?: string } }) => {
              return (
                mockUsers.find((u) => {
                  if (
                    where.email &&
                    u.email.toLowerCase() !== where.email.toLowerCase()
                  )
                    return false;
                  if (where.id && u.id !== where.id) return false;
                  return true;
                }) || null
              );
            },
          ),
        create: vi
          .fn()
          .mockImplementation(
            async ({ data }: { data: Record<string, unknown> }) => {
              const newUser = {
                ...data,
                tokenVersion: (data.tokenVersion as number) ?? 0,
                organizationId: (data.organizationId as string) ?? null,
                createdAt: new Date(),
              } as (typeof mockUsers)[0];
              mockUsers.push(newUser);
              return newUser;
            },
          ),
        upsert: vi
          .fn()
          .mockImplementation(
            async ({
              create,
              update,
              where,
            }: {
              create: Record<string, unknown>;
              update: Record<string, unknown>;
              where: { email?: string; id?: string };
            }) => {
              const existing = mockUsers.find((u) => {
                if (
                  where.email &&
                  u.email.toLowerCase() === where.email.toLowerCase()
                )
                  return true;
                if (where.id && u.id === where.id) return true;
                return false;
              });
              if (existing) {
                Object.assign(existing, update);
                return existing;
              }
              const newUser = {
                ...create,
                tokenVersion: (create.tokenVersion as number) ?? 0,
                organizationId: (create.organizationId as string) ?? null,
                createdAt: new Date(),
              } as (typeof mockUsers)[0];
              mockUsers.push(newUser);
              return newUser;
            },
          ),
        update: vi
          .fn()
          .mockImplementation(
            async ({
              where,
              data,
            }: {
              where: { id: string };
              data: {
                tokenVersion?: number | { increment?: number };
                password?: string;
              };
            }) => {
              const user = mockUsers.find((u) => u.id === where.id);
              if (user) {
                if (
                  typeof data.tokenVersion === "object" &&
                  data.tokenVersion?.increment
                ) {
                  user.tokenVersion += data.tokenVersion.increment;
                } else if (typeof data.tokenVersion === "number") {
                  user.tokenVersion = data.tokenVersion;
                }
                if (data.password) {
                  user.password = data.password;
                }
              }
              return user;
            },
          ),
      },
      organization: {
        findUnique: vi.fn().mockImplementation(async () => ({
          id: "org-1",
          name: "Acme Corp",
          slug: "acme",
          ownerId: "usr-admin",
        })),
        findFirst: vi.fn().mockImplementation(async () => ({
          id: "org-1",
          name: "Acme Corp",
          slug: "acme",
          ownerId: "usr-admin",
        })),
        upsert: vi
          .fn()
          .mockImplementation(
            async ({ create }: { create: Record<string, unknown> }) => ({
              ...create,
            }),
          ),
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
    it("preserves both revocations when two logout requests read the same version", async () => {
      await Promise.all([authService.logout("usr-admin"), authService.logout("usr-admin")]);
      expect(mockUsers[0].tokenVersion).toBe(2);
    });

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
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockUsers[0].tokenVersion).toBe(1);
      expect(
        bcrypt.compareSync("new-secure-pass-123", mockUsers[0].password),
      ).toBe(true);
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
