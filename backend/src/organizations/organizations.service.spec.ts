import { describe, it, expect, beforeEach, vi } from "vitest";
import { OrganizationsService } from "./organizations.service";
import { ConflictException, NotFoundException } from "@nestjs/common";

describe("OrganizationsService - Multi-Tenant Organization Management", () => {
  let service: OrganizationsService;
  let mockPrismaService: any;

  let mockOrgs: any[] = [];
  let mockUsers: any[] = [];

  beforeEach(() => {
    mockOrgs = [
      {
        id: 1,
        name: "Acme Corp",
        slug: "acme-corp",
        inviteCode: "ORG-ACME99",
        createdAt: new Date(),
      },
    ];

    mockUsers = [
      {
        id: 1,
        email: "hr@tun.io.vn",
        name: "HR Lead",
        organizationId: null,
      },
      {
        id: 2,
        email: "admin@tun.io.vn",
        name: "Admin",
        organizationId: 1,
      },
    ];

    mockPrismaService = {
      db: {
        orm: {
          public: {
            Organization: {
              select: vi.fn().mockImplementation((...fields: string[]) => ({
                where: vi.fn().mockImplementation((predicateFn) => ({
                  first: vi.fn().mockImplementation(async () => {
                    const match = mockOrgs.find((o) => {
                      const mockRecord = {
                        id: { eq: (target: number) => o.id === target },
                        slug: {
                          eq: (target: string) =>
                            o.slug.toLowerCase() === target.toLowerCase(),
                        },
                        inviteCode: {
                          eq: (target: string) => o.inviteCode === target,
                        },
                      };
                      return predicateFn(mockRecord);
                    });

                    if (!match) return null;
                    if (fields.length > 0) {
                      const proj: Record<string, any> = {};
                      for (const f of fields) proj[f] = match[f];
                      return proj;
                    }
                    return { ...match };
                  }),
                })),
                all: vi.fn().mockImplementation(async () => {
                  return mockOrgs.map((o) => ({ ...o }));
                }),
              })),
              upsert: vi.fn().mockImplementation(async ({ create }) => {
                const newOrg = {
                  id: mockOrgs.length + 1,
                  name: create.name,
                  slug: create.slug,
                  inviteCode: create.inviteCode,
                  createdAt: new Date(),
                };
                mockOrgs.push(newOrg);
                return newOrg;
              }),
            },
            User: {
              select: vi.fn().mockImplementation((...fields: string[]) => ({
                where: vi.fn().mockImplementation((predicateFn) => ({
                  first: vi.fn().mockImplementation(async () => {
                    const match = mockUsers.find((u) => {
                      const mockRecord = {
                        id: { eq: (target: number) => u.id === target },
                        email: {
                          eq: (target: string) =>
                            u.email.toLowerCase() === target.toLowerCase(),
                        },
                      };
                      return predicateFn(mockRecord);
                    });
                    if (!match) return null;
                    if (fields.length > 0) {
                      const proj: Record<string, any> = {};
                      for (const f of fields) proj[f] = match[f];
                      return proj;
                    }
                    return { ...match };
                  }),
                })),
              })),
              where: vi.fn().mockImplementation((predicateFn) => ({
                update: vi.fn().mockImplementation(async (updates) => {
                  const targetUser = mockUsers.find((u) => {
                    const mockRecord = {
                      id: { eq: (target: number) => u.id === target },
                    };
                    return predicateFn(mockRecord);
                  });
                  if (targetUser) {
                    Object.assign(targetUser, updates);
                  }
                  return targetUser;
                }),
              })),
            },
          },
        },
      },
    };

    service = new OrganizationsService(mockPrismaService);
  });

  it("1. Should successfully create a new organization and link the user", async () => {
    const result = await service.create(1, {
      name: "Stark Industries",
      slug: "stark-industries",
    });

    expect(result.organization.name).toBe("Stark Industries");
    expect(result.organization.slug).toBe("stark-industries");
    expect(result.organization.inviteCode).toMatch(/^ORG-[A-Z0-9]{6}$/);

    // Verify user was linked to the organization
    const user = mockUsers.find((u) => u.id === 1);
    expect(user.organizationId).toBe(result.organization.id);
  });

  it("2. Should throw ConflictException when creating organization with existing slug", async () => {
    await expect(
      service.create(1, {
        name: "Acme Duplicate",
        slug: "acme-corp",
      }),
    ).rejects.toThrow(ConflictException);
  });

  it("3. Should successfully join an organization with valid invite code", async () => {
    const result = await service.join(1, {
      inviteCodeOrSlug: "ORG-ACME99",
    });

    expect(result.organization.name).toBe("Acme Corp");
    const user = mockUsers.find((u) => u.id === 1);
    expect(user.organizationId).toBe(1);
  });

  it("4. Should throw NotFoundException when invite code or slug is invalid", async () => {
    await expect(
      service.join(1, {
        inviteCodeOrSlug: "INVALID-CODE",
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("5. Should search organizations matching query", async () => {
    const results = await service.search("acme");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Acme Corp");
  });
});
