import { describe, it, expect, vi, beforeEach } from "vitest";
import { JwtStrategy } from "./jwt.strategy";
import { AppUnauthorizedException } from "../common/app-exception";

describe("JwtStrategy", () => {
  let strategy: JwtStrategy;
  let mockPrisma: {
    db: {
      orm: {
        public: {
          User: {
            select: unknown;
          };
          Organization: {
            select: unknown;
          };
        };
      };
    };
  };

  beforeEach(() => {
    mockPrisma = {
      db: {
        orm: {
          public: {
            User: {
              select: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  first: vi.fn().mockImplementation(async () => {
                    return {
                      id: "usr-123",
                      email: "test@example.com",
                      name: "Test User",
                      role: "ADMIN",
                      avatarUrl: null,
                      organizationId: "org-1",
                      tokenVersion: 1,
                      createdAt: new Date(),
                    };
                  }),
                }),
              }),
            },
            Organization: {
              select: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  first: vi.fn().mockImplementation(async () => {
                    return {
                      id: "org-1",
                      name: "Test Org",
                      slug: "test-org",
                      ownerId: "usr-123",
                    };
                  }),
                }),
              }),
            },
          },
        },
      },
    };

    strategy = new JwtStrategy(mockPrisma as never);
  });

  it("should validate and return user when tokenVersion matches", async () => {
    const user = await strategy.validate({
      sub: "usr-123",
      email: "test@example.com",
      role: "ADMIN",
      tokenVersion: 1,
    });

    expect(user).toBeDefined();
    expect(user.id).toBe("usr-123");
    expect(user.email).toBe("test@example.com");
    expect((user as unknown as { isOwner: boolean }).isOwner).toBe(true);
    expect(
      (user as unknown as { organization: { id: string } }).organization?.id,
    ).toBe("org-1");
  });

  it("should return isOwner as false when user is not the organization owner", async () => {
    mockPrisma.db.orm.public.Organization.select = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({
          id: "org-1",
          name: "Test Org",
          slug: "test-org",
          ownerId: "other-user-999",
        }),
      }),
    });

    const user = await strategy.validate({
      sub: "usr-123",
      email: "test@example.com",
      role: "ADMIN",
      tokenVersion: 1,
    });

    expect((user as unknown as { isOwner: boolean }).isOwner).toBe(false);
  });

  it("should return isOwner as false and organization as null when user has no organizationId", async () => {
    mockPrisma.db.orm.public.User.select = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({
          id: "usr-no-org",
          email: "noorg@example.com",
          name: "No Org User",
          role: "MEMBER",
          organizationId: null,
          tokenVersion: 0,
        }),
      }),
    });

    const user = await strategy.validate({
      sub: "usr-no-org",
      email: "noorg@example.com",
      role: "MEMBER",
      tokenVersion: 0,
    });

    expect((user as unknown as { isOwner: boolean }).isOwner).toBe(false);
    expect(
      (user as unknown as { organization: unknown }).organization,
    ).toBeNull();
  });

  it("should throw AppUnauthorizedException with revoked message when tokenVersion does not match", async () => {
    await expect(
      strategy.validate({
        sub: "usr-123",
        email: "test@example.com",
        role: "ADMIN",
        tokenVersion: 0, // Old version before revocation
      }),
    ).rejects.toThrow("Token has been revoked");
  });

  it("should accept legacy session tokens without tokenVersion if user is at default version 0", async () => {
    mockPrisma.db.orm.public.User.select = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({
          id: "usr-legacy",
          email: "legacy@example.com",
          name: "Legacy User",
          role: "MEMBER",
          tokenVersion: 0,
        }),
      }),
    });

    const user = await strategy.validate({
      sub: "usr-legacy",
      email: "legacy@example.com",
      role: "MEMBER",
      // tokenVersion is undefined
    });

    expect(user).toBeDefined();
    expect(user.id).toBe("usr-legacy");
  });

  it("should throw AppUnauthorizedException if user does not exist", async () => {
    mockPrisma.db.orm.public.User.select = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
      }),
    });

    await expect(
      strategy.validate({
        sub: "usr-non-existent",
        email: "none@example.com",
        role: "MEMBER",
      }),
    ).rejects.toThrow(AppUnauthorizedException);
  });

  it("should extract token from req.cookies['haihire_token']", () => {
    const reqWithCookie = {
      cookies: {
        haihire_token: "my-jwt-cookie-token",
      },
    };

    // Access extractor configured in strategy
    const extractor = (
      strategy as unknown as {
        _jwtFromRequest: (req: unknown) => string | null;
      }
    )._jwtFromRequest;
    expect(extractor).toBeDefined();
    const token = extractor(reqWithCookie);
    expect(token).toBe("my-jwt-cookie-token");
  });

  it("should extract token from raw req.headers.cookie", () => {
    const reqWithHeaderCookie = {
      headers: {
        cookie: "other=123; haihire_token=raw-cookie-token; test=abc",
      },
    };

    const extractor = (
      strategy as unknown as {
        _jwtFromRequest: (req: unknown) => string | null;
      }
    )._jwtFromRequest;
    const token = extractor(reqWithHeaderCookie);
    expect(token).toBe("raw-cookie-token");
  });

  it("should extract token from Authorization Bearer header", () => {
    const reqWithBearer = {
      headers: {
        authorization: "Bearer my-bearer-token",
      },
    };

    const extractor = (
      strategy as unknown as {
        _jwtFromRequest: (req: unknown) => string | null;
      }
    )._jwtFromRequest;
    const token = extractor(reqWithBearer);
    expect(token).toBe("my-bearer-token");
  });
});
