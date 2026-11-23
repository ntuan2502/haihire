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
});
