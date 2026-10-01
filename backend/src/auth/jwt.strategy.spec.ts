import { describe, it, expect, vi, beforeEach } from "vitest";
import { JwtStrategy } from "./jwt.strategy";
import { AppUnauthorizedException } from "../common/app-exception";

describe("JwtStrategy", () => {
  let strategy: JwtStrategy;
  let mockPrisma: any;

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
                      createdAt: new Date(),
                    };
                  }),
                }),
              }),
            },
          },
        },
      },
    };

    strategy = new JwtStrategy(mockPrisma);
  });

  it("should validate and return user from payload", async () => {
    const user = await strategy.validate({
      sub: "usr-123",
      email: "test@example.com",
      role: "ADMIN",
    });

    expect(user).toBeDefined();
    expect(user.id).toBe("usr-123");
    expect(user.email).toBe("test@example.com");
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
    const extractor = (strategy as any)._jwtFromRequest;
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

    const extractor = (strategy as any)._jwtFromRequest;
    const token = extractor(reqWithHeaderCookie);
    expect(token).toBe("raw-cookie-token");
  });

  it("should extract token from Authorization Bearer header", () => {
    const reqWithBearer = {
      headers: {
        authorization: "Bearer my-bearer-token",
      },
    };

    const extractor = (strategy as any)._jwtFromRequest;
    const token = extractor(reqWithBearer);
    expect(token).toBe("my-bearer-token");
  });
});
