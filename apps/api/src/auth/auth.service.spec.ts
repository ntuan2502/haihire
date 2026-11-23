import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthService } from "./auth.service";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { BCRYPT_SALT_ROUNDS, DEMO_ACCOUNTS, DEMO_PASSWORD } from "./constants";

describe("AuthService - Authentication & RBAC (ADMIN and MEMBER)", () => {
  let authService: AuthService;
  let mockPrismaService: unknown;
  let mockJwtService: {
    sign: ReturnType<typeof vi.fn>;
    verify: ReturnType<typeof vi.fn>;
  };

  const validPassword = DEMO_PASSWORD;
  const hashedPassword = bcrypt.hashSync(validPassword, BCRYPT_SALT_ROUNDS);

  let mockUsers: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    role: "ADMIN" | "MEMBER";
    avatarUrl: string | null;
    preferredLanguage?: string | null;
    preferredTimezone?: string | null;
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
        firstName: DEMO_ACCOUNTS.ADMIN.firstName,
        lastName: DEMO_ACCOUNTS.ADMIN.lastName,
        password: hashedPassword,
        role: DEMO_ACCOUNTS.ADMIN.role,
        avatarUrl: null,
        preferredLanguage: null,
        preferredTimezone: null,
        organizationId: "org-1",
        tokenVersion: 0,
        createdAt: new Date(),
      },
      {
        id: "usr-member",
        email: DEMO_ACCOUNTS.MEMBER.email,
        firstName: DEMO_ACCOUNTS.MEMBER.firstName,
        lastName: DEMO_ACCOUNTS.MEMBER.lastName,
        password: hashedPassword,
        role: DEMO_ACCOUNTS.MEMBER.role,
        avatarUrl: null,
        preferredLanguage: null,
        preferredTimezone: null,
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
        update: vi.fn().mockImplementation(
          async ({
            where,
            data,
          }: {
            where: { id: string };
            data: {
              tokenVersion?: number | { increment?: number };
              password?: string;
              firstName?: string;
              lastName?: string;
              preferredLanguage?: string | null;
              preferredTimezone?: string | null;
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
              if (data.firstName !== undefined) {
                user.firstName = data.firstName;
              }
              if (data.lastName !== undefined) {
                user.lastName = data.lastName;
              }
              if (data.preferredLanguage !== undefined) {
                user.preferredLanguage = data.preferredLanguage;
              }
              if (data.preferredTimezone !== undefined) {
                user.preferredTimezone = data.preferredTimezone;
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
      organizationId: "org-1",
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
        firstName: "Member",
        lastName: "New",
        email: "newmember@company.com",
        password: "securepassword",
      });

      expect(result).toBeDefined();
      expect(result.accessToken).toBe("mocked-jwt-access-token-tun-io-vn");
      expect(result.user.firstName).toBe("Member");
      expect(result.user.lastName).toBe("New");
      expect(result.user.name).toBe("New Member");
      expect(result.user.email).toBe("newmember@company.com");
      expect(result.user.role).toBe("MEMBER");
      expect(result.user.organizationId).toBeNull();
      expect(result.user.tokenVersion).toBe(0);
    });

    it("7. Should throw ConflictException if email is already registered", async () => {
      await expect(
        authService.register({
          firstName: "Admin",
          lastName: "Duplicate",
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
      await Promise.all([
        authService.logout("usr-admin"),
        authService.logout("usr-admin"),
      ]);
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

    it("14. Should detect refresh token reuse with Redis and invalidate all sessions", async () => {
      const mockRedis = {
        get: vi.fn().mockResolvedValue("1"), // already revoked
        set: vi.fn().mockResolvedValue("OK"),
      };
      const authServiceWithRedis = new AuthService(
        mockPrismaService as never,
        mockJwtService as never,
        mockRedis as never,
      );

      mockJwtService.verify.mockReturnValueOnce({
        sub: "usr-admin",
        type: "refresh",
        tokenVersion: 0,
        jti: "compromised-jti-uuid",
      });

      await expect(
        authServiceWithRedis.refreshToken({
          refreshToken: "valid-looking-token",
        }),
      ).rejects.toThrow("Compromised refresh token reuse detected");

      expect(mockUsers[0].tokenVersion).toBe(1);
    });

    it("15. Should resolve permissions using getMyPermissions", async () => {
      const mockResolver = {
        resolveAllPermissions: vi
          .fn()
          .mockResolvedValue(["candidate:view", "candidate:create"]),
      };
      const authServiceWithResolver = new AuthService(
        mockPrismaService as never,
        mockJwtService as never,
        undefined,
        mockResolver as never,
      );

      const result = await authServiceWithResolver.getMyPermissions({
        id: "usr-member",
        role: "MEMBER" as const,
        organizationId: "org-1",
        isOwner: false,
      });

      expect(result.permissions).toEqual([
        "candidate:view",
        "candidate:create",
      ]);
      expect(mockResolver.resolveAllPermissions).toHaveBeenCalledWith(
        "org-1",
        "MEMBER",
        false,
      );
    });

    it("16. Should persist and clear user personal language and timezone overrides", async () => {
      const updated = await authService.updatePreferences("usr-member", {
        preferredLanguage: "en",
        preferredTimezone: "Asia/Tokyo",
      });

      expect(updated.preferredLanguage).toBe("en");
      expect(updated.preferredTimezone).toBe("Asia/Tokyo");
      expect(mockUsers[1].preferredLanguage).toBe("en");
      expect(mockUsers[1].preferredTimezone).toBe("Asia/Tokyo");

      const cleared = await authService.updatePreferences("usr-member", {
        preferredLanguage: null,
        preferredTimezone: null,
      });

      expect(cleared.preferredLanguage).toBeNull();
      expect(cleared.preferredTimezone).toBeNull();
    });

    it("17. Should update firstName and lastName via updateProfile and reject blank names", async () => {
      const updated = await authService.updateProfile("usr-member", {
        firstName: "Tuấn",
        lastName: "Nguyễn Anh",
      });

      expect(updated.firstName).toBe("Tuấn");
      expect(updated.lastName).toBe("Nguyễn Anh");
      expect(updated.name).toBe("Tuấn Nguyễn Anh");
      expect(mockUsers[1].firstName).toBe("Tuấn");
      expect(mockUsers[1].lastName).toBe("Nguyễn Anh");

      await expect(
        authService.updateProfile("usr-member", {
          firstName: "   ",
          lastName: "Nguyễn",
        }),
      ).rejects.toThrow();
    });

    it("18. Should never select dropped role/organizationId columns on User in refreshToken and should preserve decoded org in multi-org setups", async () => {
      const multiOrgPrisma = {
        user: {
          findUnique: vi
            .fn()
            .mockImplementation(
              async (args: { select?: Record<string, unknown> }) => {
                if (
                  args.select &&
                  ("role" in args.select || "organizationId" in args.select)
                ) {
                  throw new Error(
                    "PrismaClientValidationError: Unknown field on model User",
                  );
                }
                return {
                  id: "usr-multi",
                  email: "multi@example.com",
                  firstName: "Multi",
                  lastName: "Org",
                  preferredLanguage: null,
                  preferredTimezone: null,
                  tokenVersion: 0,
                };
              },
            ),
        },
        organization: {
          findUnique: vi
            .fn()
            .mockImplementation(
              async ({ where }: { where: { id: string } }) => ({
                id: where.id,
                name: where.id === "org-2" ? "Org Two" : "Org One",
                slug: where.id,
                ownerId: where.id === "org-1" ? "usr-multi" : "other-owner",
              }),
            ),
        },
        organizationMember: {
          findFirst: vi
            .fn()
            .mockImplementation(
              async ({ where }: { where: { organizationId?: string } }) => {
                if (where.organizationId === "org-2")
                  return { role: "RECRUITER" };
                return { organizationId: "org-1", role: "ADMIN" };
              },
            ),
        },
      };
      const jwtMock = {
        verify: vi.fn().mockReturnValue({
          sub: "usr-multi",
          type: "refresh",
          organizationId: "org-2",
          tokenVersion: 0,
        }),
        sign: vi.fn().mockReturnValue("signed-token"),
      };
      const multiAuth = new AuthService(
        multiOrgPrisma as never,
        jwtMock as never,
      );

      const refreshed = await multiAuth.refreshToken({
        refreshToken: "multi-org-rt",
      });
      expect(refreshed.hasOrg).toBe(true);
      expect(jwtMock.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: "usr-multi",
          role: "RECRUITER",
          organizationId: "org-2",
        }),
      );

      const profile = await multiAuth.getProfile("usr-multi", "org-2");
      expect(profile.organizationId).toBe("org-2");
      expect(profile.role).toBe("RECRUITER");
      expect(profile.isOwner).toBe(false);
    });

    it("19. Should attach logoUrl (and strip internal logoObjectKey/logoUpdatedAt) in getProfile and sanitize timezone", async () => {
      const logoPrisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: "usr-logo",
            email: "logo@example.com",
            firstName: "Logo",
            lastName: "Tester",
            avatarUrl: null,
            preferredLanguage: null,
            preferredTimezone: null,
            createdAt: new Date(),
          }),
        },
        organization: {
          findUnique: vi.fn().mockResolvedValue({
            id: "org-1",
            name: "Demo 1",
            slug: "demo-1",
            ownerId: "usr-logo",
            logoObjectKey: "tenants/org-1/logos/brand.png",
            logoUpdatedAt: new Date("2026-11-20T09:33:06.420Z"),
            timezone: "Asia/Saigon",
            nameDisplayOrder: "FIRST_LAST",
          }),
        },
        organizationMember: {
          findFirst: vi.fn().mockResolvedValue({ role: "ADMIN" }),
        },
      };
      const logoAuth = new AuthService(
        logoPrisma as never,
        mockJwtService as never,
      );

      const profile = await logoAuth.getProfile("usr-logo", "org-1");

      expect(profile.organization).toEqual(
        expect.objectContaining({
          id: "org-1",
          logoUrl: `/organizations/public/org-1/logo?v=${new Date("2026-11-20T09:33:06.420Z").getTime()}`,
          timezone: "Asia/Ho_Chi_Minh",
        }),
      );
      expect(
        "logoObjectKey" in (profile.organization as Record<string, unknown>),
      ).toBe(false);
      expect(
        "logoUpdatedAt" in (profile.organization as Record<string, unknown>),
      ).toBe(false);
    });

    it("20. Should remember last accessed org across logout/login via OrganizationMember.lastAccessedAt and fall back deterministically", async () => {
      const { createMockPrismaService, createMockTable } =
        await import("../test/helpers/prisma-composer-mock");
      const seededAt = new Date("2026-10-29T23:00:00.000Z");
      const userTable = createMockTable([
        {
          id: "usr-multi",
          email: "multi-org@example.com",
          firstName: "Multi",
          lastName: "Org",
          password: hashedPassword,
          avatarUrl: null,
          preferredLanguage: null,
          preferredTimezone: null,
          tokenVersion: 0,
          createdAt: seededAt,
        },
      ]);
      const orgTable = createMockTable([
        {
          id: "00000000-0000-4000-8000-000000000010",
          name: "Demo 1",
          slug: "demo-1",
          ownerId: "owner-1",
          timezone: "Asia/Ho_Chi_Minh",
          nameDisplayOrder: "LAST_FIRST",
          createdAt: seededAt,
        },
        {
          id: "00000000-0000-4000-8000-000000000030",
          name: "Demo 3",
          slug: "demo-3",
          ownerId: "owner-3",
          timezone: "Asia/Ho_Chi_Minh",
          nameDisplayOrder: "LAST_FIRST",
          createdAt: seededAt,
        },
        {
          id: "00000000-0000-4000-8000-000000000040",
          name: "Demo 4",
          slug: "demo-4",
          ownerId: "owner-4",
          timezone: "Asia/Ho_Chi_Minh",
          nameDisplayOrder: "LAST_FIRST",
          createdAt: seededAt,
        },
      ]);
      // Intentionally insert Demo 3 before Demo 1 with identical createdAt & null lastAccessedAt
      const memberTable = createMockTable<{
        id: string;
        userId: string;
        organizationId: string;
        role: string;
        lastAccessedAt: Date | null;
        createdAt: Date;
      }>([
        {
          id: "mem-3",
          userId: "usr-multi",
          organizationId: "00000000-0000-4000-8000-000000000030",
          role: "ADMIN",
          lastAccessedAt: null,
          createdAt: seededAt,
        },
        {
          id: "mem-1",
          userId: "usr-multi",
          organizationId: "00000000-0000-4000-8000-000000000010",
          role: "ADMIN",
          lastAccessedAt: null,
          createdAt: seededAt,
        },
        {
          id: "mem-4",
          userId: "usr-multi",
          organizationId: "00000000-0000-4000-8000-000000000040",
          role: "RECRUITER",
          lastAccessedAt: null,
          createdAt: seededAt,
        },
      ]);

      const mockDb = createMockPrismaService({
        user: userTable,
        organization: orgTable,
        organizationMember: memberTable,
      });
      const mruAuth = new AuthService(mockDb as never, mockJwtService as never);

      // With all lastAccessedAt=null & identical createdAt, deterministic tie-breaker picks Demo 1 (0010) instead of Demo 3 (0030)
      const firstLogin = await mruAuth.login({
        email: "multi-org@example.com",
        password: validPassword,
      });
      expect(firstLogin.user.organizationId).toBe(
        "00000000-0000-4000-8000-000000000010",
      );

      // Simulate user earlier switching to Demo 1, then actively working in Demo 4 and logging out
      memberTable.store.find((m) => m.id === "mem-1")!.lastAccessedAt =
        new Date("2026-11-20T09:00:00.000Z");
      await mruAuth.logout("usr-multi", "00000000-0000-4000-8000-000000000040");

      const loginAfterLogout = await mruAuth.login({
        email: "multi-org@example.com",
        password: validPassword,
      });
      expect(loginAfterLogout.user.organizationId).toBe(
        "00000000-0000-4000-8000-000000000040",
      );
      expect(loginAfterLogout.user.role).toBe("RECRUITER");

      // If user is removed from Demo 4, next login cleanly falls back to previous MRU org (Demo 1)
      const mem4Idx = memberTable.store.findIndex((m) => m.id === "mem-4");
      memberTable.store.splice(mem4Idx, 1);

      const loginAfterRemoval = await mruAuth.login({
        email: "multi-org@example.com",
        password: validPassword,
      });
      expect(loginAfterRemoval.user.organizationId).toBe(
        "00000000-0000-4000-8000-000000000010",
      );
      expect(loginAfterRemoval.user.role).toBe("ADMIN");
    });
  });
});
