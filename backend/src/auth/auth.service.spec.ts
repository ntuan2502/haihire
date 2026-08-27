import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthService } from "./auth.service";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import bcrypt from "bcryptjs";

describe("AuthService - Recruiter & Hiring Portal Authentication", () => {
  let authService: AuthService;
  let mockPrismaService: any;
  let mockJwtService: any;

  const validPassword = "password123";
  const hashedPassword = bcrypt.hashSync(validPassword, 10);

  const mockUsers = [
    {
      id: 1,
      email: "hr@tun.io.vn",
      name: "HR Lead / Recruiter",
      password: hashedPassword,
      role: "HR",
      avatarUrl: null,
      createdAt: new Date(),
    },
    {
      id: 2,
      email: "admin@tun.io.vn",
      name: "Talent Acquisition Admin",
      password: hashedPassword,
      role: "ADMIN",
      avatarUrl: null,
      createdAt: new Date(),
    },
    {
      id: 3,
      email: "interviewer@tun.io.vn",
      name: "Technical Interviewer",
      password: hashedPassword,
      role: "INTERVIEWER",
      avatarUrl: null,
      createdAt: new Date(),
    },
    {
      id: 4,
      email: "candidate@gmail.com",
      name: "John Doe Candidate",
      password: hashedPassword,
      role: "CANDIDATE",
      avatarUrl: null,
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
                        id: { eq: (target: number) => u.id === target },
                      };
                      return predicateFn(mockRecord);
                    });

                    if (!match) return null;

                    // If specific fields were selected, return only those fields
                    if (fields.length > 0) {
                      const projected: Record<string, any> = {};
                      for (const field of fields) {
                        projected[field] = (match as any)[field];
                      }
                      return projected;
                    }

                    return { ...match };
                  }),
                })),
              })),
            },
          },
        },
      },
    };

    mockJwtService = {
      sign: vi.fn().mockReturnValue("mocked-jwt-access-token-tun-io-vn"),
    };

    authService = new AuthService(mockPrismaService, mockJwtService);
  });

  it("1. Should successfully login HR Lead (hr@tun.io.vn) and return JWT accessToken + HR role", async () => {
    const result = await authService.login({
      email: "hr@tun.io.vn",
      password: "password123",
    });

    expect(result).toHaveProperty(
      "accessToken",
      "mocked-jwt-access-token-tun-io-vn",
    );
    expect(result.user).toEqual({
      id: 1,
      email: "hr@tun.io.vn",
      name: "HR Lead / Recruiter",
      role: "HR",
      avatarUrl: null,
      createdAt: expect.any(Date),
    });
    expect(mockJwtService.sign).toHaveBeenCalledWith({
      sub: 1,
      email: "hr@tun.io.vn",
      role: "HR",
    });
  });

  it("2. Should successfully login Talent Admin (admin@tun.io.vn) and return ADMIN role", async () => {
    const result = await authService.login({
      email: "admin@tun.io.vn",
      password: "password123",
    });

    expect(result.accessToken).toBeDefined();
    expect(result.user.role).toBe("ADMIN");
  });

  it("3. Should successfully login Technical Interviewer (interviewer@tun.io.vn) and return INTERVIEWER role", async () => {
    const result = await authService.login({
      email: "interviewer@tun.io.vn",
      password: "password123",
    });

    expect(result.accessToken).toBeDefined();
    expect(result.user.role).toBe("INTERVIEWER");
  });

  it("4. Should STRICTLY REJECT Candidate accounts (CANDIDATE role) from logging into Recruiter Portal", async () => {
    await expect(
      authService.login({
        email: "candidate@gmail.com",
        password: "password123",
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("5. Should throw UnauthorizedException when password is wrong", async () => {
    await expect(
      authService.login({
        email: "hr@tun.io.vn",
        password: "wrong-password",
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("6. Should throw UnauthorizedException when email does not exist", async () => {
    await expect(
      authService.login({
        email: "unknown@tun.io.vn",
        password: "password123",
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("7. Should retrieve sanitized profile with getProfile(userId)", async () => {
    const profile = await authService.getProfile(1);
    expect(profile).toEqual({
      id: 1,
      email: "hr@tun.io.vn",
      name: "HR Lead / Recruiter",
      role: "HR",
      avatarUrl: null,
      createdAt: expect.any(Date),
    });
  });
});
