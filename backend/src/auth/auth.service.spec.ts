import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthService } from "./auth.service";
import { ConflictException, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import bcrypt from "bcryptjs";

describe("AuthService - Recruiter & Hiring Portal Authentication", () => {
  let authService: AuthService;
  let mockPrismaService: any;
  let mockJwtService: any;

  const validPassword = "password123";
  const hashedPassword = bcrypt.hashSync(validPassword, 10);

  const mockUsers = [
    {
      id: "usr-1",
      email: "hr@tun.io.vn",
      name: "HR Lead / Recruiter",
      password: hashedPassword,
      role: "HR",
      avatarUrl: null,
      organizationId: null,
      createdAt: new Date(),
    },
    {
      id: "usr-2",
      email: "admin@tun.io.vn",
      name: "Talent Acquisition Admin",
      password: hashedPassword,
      role: "ADMIN",
      avatarUrl: null,
      organizationId: null,
      createdAt: new Date(),
    },
    {
      id: "usr-3",
      email: "interviewer@tun.io.vn",
      name: "Technical Interviewer",
      password: hashedPassword,
      role: "INTERVIEWER",
      avatarUrl: null,
      organizationId: null,
      createdAt: new Date(),
    },
    {
      id: "usr-4",
      email: "candidate@gmail.com",
      name: "John Doe Candidate",
      password: hashedPassword,
      role: "CANDIDATE",
      avatarUrl: null,
      organizationId: null,
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
                  first: vi.fn().mockResolvedValue(null),
                }),
              }),
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
      id: "usr-1",
      email: "hr@tun.io.vn",
      name: "HR Lead / Recruiter",
      role: "HR",
      avatarUrl: null,
      organizationId: null,
      organization: null,
      createdAt: expect.any(Date),
    });
    expect(mockJwtService.sign).toHaveBeenCalledWith({
      sub: "usr-1",
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
    const profile = await authService.getProfile("usr-1");
    expect(profile).toEqual({
      id: "usr-1",
      email: "hr@tun.io.vn",
      name: "HR Lead / Recruiter",
      role: "HR",
      avatarUrl: null,
      organizationId: null,
      organization: null,
      createdAt: expect.any(Date),
    });
  });

  describe("Registration Flow", () => {
    it("8. Should register a new user successfully", async () => {
      const result = await authService.register({
        name: "New Recruiter",
        email: "newrecruiter@company.com",
        password: "securepassword",
      });

      expect(result).toBeDefined();
      expect(result.accessToken).toBe("mocked-jwt-access-token-tun-io-vn");
      expect(result.user.name).toBe("New Recruiter");
      expect(result.user.email).toBe("newrecruiter@company.com");
      expect(result.user.role).toBe("HR");
      expect(result.user.organizationId).toBeNull();
    });

    it("9. Should throw ConflictException if email is already registered", async () => {
      await expect(
        authService.register({
          name: "Duplicate User",
          email: "hr@tun.io.vn", // Already in mockUsers!
          password: "password123",
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
