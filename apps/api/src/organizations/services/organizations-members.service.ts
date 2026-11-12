import { Inject, Injectable, Optional } from "@nestjs/common";
import crypto from "node:crypto";
import { PrismaService, runInTransaction } from "../../prisma/prisma.service";
import { EventsService } from "../../events/events.service";
import { toInstant, toTimestamp } from "../../common/date.util";
import {
  AppBadRequestException,
  AppForbiddenException,
  AppNotFoundException,
} from "../../common/app-exception";
import { APP_ERROR_CODES, Role } from "@haihire/shared";
import { OrganizationsAuditLogService } from "./organizations-audit-log.service";

@Injectable()
export class OrganizationsMembersService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(EventsService)
    private readonly eventsService?: EventsService,
    @Optional()
    @Inject(OrganizationsAuditLogService)
    private readonly auditLog?: OrganizationsAuditLogService,
  ) {}

  async initializeMemberships() {
    try {
      await this.backfillMemberships();
    } catch (e) {
      console.warn("Failed to backfill memberships on startup:", e);
    }
  }

  private async backfillMemberships() {
    // Single batched query across all 3 tables (O(1) database roundtrips on startup)
    const [allOrgs, allUsers, allMembers] = await Promise.all([
      this.prisma.organization.findMany({
        select: { id: true, ownerId: true },
      }),
      this.prisma.user.findMany({
        select: {
          id: true,
          organizationId: true,
          role: true,
        },
      }),
      this.prisma.organizationMember.findMany({
        select: {
          id: true,
          organizationId: true,
          userId: true,
        },
      }),
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
          await this.prisma.organizationMember.upsert({
            where: {
              organizationId_userId: {
                organizationId: org.id,
                userId: org.ownerId,
              },
            },
            create: {
              id,
              organizationId: org.id,
              userId: org.ownerId,
              role: "ADMIN",
              updatedAt: toInstant(),
            },
            update: {},
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
          await this.prisma.organizationMember.upsert({
            where: {
              organizationId_userId: {
                organizationId: user.organizationId,
                userId: user.id,
              },
            },
            create: {
              id,
              organizationId: user.organizationId,
              userId: user.id,
              role: user.role === "ADMIN" ? "ADMIN" : "MEMBER",
              updatedAt: toInstant(),
            },
            update: {},
          });
          memberPairSet.add(pairKey);
        }
      }
    }
  }

  async getInterviewers(userId: string) {
    const members = await this.getMembers(userId);
    return members.map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
    }));
  }

  async getMembers(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!user || !user.organizationId) {
      return [];
    }

    const currentOrgId = user.organizationId as string;
    const org = await this.prisma.organization.findFirst({
      where: { id: currentOrgId },
      select: {
        id: true,
        ownerId: true,
      },
    });

    // 1. Fetch all memberships recorded in OrganizationMember for this organization
    const memberships = await this.prisma.organizationMember.findMany({
      where: { organizationId: currentOrgId },
      select: {
        id: true,
        userId: true,
        role: true,
        createdAt: true,
      },
    });

    const memberUserIds = new Set(memberships.map((m) => m.userId));
    if (org?.ownerId) {
      memberUserIds.add(org.ownerId);
    }

    const orgUsers = await this.prisma.user.findMany({
      where: { organizationId: currentOrgId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        organizationId: true,
        createdAt: true,
      },
    });

    const additionalUserIds = Array.from(memberUserIds).filter(
      (id) => !orgUsers.some((u) => u.id === id),
    );

    const additionalUsers =
      additionalUserIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: additionalUserIds } },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              avatarUrl: true,
              organizationId: true,
              createdAt: true,
            },
          })
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
    const caller = await this.prisma.user.findFirst({
      where: { id: callerId },
      select: {
        id: true,
        role: true,
        organizationId: true,
      },
    });

    if (!caller || !caller.organizationId) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_USER_NO_ORG,
        "User is not associated with an organization",
      );
    }

    const targetOrgId = caller.organizationId as string;
    const org = await this.prisma.organization.findFirst({
      where: { id: targetOrgId },
      select: {
        id: true,
        ownerId: true,
      },
    });

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

    const orgMembers = await this.prisma.organizationMember.findMany({
      where: { organizationId: targetOrgId },
      select: {
        id: true,
        userId: true,
        role: true,
      },
    });

    const membership = orgMembers.find((m) => m.userId === targetMemberId);

    const targetUser = await this.prisma.user.findFirst({
      where: { id: targetMemberId },
      select: {
        id: true,
        organizationId: true,
        role: true,
      },
    });

    const oldRole = membership?.role || targetUser?.role || null;

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
      await this.prisma.organizationMember.update({
        where: { id: membership.id },
        data: { role: newRole },
      });
    } else {
      const newMemberId = crypto.randomUUID();
      await this.prisma.organizationMember.upsert({
        where: { id: newMemberId },
        create: {
          id: newMemberId,
          organizationId: targetOrgId,
          userId: targetMemberId,
          role: newRole,
          updatedAt: toInstant(),
        },
        update: {},
      });
    }

    // If target user is currently active in this organization, update user.role
    if (targetUser && targetUser.organizationId === targetOrgId) {
      await this.prisma.user.update({
        where: { id: targetMemberId },
        data: { role: newRole },
      });
    }

    // Broadcast SSE event
    this.eventsService?.emit({
      type: "MEMBER_ROLE_UPDATED",
      targetUserId: targetMemberId,
      organizationId: targetOrgId,
      role: newRole,
    });
    this.eventsService?.emit({
      type: "MEMBERS_CHANGED",
      organizationId: targetOrgId,
      data: { memberId: targetMemberId, role: newRole },
    });

    await this.auditLog?.logOrg(
      targetOrgId,
      callerId,
      "MEMBER_ROLE_CHANGED",
      "MEMBER",
      { memberId: targetMemberId, oldRole, newRole },
    );

    this.eventsService?.emit({
      type: "AUDIT_LOGS_CHANGED",
      organizationId: targetOrgId,
    });

    return {
      success: true,
      role: newRole,
      message: `Member role updated to ${newRole}`,
    };
  }

  async removeMember(callerId: string, targetMemberId: string) {
    return runInTransaction(this.prisma, async (tx) => {
      const caller = await tx.user.findFirst({
        where: { id: callerId },
        select: {
          id: true,
          role: true,
          organizationId: true,
        },
      });

      if (!caller || !caller.organizationId) {
        throw new AppNotFoundException(
          APP_ERROR_CODES.ORG_USER_NO_ORG,
          "User is not associated with an organization",
        );
      }

      const targetOrgId = caller.organizationId as string;
      const org = await tx.organization.findFirst({
        where: { id: targetOrgId },
        select: {
          id: true,
          ownerId: true,
        },
      });

      if (!org) {
        throw new AppNotFoundException(
          APP_ERROR_CODES.ORG_NOT_FOUND,
          "Organization not found",
        );
      }
      // Serialize membership removal with ownership transfer on the organization row.
      const locked = await tx.organization.updateMany({
        where: { id: targetOrgId, ownerId: org.ownerId },
        data: { ownerId: org.ownerId },
      });
      if (locked.count !== 1) {
        throw new AppForbiddenException(
          APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
          "Organization ownership changed; retry the request.",
        );
      }

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
      await tx.organizationMember.deleteMany({
        where: {
          organizationId: targetOrgId,
          userId: targetMemberId,
        },
      });

      const targetUser = await tx.user.findFirst({
        where: { id: targetMemberId },
        select: {
          id: true,
          organizationId: true,
        },
      });

      // If target user is currently viewing this organization, fallback to another org or null
      if (targetUser && targetUser.organizationId === targetOrgId) {
        const remainingMembership = await tx.organizationMember.findFirst({
          where: { userId: targetMemberId },
          select: {
            organizationId: true,
            role: true,
          },
        });

        const fallbackOrgId = remainingMembership
          ? remainingMembership.organizationId
          : null;
        const fallbackRole = remainingMembership
          ? remainingMembership.role
          : "MEMBER";

        await tx.user.update({
          where: { id: targetMemberId },
          data: {
            organizationId: fallbackOrgId,
            role: fallbackRole,
          },
        });
      }

      // Broadcast SSE event
      this.eventsService?.emit({
        type: "MEMBER_REMOVED",
        targetUserId: targetMemberId,
        organizationId: targetOrgId,
      });
      this.eventsService?.emit({
        type: "MEMBERS_CHANGED",
        organizationId: targetOrgId,
        data: { memberId: targetMemberId },
      });
      this.eventsService?.emit({
        type: "AUDIT_LOGS_CHANGED",
        organizationId: targetOrgId,
      });

      return {
        success: true,
        message: "Member successfully removed from organization",
      };
    });
  }
}
