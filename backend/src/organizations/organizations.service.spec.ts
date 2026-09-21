import { describe, it, expect, beforeEach, vi } from "vitest";
import { OrganizationsService } from "./organizations.service";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";

describe("OrganizationsService - Multi-Tenant Organization Management", () => {
  let service: OrganizationsService;
  let mockPrismaService: unknown;

  interface MockOrg {
    id: string;
    name: string;
    slug: string;
    ownerId?: string;
    createdAt?: Date;
    [key: string]: unknown;
  }
  interface MockUser {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId: string | null;
    [key: string]: unknown;
  }
  interface MockLink {
    id: string;
    token: string;
    organizationId: string;
    role: string;
    expiresAt: Date | null;
    maxUses: number | null;
    usesCount: number;
    status: string;
    createdById: string;
    createdAt?: Date;
  }
  interface MockMember {
    id: string;
    organizationId: string;
    userId: string;
    role: string;
    createdAt: Date;
  }

  let mockOrgs: MockOrg[] = [];
  let mockUsers: MockUser[] = [];
  let mockLinks: MockLink[] = [];

  beforeEach(() => {
    mockOrgs = [
      {
        id: "org-1",
        name: "Acme Corp",
        slug: "acme-corp",
        ownerId: "usr-1",
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

    let mockMembers: MockMember[] = [
      {
        id: "mem-2",
        organizationId: "org-1",
        userId: "usr-2",
        role: "ADMIN",
        createdAt: new Date(),
      },
      {
        id: "mem-3",
        organizationId: "org-1",
        userId: "usr-3",
        role: "MEMBER",
        createdAt: new Date(),
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
                        id: { eq: (target: string) => o.id === target },
                        slug: {
                          eq: (target: string) =>
                            o.slug.toLowerCase() === target.toLowerCase(),
                        },
                      };
                      return predicateFn(mockRecord);
                    });

                    if (!match) return null;
                    if (fields.length > 0) {
                      const proj: Record<string, unknown> = {};
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
                      const proj: Record<string, unknown> = {};
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
                all: vi.fn().mockImplementation(async () => {
                  return mockUsers.map((u) => ({ ...u }));
                }),
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
            OrganizationMember: {
              upsert: vi.fn().mockImplementation(async ({ create, update, conflictOn }) => {
                const existingIndex = mockMembers.findIndex((m) => m.id === conflictOn?.id);
                if (existingIndex >= 0) {
                  Object.assign(mockMembers[existingIndex], update);
                  return mockMembers[existingIndex];
                }
                const newMem = {
                  ...create,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
                mockMembers.push(newMem);
                return newMem;
              }),
              select: vi.fn().mockImplementation((..._fields: string[]) => ({
                where: vi.fn().mockImplementation((predicateFn) => ({
                  first: vi.fn().mockImplementation(async () => {
                    const match = mockMembers.find((m) => {
                      const mockRecord = {
                        id: { eq: (target: string) => m.id === target },
                        userId: { eq: (target: string) => m.userId === target },
                        organizationId: { eq: (target: string) => m.organizationId === target },
                      };
                      return predicateFn(mockRecord);
                    });
                    return match ? { ...match } : null;
                  }),
                  all: vi.fn().mockImplementation(async () => {
                    return mockMembers
                      .filter((m) => {
                        const mockRecord = {
                          userId: { eq: (target: string) => m.userId === target },
                          organizationId: { eq: (target: string) => m.organizationId === target },
                        };
                        return predicateFn(mockRecord);
                      })
                      .map((m) => ({ ...m }));
                  }),
                })),
                all: vi.fn().mockImplementation(async () => {
                  return mockMembers.map((m) => ({ ...m }));
                }),
              })),
              where: vi.fn().mockImplementation((predicateFn) => ({
                update: vi.fn().mockImplementation(async (updates) => {
                  const target = mockMembers.find((m) => {
                    const mockRecord = {
                      id: { eq: (target: string) => m.id === target },
                    };
                    return predicateFn(mockRecord);
                  });
                  if (target) {
                    Object.assign(target, updates);
                    return { ...target };
                  }
                  return null;
                }),
                delete: vi.fn().mockImplementation(async () => {
                  const toDelete = mockMembers.filter((m) => {
                    const mockRecord = {
                      id: { eq: (target: string) => m.id === target },
                      organizationId: { eq: (target: string) => m.organizationId === target },
                    };
                    return predicateFn(mockRecord);
                  });
                  mockMembers = mockMembers.filter((m) => !toDelete.includes(m));
                  return toDelete;
                }),
              })),
            },
            InviteLink: {
              upsert: vi.fn().mockImplementation(async ({ create }) => {
                mockLinks.push({ ...create, createdAt: new Date(), updatedAt: new Date() });
                return create;
              }),
              select: vi.fn().mockImplementation((..._fields: string[]) => ({
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

    service = new OrganizationsService(mockPrismaService as never);
  });

  describe("Organization Core", () => {
    it("1. Should successfully create a new organization and link the user", async () => {
      const result = await service.create("usr-1", {
        name: "Stark Industries",
        slug: "stark-industries",
      });

      expect(result.organization.name).toBe("Stark Industries");
      expect(result.organization.slug).toBe("stark-industries");

      const user = mockUsers.find((u) => u.id === "usr-1");
      expect(user?.organizationId).toBe(result.organization.id);
    });

    it("2. Should throw ConflictException when creating organization with existing slug", async () => {
      await expect(
        service.create("usr-1", {
          name: "Acme Duplicate",
          slug: "acme-corp",
        }),
      ).rejects.toThrow(ConflictException);
    });

    it("3. Should successfully join an organization with valid invite link token or url", async () => {
      const link = await service.createInviteLink("usr-2", { role: "MEMBER" });
      const result = await service.join("usr-1", {
        inviteCodeOrSlug: `http://localhost:3000/join/${link.token}`,
      });

      expect(result.organization.name).toBe("Acme Corp");
      const user = mockUsers.find((u) => u.id === "usr-1");
      expect(user?.organizationId).toBe("org-1");
    });

    it("4. Should throw NotFoundException when invite link is invalid", async () => {
      await expect(
        service.join("usr-1", {
          inviteCodeOrSlug: "INVALID-TOKEN",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("5. Should reject joining by slug or invalid link (only active invite link allowed)", async () => {
      await expect(
        service.join("usr-1", {
          inviteCodeOrSlug: "acme-corp",
        }),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.join("usr-1", {
          inviteCodeOrSlug: "invalid-code-or-token",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("6. Should get current organization of user (getMyOrg)", async () => {
      const org = await service.getMyOrg("usr-2");
      expect(org).toBeDefined();
      expect(org?.name).toBe("Acme Corp");

      const noOrg = await service.getMyOrg("usr-1");
      expect(noOrg).toBeNull();
    });

    it("7. Should get members of organization including owner", async () => {
      const members = await service.getMembers("usr-2");
      expect(members.length).toBe(3);
      expect(members.some((m) => m.name === "HR Lead" && m.isOwner)).toBe(true);
      expect(members.some((m) => m.name === "Admin")).toBe(true);
      expect(members.some((m) => m.name === "Member User")).toBe(true);
    });

    it("7b. Should get all organizations for switching (getMyOrgs)", async () => {
      const orgs = await service.getMyOrgs("usr-2");
      expect(orgs.length).toBeGreaterThanOrEqual(1);
      expect(orgs.some((o) => o.name === "Acme Corp")).toBe(true);
    });

    it("7c. Should switch organization for user", async () => {
      const result = await service.switchOrg("usr-1", "org-1");
      expect(result.success).toBe(true);
      expect(result.organization.name).toBe("Acme Corp");

      const user = mockUsers.find((u) => u.id === "usr-1");
      expect(user?.organizationId).toBe("org-1");
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
      expect(link.status).toBe("ACTIVE");
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
      expect(user?.organizationId).toBe("org-1");
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

  describe("Member Role & Removal Management", () => {
    it("13. Should allow admin/owner to update member role", async () => {
      // usr-2 is ADMIN in org-1, updating usr-3 from MEMBER to ADMIN
      const result = await service.updateMemberRole("usr-2", "usr-3", "ADMIN");
      expect(result.success).toBe(true);
      expect(result.role).toBe("ADMIN");

      const usr3 = mockUsers.find((u) => u.id === "usr-3");
      expect(usr3?.role).toBe("ADMIN");
    });

    it("14. Should REJECT updating organization owner's role", async () => {
      // usr-1 is owner of org-1
      await expect(
        service.updateMemberRole("usr-2", "usr-1", "MEMBER"),
      ).rejects.toThrow(BadRequestException);
    });

    it("15. Should allow admin/owner to remove member from organization", async () => {
      // usr-2 is ADMIN in org-1, removing usr-3
      const result = await service.removeMember("usr-2", "usr-3");
      expect(result.success).toBe(true);

      const usr3 = mockUsers.find((u) => u.id === "usr-3");
      expect(usr3?.organizationId).toBeNull();
      expect(usr3?.role).toBe("MEMBER");
    });

    it("16. Should REJECT removing organization owner or self", async () => {
      // Cannot remove self
      await expect(service.removeMember("usr-2", "usr-2")).rejects.toThrow(
        BadRequestException,
      );

      // Cannot remove org owner
      await expect(service.removeMember("usr-2", "usr-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("17. Should allow switching between multiple organizations without losing membership", async () => {
      // 1. usr-1 owns org-1
      // 2. Add org-2 owned by usr-2
      mockOrgs.push({
        id: "org-2",
        name: "Org B",
        slug: "org-b",
        ownerId: "usr-2",
        createdAt: new Date(),
      });

      // 3. Create invite link for org-2
      mockLinks.push({
        id: "link-org-2",
        token: "token-for-org-2",
        organizationId: "org-2",
        role: "MEMBER",
        status: "active",
        expiresAt: null,
        maxUses: null,
        usesCount: 0,
        createdById: "usr-2",
      });

      // 4. usr-1 is in org-1. usr-1 accepts invite to org-2
      const joinRes = await service.joinByToken("usr-1", "token-for-org-2");
      expect(joinRes.success).toBe(true);

      const usr1 = mockUsers.find((u) => u.id === "usr-1");
      expect(usr1?.organizationId).toBe("org-2");

      // 5. getMyOrgs for usr-1 must include BOTH org-1 and org-2
      let orgs = await service.getMyOrgs("usr-1");
      expect(orgs.map((o) => o.id)).toContain("org-1");
      expect(orgs.map((o) => o.id)).toContain("org-2");

      // 6. usr-1 switches back to org-1
      const switchRes = await service.switchOrg("usr-1", "org-1");
      expect(switchRes.success).toBe(true);
      expect(usr1?.organizationId).toBe("org-1");

      // 7. Critical: org-2 must NOT disappear from getMyOrgs!
      orgs = await service.getMyOrgs("usr-1");
      expect(orgs.map((o) => o.id)).toContain("org-1");
      expect(orgs.map((o) => o.id)).toContain("org-2");

      // 8. usr-1 can switch back to org-2 seamlessly
      const switchBack = await service.switchOrg("usr-1", "org-2");
      expect(switchBack.success).toBe(true);
      expect(usr1?.organizationId).toBe("org-2");
    });
  });
});

