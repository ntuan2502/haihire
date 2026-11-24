import { describe, expect, it, vi } from "vitest";
import { OrganizationsMembersService } from "./organizations-members.service";
import type { PrismaService } from "../../prisma/prisma.service";
import { APP_ERROR_CODES } from "@haihire/shared";

describe("OrganizationsMembersService concurrency", () => {
  it("does not remove a member if ownership changed before the organization lock", async () => {
    const deleteMany = vi.fn();
    const prisma = {
      user: {
        findFirst: vi.fn().mockResolvedValue({
          id: "admin",
          role: "ADMIN",
          organizationId: "org",
        }),
      },
      organization: {
        findFirst: vi
          .fn()
          .mockResolvedValue({ id: "org", ownerId: "old-owner" }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      organizationMember: { deleteMany },
    };
    const service = new OrganizationsMembersService(
      prisma as unknown as PrismaService,
    );
    await expect(
      service.removeMember("admin", "new-owner"),
    ).rejects.toMatchObject({ code: APP_ERROR_CODES.ORG_FORBIDDEN_ACTION });
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("backfills each membership once across two concurrent startup snapshots", async () => {
    const members = new Map<string, Record<string, unknown>>();
    const prisma = {
      organization: {
        findMany: vi.fn().mockResolvedValue([{ id: "org", ownerId: "owner" }]),
      },
      user: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { id: "user", organizationId: "org", role: "MEMBER" },
          ]),
      },
      organizationMember: {
        findMany: vi.fn().mockResolvedValue([]),
        upsert: vi.fn(
          async (args: {
            where: {
              organizationId_userId?: {
                organizationId: string;
                userId: string;
              };
            };
            create: Record<string, unknown>;
          }) => {
            const pair = args.where.organizationId_userId;
            if (!pair)
              throw new Error(
                "Backfill must resolve conflicts on the membership pair",
              );
            const key = `${pair.organizationId}:${pair.userId}`;
            if (!members.has(key)) members.set(key, args.create);
            return members.get(key);
          },
        ),
      },
    };
    const service = new OrganizationsMembersService(
      prisma as unknown as PrismaService,
    );
    await Promise.all([
      service.initializeMemberships(),
      service.initializeMemberships(),
    ]);
    expect([...members.keys()].sort()).toEqual(["org:owner", "org:user"]);
    expect(prisma.organizationMember.upsert).toHaveBeenCalledTimes(4);
  });

  it("blocks non-ADMIN with custom org:manage_members from promoting a member to ADMIN or removing an ADMIN", async () => {
    const deleteMany = vi.fn();
    const update = vi.fn();
    const prisma = {
      user: {
        findFirst: vi.fn().mockResolvedValue({
          id: "recruiter-1",
          role: "RECRUITER",
          organizationId: "org",
        }),
      },
      organization: {
        findFirst: vi.fn().mockResolvedValue({ id: "org", ownerId: "owner-1" }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      organizationRolePermission: {
        findFirst: vi.fn().mockResolvedValue({ granted: true }),
      },
      organizationMember: {
        findFirst: vi
          .fn()
          .mockImplementation(async (args: { where?: { userId?: string } }) => {
            if (args?.where?.userId === "recruiter-1") {
              return { id: "m-rec", role: "RECRUITER" };
            }
            if (args?.where?.userId === "target-admin") {
              return { id: "m-adm", role: "ADMIN" };
            }
            return { id: "m-mem", role: "MEMBER" };
          }),
        findMany: vi.fn().mockResolvedValue([
          { id: "m-mem", userId: "target-member", role: "MEMBER" },
          { id: "m-adm", userId: "target-admin", role: "ADMIN" },
        ]),
        update,
        deleteMany,
      },
    };
    const service = new OrganizationsMembersService(
      prisma as unknown as PrismaService,
    );

    await expect(
      service.updateMemberRole(
        "recruiter-1",
        "target-member",
        "ADMIN" as never,
        "org",
      ),
    ).rejects.toMatchObject({ code: APP_ERROR_CODES.ORG_FORBIDDEN_ACTION });
    expect(update).not.toHaveBeenCalled();

    await expect(
      service.updateMemberRole(
        "recruiter-1",
        "target-admin",
        "MEMBER" as never,
        "org",
      ),
    ).rejects.toMatchObject({ code: APP_ERROR_CODES.ORG_FORBIDDEN_ACTION });
    expect(update).not.toHaveBeenCalled();

    await expect(
      service.removeMember("recruiter-1", "target-admin", "org"),
    ).rejects.toMatchObject({ code: APP_ERROR_CODES.ORG_FORBIDDEN_ACTION });
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("uses OrganizationMember.createdAt as each member's join date and sorts non-owners by membership join time", async () => {
    const olderJoin = new Date("2026-02-01T00:00:00Z");
    const newerJoin = new Date("2026-03-01T00:00:00Z");

    const prisma = {
      organization: {
        findFirst: vi.fn().mockResolvedValue({
          id: "org-1",
          ownerId: "u-owner",
          nameDisplayOrder: "FIRST_LAST",
        }),
      },
      organizationMember: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "mem-owner",
            userId: "u-owner",
            role: "ADMIN",
            createdAt: new Date("2026-01-01T00:00:00Z"),
          },
          {
            id: "mem-newer-user-older-join",
            userId: "u-b",
            role: "RECRUITER",
            createdAt: olderJoin,
          },
          {
            id: "mem-older-user-newer-join",
            userId: "u-a",
            role: "MEMBER",
            createdAt: newerJoin,
          },
        ]),
      },
      user: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "u-owner",
            firstName: "Owner",
            lastName: "One",
            email: "owner@haihire.vn",
            avatarUrl: null,
            createdAt: new Date("2025-12-01T00:00:00Z"),
          },
          {
            id: "u-a",
            firstName: "Early",
            lastName: "Signup",
            email: "early@haihire.vn",
            avatarUrl: null,
            // Signed up earlier globally, but joined org-1 later
            createdAt: new Date("2025-01-01T00:00:00Z"),
          },
          {
            id: "u-b",
            firstName: "Joined",
            lastName: "First",
            email: "first@haihire.vn",
            avatarUrl: null,
            // Signed up later globally, but joined org-1 first
            createdAt: new Date("2026-01-15T00:00:00Z"),
          },
        ]),
      },
    };

    const service = new OrganizationsMembersService(
      prisma as unknown as PrismaService,
    );

    const members = await service.getMembers("u-owner", "org-1");

    expect(members.map((m) => m.id)).toEqual(["u-owner", "u-b", "u-a"]);
    expect(members[1].createdAt).toEqual(olderJoin);
    expect(members[2].createdAt).toEqual(newerJoin);
  });

  describe("leaveOrganization", () => {
    it("allows non-owner member to leave, cleans preferences, logs MEMBER_LEFT audit, and emits SSE events", async () => {
      const deleteMembership = vi.fn().mockResolvedValue({ count: 1 });
      const deleteNotifPrefs = vi.fn().mockResolvedValue({ count: 1 });
      const emit = vi.fn();
      const logOrg = vi.fn().mockResolvedValue(undefined);

      const prisma = {
        user: {
          findFirst: vi
            .fn()
            .mockResolvedValue({ id: "mem-1", email: "m@haihire.vn" }),
        },
        organization: {
          findFirst: vi.fn().mockResolvedValue({
            id: "org-1",
            ownerId: "owner-1",
            name: "Acme Corp",
          }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        organizationMember: {
          deleteMany: deleteMembership,
        },
        notificationPreference: {
          deleteMany: deleteNotifPrefs,
        },
      };

      const service = new OrganizationsMembersService(
        prisma as unknown as PrismaService,
        { emit } as never,
        { logOrg } as never,
      );

      const res = await service.leaveOrganization("mem-1", "org-1");

      expect(res).toEqual({
        success: true,
        organizationId: "org-1",
        organizationName: "Acme Corp",
        message: "Successfully left the organization",
      });
      expect(deleteMembership).toHaveBeenCalledWith({
        where: { organizationId: "org-1", userId: "mem-1" },
      });
      expect(deleteNotifPrefs).toHaveBeenCalledWith({
        where: { organizationId: "org-1", userId: "mem-1" },
      });
      expect(logOrg).toHaveBeenCalledWith(
        "org-1",
        "mem-1",
        "MEMBER_LEFT",
        "MEMBER",
        { memberId: "mem-1" },
        expect.anything(),
        expect.objectContaining({
          targetId: "mem-1",
          changes: [
            expect.objectContaining({
              field: "membership",
              after: null,
            }),
          ],
        }),
      );
      expect(emit).toHaveBeenCalledWith({
        type: "MEMBERS_CHANGED",
        organizationId: "org-1",
        data: { memberId: "mem-1" },
      });
      expect(emit).toHaveBeenCalledWith({
        type: "AUDIT_LOGS_CHANGED",
        organizationId: "org-1",
      });
    });

    it("blocks organization owner from leaving with ORG_OWNER_CANNOT_LEAVE", async () => {
      const deleteMembership = vi.fn();
      const prisma = {
        user: {
          findFirst: vi.fn().mockResolvedValue({ id: "owner-1" }),
        },
        organization: {
          findFirst: vi.fn().mockResolvedValue({
            id: "org-1",
            ownerId: "owner-1",
            name: "Acme Corp",
          }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        organizationMember: {
          deleteMany: deleteMembership,
        },
      };

      const service = new OrganizationsMembersService(
        prisma as unknown as PrismaService,
      );

      await expect(
        service.leaveOrganization("owner-1", "org-1"),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.ORG_OWNER_CANNOT_LEAVE,
      });
      expect(deleteMembership).not.toHaveBeenCalled();
    });

    it("blocks leave when organization ownership changes concurrently", async () => {
      const deleteMembership = vi.fn();
      const prisma = {
        user: {
          findFirst: vi.fn().mockResolvedValue({ id: "mem-1" }),
        },
        organization: {
          findFirst: vi.fn().mockResolvedValue({
            id: "org-1",
            ownerId: "old-owner",
            name: "Acme Corp",
          }),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        organizationMember: {
          deleteMany: deleteMembership,
        },
      };

      const service = new OrganizationsMembersService(
        prisma as unknown as PrismaService,
      );

      await expect(
        service.leaveOrganization("mem-1", "org-1"),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
      });
      expect(deleteMembership).not.toHaveBeenCalled();
    });

    it("throws ORG_MEMBER_NOT_FOUND when caller has no membership row in the target org", async () => {
      const prisma = {
        user: {
          findFirst: vi.fn().mockResolvedValue({ id: "stranger-1" }),
        },
        organization: {
          findFirst: vi.fn().mockResolvedValue({
            id: "org-1",
            ownerId: "owner-1",
            name: "Acme Corp",
          }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        organizationMember: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };

      const service = new OrganizationsMembersService(
        prisma as unknown as PrismaService,
      );

      await expect(
        service.leaveOrganization("stranger-1", "org-1"),
      ).rejects.toMatchObject({
        code: APP_ERROR_CODES.ORG_MEMBER_NOT_FOUND,
      });
    });
  });
});
