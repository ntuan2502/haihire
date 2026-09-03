import { describe, it, expect, beforeEach, vi } from "vitest";
import { OrganizationsService } from "./organizations.service";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";

describe("OrganizationsService - Multi-Tenant Organization Management", () => {
  let service: OrganizationsService;
  let mockPrismaService: any;

  let mockOrgs: any[] = [];
  let mockUsers: any[] = [];
  let mockLinks: any[] = [];

  beforeEach(() => {
    mockOrgs = [
      {
        id: "org-1",
        name: "Acme Corp",
        slug: "acme-corp",
        inviteCode: "ORG-ACME99",
        createdAt: new Date(),
      },
    ];

    mockUsers = [
      {
        id: "usr-1",
        email: "hr@tun.io.vn",
        name: "HR Lead",
        role: "ADMIN",
        organizationId: null,
      },
      {
        id: "usr-2",
        email: "admin@tun.io.vn",
        name: "Admin",
        role: "ADMIN",
        organizationId: "org-1",
      },
      {
        id: "usr-3",
        email: "member@tun.io.vn",
        name: "Member User",
        role: "MEMBER",
        organizationId: "org-1",
      },
    ];

    mockLinks = [];

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
                        id: { eq: (target: string) => o.id === target },
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
                  id: `org-${mockOrgs.length + 1}`,
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
                        id: { eq: (target: string) => u.id === target },
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
                  all: vi.fn().mockImplementation(async () => {
                    return mockUsers
                      .filter((u) => {
                        const mockRecord = {
                          organizationId: { eq: (target: string) => u.organizationId === target },
                        };
                        return predicateFn(mockRecord);
                      })
                      .map((u) => ({ ...u }));
                  }),
                })),
              })),
              where: vi.fn().mockImplementation((predicateFn) => ({
                update: vi.fn().mockImplementation(async (updates) => {
                  const targetUser = mockUsers.find((u) => {
                    const mockRecord = {
                      id: { eq: (target: string) => u.id === target },
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
            InviteLink: {
              upsert: vi.fn().mockImplementation(async ({ create }) => {
                mockLinks.push({ ...create, createdAt: new Date(), updatedAt: new Date() });
                return create;
              }),
              select: vi.fn().mockImplementation((...fields: string[]) => ({
                where: vi.fn().mockImplementation((predicateFn) => ({
                  first: vi.fn().mockImplementation(async () => {
                    const match = mockLinks.find((l) => {
                      const mockRecord = {
                        token: { eq: (target: string) => l.token === target },
                        id: { eq: (target: string) => l.id === target },
                      };
                      return predicateFn(mockRecord);
                    });
                    return match ? { ...match } : null;
                  }),
                  all: vi.fn().mockImplementation(async () => {
                    return mockLinks
                      .filter((l) => {
                        const mockRecord = {
                          organizationId: { eq: (target: string) => l.organizationId === target },
                        };
                        return predicateFn(mockRecord);
                      })
                      .map((l) => ({ ...l }));
                  }),
                })),
              })),
              where: vi.fn().mockImplementation((predicateFn) => ({
                update: vi.fn().mockImplementation(async (updates) => {
                  const target = mockLinks.find((l) => {
                    const mockRecord = {
                      id: { eq: (target: string) => l.id === target },
                    };
                    return predicateFn(mockRecord);
                  });
                  if (target) {
                    Object.assign(target, updates);
                    return { ...target };
                  }
                  return null;
                }),
              })),
            },
          },
        },
      },
    };

    service = new OrganizationsService(mockPrismaService);
  });

  describe("Organization Core", () => {
    it("1. Should successfully create a new organization and link the user", async () => {
      const result = await service.create("usr-1", {
        name: "Stark Industries",
        slug: "stark-industries",
      });

      expect(result.organization.name).toBe("Stark Industries");
      expect(result.organization.slug).toBe("stark-industries");
      expect(result.organization.inviteCode).toMatch(/^ORG-[A-Z0-9]{6}$/);

      const user = mockUsers.find((u) => u.id === "usr-1");
      expect(user.organizationId).toBe(result.organization.id);
    });

    it("2. Should throw ConflictException when creating organization with existing slug", async () => {
      await expect(
        service.create("usr-1", {
          name: "Acme Duplicate",
          slug: "acme-corp",
        }),
      ).rejects.toThrow(ConflictException);
    });

    it("3. Should successfully join an organization with valid invite code", async () => {
      const result = await service.join("usr-1", {
        inviteCodeOrSlug: "ORG-ACME99",
      });

      expect(result.organization.name).toBe("Acme Corp");
      const user = mockUsers.find((u) => u.id === "usr-1");
      expect(user.organizationId).toBe("org-1");
    });

    it("4. Should throw NotFoundException when invite code or slug is invalid", async () => {
      await expect(
        service.join("usr-1", {
          inviteCodeOrSlug: "INVALID-CODE",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("5. Should search organizations matching query", async () => {
      const results = await service.search("acme");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Acme Corp");
    });

    it("6. Should get current organization of user (getMyOrg)", async () => {
      const org = await service.getMyOrg("usr-2");
      expect(org).toBeDefined();
      expect(org?.name).toBe("Acme Corp");

      const noOrg = await service.getMyOrg("usr-1");
      expect(noOrg).toBeNull();
    });

    it("7. Should get members of organization", async () => {
      const members = await service.getMembers("usr-2");
      expect(members.length).toBe(2);
      expect(members.some((m) => m.name === "Admin")).toBe(true);
      expect(members.some((m) => m.name === "Member User")).toBe(true);
    });
  });

  describe("Invite Links Management", () => {
    it("8. Should create an invite link with 64-character token", async () => {
      const link = await service.createInviteLink("usr-2", {
        role: "Member",
        expiresIn: "7 days",
        maxUses: "5",
      });

      expect(link).toBeDefined();
      expect(link.token).toHaveLength(64);
      expect(link.organizationId).toBe("org-1");
      expect(link.status).toBe("active");
      expect(link.maxUses).toBe(5);
    });

    it("9. Should list active invite links and filter revoked links", async () => {
      const link = await service.createInviteLink("usr-2", {
        role: "Member",
        expiresIn: "7 days",
      });

      let links = await service.getInviteLinks("usr-2");
      expect(links.length).toBe(1);
      expect(links[0].token).toBe(link.token);

      await service.revokeInviteLink("usr-2", link.id);
      links = await service.getInviteLinks("usr-2");
      expect(links.length).toBe(0);
    });

    it("10. Should allow external user to get public invite preview", async () => {
      const link = await service.createInviteLink("usr-2", {
        role: "Member",
      });

      const preview = await service.getPublicInvite(link.token);
      expect(preview.valid).toBe(true);
      expect(preview.organization?.name).toBe("Acme Corp");
    });

    it("11. Should allow unassociated user to join organization via invite token", async () => {
      const link = await service.createInviteLink("usr-2", {
        role: "Member",
      });

      // usr-1 has organizationId: null
      const joinResult = await service.joinByToken("usr-1", link.token);
      expect(joinResult.success).toBe(true);

      const user = mockUsers.find((u) => u.id === "usr-1");
      expect(user.organizationId).toBe("org-1");
    });

    it("12. Should REJECT when user is already a member of the organization", async () => {
      const link = await service.createInviteLink("usr-2", {
        role: "Member",
      });

      // usr-2 is ALREADY in org-1!
      await expect(service.joinByToken("usr-2", link.token)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
