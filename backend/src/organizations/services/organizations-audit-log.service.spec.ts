import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrganizationsAuditLogService } from "./organizations-audit-log.service";
import type { PrismaService } from "../../prisma/prisma.service";

describe("OrganizationsAuditLogService", () => {
  let service: OrganizationsAuditLogService;
  let mockOrgLogs: Array<{
    id: string;
    organizationId: string;
    actorId: string | null;
    action: string;
    resource: string;
    metadata: string | null;
    createdAt: string;
  }>;
  let mockPlatformLogs: Array<{
    id: string;
    organizationId: string;
    actorId: string;
    action: string;
    resource: string;
    metadata: string | null;
    createdAt: string;
  }>;
  let mockUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl: string | null;
  }>;

  beforeEach(() => {
    mockOrgLogs = [];
    mockPlatformLogs = [];
    mockUsers = [
      {
        id: "user-1",
        name: "Admin User",
        email: "admin@test.com",
        role: "ADMIN",
        avatarUrl: null,
      },
    ];

    const mockPrisma = {
      db: {
        orm: {
          public: {
            OrganizationAuditLog: {
              create: vi
                .fn()
                .mockImplementation(
                  (data: {
                    id: string;
                    organizationId: string;
                    actorId: string | null;
                    action: string;
                    resource: string;
                    metadata: string | null;
                    createdAt: string;
                  }) => {
                    mockOrgLogs.push(data);
                    return Promise.resolve(data);
                  },
                ),
              select: vi.fn().mockImplementation(() => {
                let filtered = [...mockOrgLogs];
                const chain = {
                  where: (predicateFn: (l: unknown) => boolean) => {
                    const probe = {
                      organizationId: {
                        eq: (val: string) => {
                          filtered = filtered.filter(
                            (l) => l.organizationId === val,
                          );
                          return true;
                        },
                      },
                      action: {
                        eq: (val: string) => {
                          filtered = filtered.filter((l) => l.action === val);
                          return true;
                        },
                      },
                      resource: {
                        eq: (val: string) => {
                          filtered = filtered.filter((l) => l.resource === val);
                          return true;
                        },
                      },
                    };
                    predicateFn(probe);
                    return chain;
                  },
                  all: vi
                    .fn()
                    .mockImplementation(() => Promise.resolve(filtered)),
                };
                return chain;
              }),
            },
            PlatformAuditLog: {
              create: vi
                .fn()
                .mockImplementation(
                  (data: {
                    id: string;
                    organizationId: string;
                    actorId: string;
                    action: string;
                    resource: string;
                    metadata: string | null;
                    createdAt: string;
                  }) => {
                    mockPlatformLogs.push(data);
                    return Promise.resolve(data);
                  },
                ),
              select: vi.fn().mockImplementation(() => {
                let filtered = [...mockPlatformLogs];
                const chain = {
                  where: (predicateFn: (l: unknown) => boolean) => {
                    const probe = {
                      organizationId: {
                        eq: (val: string) => {
                          filtered = filtered.filter(
                            (l) => l.organizationId === val,
                          );
                          return true;
                        },
                      },
                      action: {
                        eq: (val: string) => {
                          filtered = filtered.filter((l) => l.action === val);
                          return true;
                        },
                      },
                      resource: {
                        eq: (val: string) => {
                          filtered = filtered.filter((l) => l.resource === val);
                          return true;
                        },
                      },
                    };
                    predicateFn(probe);
                    return chain;
                  },
                  all: vi
                    .fn()
                    .mockImplementation(() => Promise.resolve(filtered)),
                };
                return chain;
              }),
            },
            User: {
              select: vi.fn().mockImplementation(() => ({
                where: (predicateFn: (u: unknown) => boolean) => {
                  let ids: string[] = [];
                  const probe = {
                    id: {
                      in: (val: string[]) => {
                        ids = val;
                        return true;
                      },
                    },
                  };
                  predicateFn(probe);
                  return {
                    all: vi
                      .fn()
                      .mockImplementation(() =>
                        Promise.resolve(
                          mockUsers.filter((u) => ids.includes(u.id)),
                        ),
                      ),
                  };
                },
              })),
            },
          },
        },
      },
    } as unknown as PrismaService;

    service = new OrganizationsAuditLogService(mockPrisma);
  });

  describe("logOrg", () => {
    it("creates an organization audit log record with serialized metadata", async () => {
      const result = await service.logOrg(
        "org-1",
        "user-1",
        "ROLE_PERMISSIONS_UPDATED",
        "ROLE_PERMISSIONS",
        { role: "RECRUITER", count: 2 },
      );

      expect(result).toBeDefined();
      expect(result.organizationId).toBe("org-1");
      expect(result.actorId).toBe("user-1");
      expect(result.action).toBe("ROLE_PERMISSIONS_UPDATED");
      expect(result.resource).toBe("ROLE_PERMISSIONS");
      expect(result.metadata).toContain('"role":"RECRUITER"');
      expect(mockOrgLogs).toHaveLength(1);
    });

    it("handles null actorId and null metadata gracefully", async () => {
      const result = await service.logOrg(
        "org-1",
        null,
        "SYSTEM_ACTION",
        "SYSTEM",
      );

      expect(result.actorId).toBeNull();
      expect(result.metadata).toBeNull();
      expect(mockOrgLogs).toHaveLength(1);
    });
  });

  describe("logPlatform", () => {
    it("creates a platform audit log record for platform-level actions", async () => {
      const result = await service.logPlatform(
        "org-deleted-id",
        "user-admin",
        "ORG_DELETED",
        "ORGANIZATION",
        { organizationName: "Acme Corp" },
      );

      expect(result).toBeDefined();
      expect(result.organizationId).toBe("org-deleted-id");
      expect(result.actorId).toBe("user-admin");
      expect(result.action).toBe("ORG_DELETED");
      expect(result.metadata).toContain('"organizationName":"Acme Corp"');
      expect(mockPlatformLogs).toHaveLength(1);
    });
  });

  describe("findAllOrg", () => {
    beforeEach(async () => {
      await service.logOrg(
        "org-1",
        "user-1",
        "ROLE_PERMISSIONS_UPDATED",
        "ROLE_PERMISSIONS",
        {
          change: 1,
        },
      );
      await service.logOrg("org-1", "user-1", "MEMBER_ROLE_CHANGED", "MEMBER", {
        role: "RECRUITER",
      });
      await service.logOrg("org-2", "user-2", "OTHER_ACTION", "OTHER", null);
    });

    it("retrieves organization logs scoped to organizationId and enriches with actor data", async () => {
      const result = await service.findAllOrg("org-1");

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].actor).toBeDefined();
      expect(result.data[0].actor?.email).toBe("admin@test.com");
      expect(result.data[0].metadata).toEqual(expect.any(Object));
    });

    it("filters logs by action and resource when provided", async () => {
      const result = await service.findAllOrg("org-1", {
        action: "MEMBER_ROLE_CHANGED",
        resource: "MEMBER",
      });

      expect(result.total).toBe(1);
      expect(result.data[0].action).toBe("MEMBER_ROLE_CHANGED");
    });
  });

  describe("findAllPlatform", () => {
    it("retrieves platform logs with filtering and pagination", async () => {
      await service.logPlatform(
        "org-1",
        "user-1",
        "ORG_DELETED",
        "ORGANIZATION",
        { name: "Org 1" },
      );
      await service.logPlatform(
        "org-2",
        "user-2",
        "ORG_DELETED",
        "ORGANIZATION",
        { name: "Org 2" },
      );

      const result = await service.findAllPlatform({ organizationId: "org-1" });

      expect(result.total).toBe(1);
      expect(result.data[0].organizationId).toBe("org-1");
      expect(result.data[0].metadata).toEqual({ name: "Org 1" });
    });
  });
});
