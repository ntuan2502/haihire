import {
  Inject,
  Injectable,
  Optional,
  type OnModuleInit,
} from "@nestjs/common";
import crypto from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { EventsService } from "../../events/events.service";
import { toInstant, toTimestamp } from "../../common/date.util";
import {
  AppBadRequestException,
  AppForbiddenException,
  AppNotFoundException,
} from "../../common/app-exception";
import { APP_ERROR_CODES, Role } from "@haihire/shared";

@Injectable()
export class OrganizationsMembersService implements OnModuleInit {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(EventsService)
    private readonly eventsService?: EventsService,
  ) {}

  async onModuleInit() {
    try {
      await this.backfillMemberships();
    } catch (e) {
      console.warn("Failed to backfill memberships on startup:", e);
    }
  }

  private async backfillMemberships() {
    // Single batched query across all 3 tables (O(1) database roundtrips on startup)
    const [allOrgs, allUsers, allMembers] = await Promise.all([
      this.prisma.db.orm.public.Organization.select("id", "ownerId").all(),
      this.prisma.db.orm.public.User.select(
        "id",
        "organizationId",
        "role",
      ).all(),
      this.prisma.db.orm.public.OrganizationMember.select(
        "id",
        "organizationId",
        "userId",
      ).all(),
    ]);

    // Fast in-memory lookup set for (organizationId:userId) pairs
    const memberPairSet = new Set<string>(
      allMembers.map((m) => `${m.organizationId}:${m.userId}`),
    );

    // 1. Ensure all organization owners have an OrganizationMember record with ADMIN role
    for (const org of allOrgs) {
      if (org.ownerId) {
        const pairKey = `${org.id}:${org.ownerId}`;
        if (!memberPairSet.has(pairKey)) {
          const id = crypto.randomUUID();
          await this.prisma.db.orm.public.OrganizationMember.upsert({
            create: {
              id,
              organizationId: org.id,
              userId: org.ownerId,
              role: "ADMIN",
              updatedAt: toInstant(),
            },
            update: {},
            conflictOn: { id },
          });
          memberPairSet.add(pairKey);
        }
      }
    }

    // 2. Ensure all users with an active organizationId have an OrganizationMember record
    for (const user of allUsers) {
      if (user.organizationId) {
        const pairKey = `${user.organizationId}:${user.id}`;
        if (!memberPairSet.has(pairKey)) {
          const id = crypto.randomUUID();
          await this.prisma.db.orm.public.OrganizationMember.upsert({
            create: {
              id,
              organizationId: user.organizationId,
              userId: user.id,
              role: user.role === "ADMIN" ? "ADMIN" : "MEMBER",
              updatedAt: toInstant(),
            },
            update: {},
            conflictOn: { id },
          });
          memberPairSet.add(pairKey);
        }
      }
    }
  }

  async getMembers(userId: string) {
    const user = await this.prisma.db.orm.public.User.select(
      "id",
      "organizationId",
    )
      .where((u) => u.id.eq(userId))
      .first();

    if (!user || !user.organizationId) {
      return [];
    }

    const currentOrgId = user.organizationId as string;
    const org = await this.prisma.db.orm.public.Organization.select(
      "id",
      "ownerId",
    )
      .where((o) => o.id.eq(currentOrgId))
      .first();

    // 1. Fetch all memberships recorded in OrganizationMember for this organization
    const memberships =
      await this.prisma.db.orm.public.OrganizationMember.select(
        "id",
        "userId",
        "role",
        "createdAt",
      )
        .where((m) => m.organizationId.eq(currentOrgId))
        .all();

    const memberUserIds = new Set(memberships.map((m) => m.userId));
    if (org?.ownerId) {
      memberUserIds.add(org.ownerId);
    }

    const orgUsers = await this.prisma.db.orm.public.User.select(
      "id",
      "name",
      "email",
      "role",
      "avatarUrl",
      "organizationId",
      "createdAt",
    )
      .where((u) => u.organizationId.eq(currentOrgId))
      .all();

    const additionalUserIds = Array.from(memberUserIds).filter(
      (id) => !orgUsers.some((u) => u.id === id),
    );

    const additionalUsers =
      additionalUserIds.length > 0
        ? await this.prisma.db.orm.public.User.select(
            "id",
            "name",
            "email",
            "role",
            "avatarUrl",
            "organizationId",
            "createdAt",
          )
            .where((u) => u.id.in(additionalUserIds))
            .all()
        : [];

    const allUsers = [...orgUsers, ...additionalUsers];

    const roleMap = new Map<string, string>();
    for (const m of memberships) {
      roleMap.set(m.userId, m.role);
    }
    if (org?.ownerId) {
      roleMap.set(org.ownerId, "ADMIN");
    }

    const members = allUsers
      .filter(
        (u) => memberUserIds.has(u.id) || u.organizationId === currentOrgId,
      )
      .map((u) => {
        const isOwner = Boolean(org && org.ownerId === u.id);
        const role = isOwner
          ? "ADMIN"
          : roleMap.get(u.id) || u.role || "MEMBER";
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role,
          avatarUrl: u.avatarUrl,
          createdAt: u.createdAt,
          isOwner,
        };
      });

    // Ensure deterministic stable ordering: Owner first, then joined time (createdAt ASC), tie-breaker by id ASC
    members.sort((a, b) => {
      if (a.isOwner && !b.isOwner) return -1;
      if (!a.isOwner && b.isOwner) return 1;
      const timeA = toTimestamp(a.createdAt);
      const timeB = toTimestamp(b.createdAt);
      if (timeA !== timeB) return timeA - timeB;
      return a.id.localeCompare(b.id);
    });

    return members;
  }

  async updateMemberRole(
    callerId: string,
    targetMemberId: string,
    newRole: Role,
  ) {
    const caller = await this.prisma.db.orm.public.User.select(
      "id",
      "role",
      "organizationId",
    )
      .where((u) => u.id.eq(callerId))
      .first();

    if (!caller || !caller.organizationId) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_USER_NO_ORG,
        "User is not associated with an organization",
      );
    }

    const targetOrgId = caller.organizationId as string;
    const org = await this.prisma.db.orm.public.Organization.select(
      "id",
      "ownerId",
    )
      .where((o) => o.id.eq(targetOrgId))
      .first();

    const isCallerOwner = Boolean(org && org.ownerId === caller.id);
    const isCallerAdmin = caller.role === "ADMIN";

    if (!isCallerAdmin && !isCallerOwner) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
        "Only organization owners and administrators can change member roles.",
      );
    }

    // Cannot change own role
    if (callerId === targetMemberId) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.ORG_CANNOT_CHANGE_SELF_ROLE,
        "You cannot change your own role",
      );
    }

    // Cannot change role of Owner
    if (org && org.ownerId === targetMemberId) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.ORG_CANNOT_CHANGE_OWNER_ROLE,
        "Cannot change the role of the organization owner",
      );
    }

    const orgMembers =
      await this.prisma.db.orm.public.OrganizationMember.select(
        "id",
        "userId",
        "role",
      )
        .where((m) => m.organizationId.eq(targetOrgId))
        .all();

    const membership = orgMembers.find((m) => m.userId === targetMemberId);

    const targetUser = await this.prisma.db.orm.public.User.select(
      "id",
      "organizationId",
      "role",
    )
      .where((u) => u.id.eq(targetMemberId))
      .first();

    if (
      !membership &&
      (!targetUser || targetUser.organizationId !== targetOrgId)
    ) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_MEMBER_NOT_FOUND,
        "Member not found in this organization",
      );
    }

    if (membership) {
      await this.prisma.db.orm.public.OrganizationMember.where((m) =>
        m.id.eq(membership.id),
      ).update({
        role: newRole,
      });
    } else {
      const newMemberId = crypto.randomUUID();
      await this.prisma.db.orm.public.OrganizationMember.upsert({
        create: {
          id: newMemberId,
          organizationId: targetOrgId,
          userId: targetMemberId,
          role: newRole,
          updatedAt: toInstant(),
        },
        update: {},
        conflictOn: { id: newMemberId },
      });
    }

    // If target user is currently active in this organization, update user.role
    if (targetUser && targetUser.organizationId === targetOrgId) {
      await this.prisma.db.orm.public.User.where((u) =>
        u.id.eq(targetMemberId),
      ).update({
        role: newRole,
      });
    }

    // Broadcast SSE event
    this.eventsService?.emit({
      type: "MEMBER_ROLE_UPDATED",
      targetUserId: targetMemberId,
      organizationId: targetOrgId,
      role: newRole,
    });

    return {
      success: true,
      role: newRole,
      message: `Member role updated to ${newRole}`,
    };
  }

  async removeMember(callerId: string, targetMemberId: string) {
    const caller = await this.prisma.db.orm.public.User.select(
      "id",
      "role",
      "organizationId",
    )
      .where((u) => u.id.eq(callerId))
      .first();

    if (!caller || !caller.organizationId) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_USER_NO_ORG,
        "User is not associated with an organization",
      );
    }

    const targetOrgId = caller.organizationId as string;
    const org = await this.prisma.db.orm.public.Organization.select(
      "id",
      "ownerId",
    )
      .where((o) => o.id.eq(targetOrgId))
      .first();

    const isCallerOwner = Boolean(org && org.ownerId === caller.id);
    const isCallerAdmin = caller.role === "ADMIN";

    if (!isCallerAdmin && !isCallerOwner) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
        "Only organization owners and administrators can remove members.",
      );
    }

    if (callerId === targetMemberId) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.ORG_CANNOT_REMOVE_SELF,
        "You cannot remove yourself from the organization",
      );
    }

    // Cannot remove Owner
    if (org && org.ownerId === targetMemberId) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.ORG_CANNOT_REMOVE_OWNER,
        "Cannot remove the organization owner",
      );
    }

    // Remove from OrganizationMember
    const memberRecords =
      await this.prisma.db.orm.public.OrganizationMember.select("id", "userId")
        .where((m) => m.organizationId.eq(targetOrgId))
        .all();

    for (const record of memberRecords) {
      if (record.userId === targetMemberId) {
        await this.prisma.db.orm.public.OrganizationMember.where((m) =>
          m.id.eq(record.id),
        ).delete();
      }
    }

    const targetUser = await this.prisma.db.orm.public.User.select(
      "id",
      "organizationId",
    )
      .where((u) => u.id.eq(targetMemberId))
      .first();

    // If target user is currently viewing this organization, fallback to another org or null
    if (targetUser && targetUser.organizationId === targetOrgId) {
      const remainingMembership =
        await this.prisma.db.orm.public.OrganizationMember.select(
          "organizationId",
          "role",
        )
          .where((m) => m.userId.eq(targetMemberId))
          .first();

      const fallbackOrgId = remainingMembership
        ? remainingMembership.organizationId
        : null;
      const fallbackRole = remainingMembership
        ? remainingMembership.role
        : "MEMBER";

      await this.prisma.db.orm.public.User.where((u) =>
        u.id.eq(targetMemberId),
      ).update({
        organizationId: fallbackOrgId,
        role: fallbackRole,
      });
    }

    // Broadcast SSE event
    this.eventsService?.emit({
      type: "MEMBER_REMOVED",
      targetUserId: targetMemberId,
      organizationId: targetOrgId,
    });

    return {
      success: true,
      message: "Member successfully removed from organization",
    };
  }
}
