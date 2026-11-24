import { describe, it, expect, beforeEach } from "vitest";
import { OrganizationsAuditLogService } from "./organizations-audit-log.service";
import { createMockPrismaService } from "../../test/helpers/prisma-composer-mock";
import { correlationStorage } from "../../common/middleware/correlation-id.middleware";

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

    const mockPrisma = createMockPrismaService({
      organizationAuditLog: mockOrgLogs,
      platformAuditLog: mockPlatformLogs,
      user: mockUsers,
    });

    service = new OrganizationsAuditLogService(mockPrisma as never);
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
      expect(result.metadata).toMatchObject({ role: "RECRUITER" });
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

    it("auto-captures requestId, ipAddress, userAgent from correlationStorage and stores event envelope fields", async () => {
      const result = await correlationStorage.run(
        {
          requestId: "req-xyz-789",
          ipAddress: "198.51.100.42",
          userAgent: "Mozilla/5.0 Chrome/131.0.0.0",
        },
        () =>
          service.logOrg(
            "org-1",
            "user-1",
            "INVITE_CREATED",
            "INVITATION",
            { role: "RECRUITER" },
            undefined,
            {
              targetId: "inv-1",
              targetLabel: "candidate@example.com",
              changes: [
                {
                  field: "invitedEmail",
                  before: null,
                  after: "candidate@example.com",
                },
              ],
            },
          ),
      );

      expect(result.requestId).toBe("req-xyz-789");
      expect(result.ipAddress).toBe("198.51.100.42");
      expect(result.userAgent).toBe("Mozilla/5.0 Chrome/131.0.0.0");
      expect(result.targetId).toBe("inv-1");
      expect(result.targetLabel).toBe("candidate@example.com");
      expect(result.actorEmailSnapshot).toBe("admin@test.com");
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
      expect(result.metadata).toMatchObject({ organizationName: "Acme Corp" });
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

    it("filters logs by actorId, targetId, search, and date range, with actor snapshot fallback", async () => {
      await service.logOrg(
        "org-1",
        "former-user",
        "WEBHOOK_CREATED",
        "WEBHOOK",
        { provider: "SLACK" },
        undefined,
        {
          targetId: "wh-1",
          targetLabel: "=HYPERLINK(bad)",
          actorNameSnapshot: "Former Admin",
          actorEmailSnapshot: "former@example.com",
          changes: [{ field: "provider", before: null, after: "DISCORD" }],
        },
      );

      const searchMatch = await service.findAllOrg("org-1", {
        search: "former@example.com",
        targetId: "wh-1",
      });

      expect(searchMatch.total).toBe(1);
      expect(searchMatch.data[0].actor?.name).toBe("Former Admin");
      expect(searchMatch.data[0].actor?.email).toBe("former@example.com");
      expect(searchMatch.data[0].changes).toEqual([
        { field: "provider", before: null, after: "DISCORD" },
      ]);

      const futureCutoff = new Date(Date.now() + 86_400_000).toISOString();
      const emptyFuture = await service.findAllOrg("org-1", {
        from: futureCutoff,
      });
      expect(emptyFuture.total).toBe(0);
    });
  });

  describe("exportOrgLogs", () => {
    it("exports filtered CSV with formula-injection neutralization and JSON format", async () => {
      await service.logOrg(
        "org-1",
        "user-1",
        "ORG_UPDATED",
        "ORGANIZATION",
        null,
        undefined,
        {
          targetId: "org-1",
          targetLabel: "=SUM(1,2)",
          changes: [{ field: "name", before: "Old", after: "New" }],
        },
      );

      const csv = await service.exportOrgLogs(
        "org-1",
        { action: "ORG_UPDATED" },
        "csv",
      );
      expect(csv.mimeType).toContain("text/csv");
      expect(csv.filename).toMatch(/^audit-log-\d{4}-\d{2}-\d{2}\.csv$/);
      expect(csv.content).toContain('"\'=SUM(1,2)"');

      const json = await service.exportOrgLogs(
        "org-1",
        { action: "ORG_UPDATED" },
        "json",
      );
      expect(json.mimeType).toContain("application/json");
      const parsed = JSON.parse(json.content) as Array<{ action: string }>;
      expect(parsed).toHaveLength(1);
      expect(parsed[0].action).toBe("ORG_UPDATED");
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
