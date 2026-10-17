import { describe, expect, it, beforeEach, vi } from "vitest";
import { APP_ERROR_CODES } from "@haihire/shared";
import { OrganizationsCoreService } from "./organizations-core.service";
import {
  createMockTable,
  type MockTable,
} from "../../test/helpers/prisma-composer-mock";
import type { PrismaService } from "../../prisma/prisma.service";

describe("OrganizationsCoreService", () => {
  let service: OrganizationsCoreService;

  let userTable: MockTable<Record<string, unknown>>;
  let organizationTable: MockTable<Record<string, unknown>>;
  let organizationMemberTable: MockTable<Record<string, unknown>>;

  let mockPrisma: PrismaService;

  beforeEach(() => {
    userTable = createMockTable([
      {
        id: "user-owner",
        email: "owner@acme.com",
        name: "Acme Owner",
        role: "ADMIN",
        organizationId: "org-1",
      },
      {
        id: "user-admin",
        email: "admin@acme.com",
        name: "Acme Admin",
        role: "ADMIN",
        organizationId: "org-1",
      },
      {
        id: "user-member",
        email: "member@acme.com",
        name: "Acme Member",
        role: "MEMBER",
        organizationId: "org-1",
      },
      {
        id: "user-no-org",
        email: "lonely@example.com",
        name: "No Org User",
        role: "ADMIN",
        organizationId: null,
      },
    ]);

    organizationTable = createMockTable([
      {
        id: "org-1",
        name: "Acme Corporation",
        slug: "acme",
        ownerId: "user-owner",
        createdAt: new Date().toISOString(),
      },
      {
        id: "org-2",
        name: "Beta Industry",
        slug: "beta",
        ownerId: "user-beta-owner",
        createdAt: new Date().toISOString(),
      },
    ]);

    organizationMemberTable = createMockTable([
      {
        id: "mem-1",
        organizationId: "org-1",
        userId: "user-owner",
        role: "ADMIN",
      },
      {
        id: "mem-2",
        organizationId: "org-1",
        userId: "user-member",
        role: "MEMBER",
      },
      {
        id: "mem-3",
        organizationId: "org-2",
        userId: "user-owner",
        role: "MEMBER",
      },
    ]);

    const mockOrm = {
      public: {
        User: userTable,
        Organization: organizationTable,
        OrganizationMember: organizationMemberTable,
      },
    };

    const mockDb = {
      orm: mockOrm,
    };

    mockPrisma = {
      db: mockDb,
      executeTx: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(mockDb),
      ),
      transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(mockDb),
      ),
    } as unknown as PrismaService;

    service = new OrganizationsCoreService(mockPrisma);
  });

  describe("Group 1: updateMyOrg", () => {
    it("updates organization name successfully", async () => {
      const updated = await service.updateMyOrg("user-owner", {
        name: "Acme Global Technologies",
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe("Acme Global Technologies");
      expect(updated?.slug).toBe("acme");
    });

    it("updates organization slug when new slug is unique", async () => {
      const updated = await service.updateMyOrg("user-owner", {
        slug: "acme-global",
      });

      expect(updated).toBeDefined();
      expect(updated?.slug).toBe("acme-global");
    });

    it("updates both name and slug simultaneously", async () => {
      const updated = await service.updateMyOrg("user-owner", {
        name: "Acme Enterprise",
        slug: "acme-enterprise",
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe("Acme Enterprise");
      expect(updated?.slug).toBe("acme-enterprise");
    });

    it("throws AppConflictException when requested slug already exists", async () => {
      await expect(
        service.updateMyOrg("user-owner", {
          slug: "beta",
        }),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.ORG_SLUG_ALREADY_EXISTS,
      });
    });

    it("throws AppNotFoundException when user is not associated with an organization", async () => {
      await expect(
        service.updateMyOrg("user-no-org", {
          name: "Phantom Org",
        }),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.ORG_USER_NO_ORG,
      });
    });

    it("throws AppNotFoundException when user does not exist", async () => {
      await expect(
        service.updateMyOrg("non-existent-user", {
          name: "Ghost Org",
        }),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.ORG_USER_NO_ORG,
      });
    });

    it("throws AppForbiddenException when requester role is MEMBER", async () => {
      await expect(
        service.updateMyOrg("user-member", {
          name: "Unauthorized Update",
        }),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
      });
    });

    it("throws AppNotFoundException when organization record cannot be found", async () => {
      userTable.store.push({
        id: "user-orphan-org",
        role: "ADMIN",
        organizationId: "non-existent-org",
      });

      await expect(
        service.updateMyOrg("user-orphan-org", {
          name: "Missing Org",
        }),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.ORG_NOT_FOUND,
      });
    });
  });

  describe("Group 2: getPublicOrg", () => {
    it("returns public organization details by valid slug", async () => {
      const org = await service.getPublicOrg("acme");
      expect(org).toBeDefined();
      expect(org.id).toBe("org-1");
      expect(org.name).toBe("Acme Corporation");
      expect(org.slug).toBe("acme");
    });

    it("throws AppNotFoundException when slug does not exist", async () => {
      await expect(
        service.getPublicOrg("non-existent-slug"),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.ORG_NOT_FOUND,
      });
    });

    it("finds organization case-sensitively or by exact slug match", async () => {
      const org = await service.getPublicOrg("beta");
      expect(org.name).toBe("Beta Industry");
      expect(org.id).toBe("org-2");
    });
  });

  describe("Group 3: deleteMyOrg", () => {
    it("throws AppForbiddenException when requester is not the organization owner", async () => {
      await expect(service.deleteMyOrg("user-admin")).rejects.toMatchObject({
        code: APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
      });
    });

    it("throws AppForbiddenException when requester has MEMBER role", async () => {
      await expect(service.deleteMyOrg("user-member")).rejects.toMatchObject({
        code: APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
      });
    });

    it("throws AppNotFoundException when user is not associated with an org", async () => {
      await expect(service.deleteMyOrg("user-no-org")).rejects.toMatchObject({
        code: APP_ERROR_CODES.ORG_USER_NO_ORG,
      });
    });

    it("atomically unlinks users, deletes memberships, and deletes organization on owner request", async () => {
      const res = await service.deleteMyOrg("user-owner");
      expect(res.success).toBe(true);

      const remainingOrg = organizationTable.store.find(
        (o) => o.id === "org-1",
      );
      expect(remainingOrg).toBeUndefined();

      const remainingMembers = organizationMemberTable.store.filter(
        (m) => m.organizationId === "org-1",
      );
      expect(remainingMembers).toHaveLength(0);

      const ownerUser = userTable.store.find((u) => u.id === "user-owner");
      expect(ownerUser?.organizationId).toBeNull();
    });
  });

  describe("Group 4: switchOrg", () => {
    it("throws AppForbiddenException when user has no membership in target organization", async () => {
      await expect(
        service.switchOrg("user-member", "org-2"),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
      });
    });

    it("throws AppNotFoundException when target organization does not exist", async () => {
      await expect(
        service.switchOrg("user-owner", "non-existent-org"),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.ORG_NOT_FOUND,
      });
    });

    it("throws AppNotFoundException when user does not exist", async () => {
      await expect(
        service.switchOrg("ghost-user", "org-1"),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.RESOURCE_NOT_FOUND,
      });
    });

    it("switches user organization context successfully when membership exists", async () => {
      const res = await service.switchOrg("user-owner", "org-2");
      expect(res.success).toBe(true);
      expect(res.organization.id).toBe("org-2");
      const updatedUser = userTable.store.find((u) => u.id === "user-owner");
      expect(updatedUser?.organizationId).toBe("org-2");
    });
  });
});
