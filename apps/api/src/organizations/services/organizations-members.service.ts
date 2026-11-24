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
import {
  APP_ERROR_CODES,
  Role,
  formatUserDisplayName,
  hasPermission,
  type NameDisplayOrder,
} from "@haihire/shared";
import {
  getPreferredMembershipOrderBy,
  getPreferredOwnedOrgOrderBy,
} from "../organization-logo.util";
import { OrganizationsAuditLogService } from "./organizations-audit-log.service";

type MockUserTableCompat = {
  store?: Array<Record<string, unknown>>;
  update?: (args: {
    where: { id: string };
    data: Record<string, unknown>;
  }) => Promise<unknown>;
  updateMany?: (args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }) => Promise<unknown>;
  findMany?: (args?: unknown) => Promise<Array<Record<string, unknown>>>;
};

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
    const prismaUserCompat = this.prisma.user as unknown as MockUserTableCompat;
    const [allOrgs, allUsers, allMembers] = await Promise.all([
      this.prisma.organization.findMany({
        select: { id: true, ownerId: true },
      }),
      prismaUserCompat?.findMany
        ? prismaUserCompat.findMany()
        : Promise.resolve([]),
      this.prisma.organizationMember.findMany({
        select: {
          id: true,
          organizationId: true,
          userId: true,
        },
      }),
    ]);

    const memberPairSet = new Set<string>(
      allMembers.map((m) => `${m.organizationId}:${m.userId}`),
    );

    for (const org of allOrgs) {
      if (org.ownerId) {
        const pairKey = `${org.id}:${org.ownerId}`;
        if (!memberPairSet.has(pairKey)) {
          await this.prisma.organizationMember.upsert({
            where: {
              organizationId_userId: {
                organizationId: org.id,
                userId: org.ownerId,
              },
            },
            create: {
              id: crypto.randomUUID(),
              organizationId: org.id,
              userId: org.ownerId,
              role: Role.ADMIN,
              updatedAt: toInstant(),
            },
            update: {},
          });
          memberPairSet.add(pairKey);
        }
      }
    }

    for (const user of allUsers as Array<{
      id: string;
      organizationId?: string | null;
      role?: string | null;
    }>) {
      if (user.organizationId) {
        const pairKey = `${user.organizationId}:${user.id}`;
        if (!memberPairSet.has(pairKey)) {
          await this.prisma.organizationMember.upsert({
            where: {
              organizationId_userId: {
                organizationId: user.organizationId,
                userId: user.id,
              },
            },
            create: {
              id: crypto.randomUUID(),
              organizationId: user.organizationId,
              userId: user.id,
              role: user.role === "ADMIN" ? Role.ADMIN : Role.MEMBER,
              updatedAt: toInstant(),
            },
            update: {},
          });
          memberPairSet.add(pairKey);
        }
      }
    }
  }

  async getInterviewers(userId: string, activeOrgId?: string | null) {
    const members = await this.getMembers(userId, activeOrgId);
    return members.map((member) => ({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      name: member.name,
      email: member.email,
      role: member.role,
    }));
  }

  private async resolveTargetOrgId(
    client: Pick<PrismaService, "organizationMember" | "organization" | "user">,
    userId: string,
    activeOrgId?: string | null,
  ): Promise<{ orgId: string | null; legacyRole?: string }> {
    if (activeOrgId) {
      return { orgId: activeOrgId };
    }
    if (typeof client.organizationMember?.findFirst === "function") {
      const userMember = await client.organizationMember.findFirst({
        where: { userId },
        orderBy: getPreferredMembershipOrderBy(),
        select: { organizationId: true, role: true },
      });
      if (userMember?.organizationId) {
        return {
          orgId: userMember.organizationId,
          legacyRole: userMember.role,
        };
      }
    }
    if (typeof client.organization?.findFirst === "function") {
      const ownedOrg = await client.organization.findFirst({
        where: { ownerId: userId },
        orderBy: getPreferredOwnedOrgOrderBy(),
        select: { id: true },
      });
      if (ownedOrg?.id) {
        return { orgId: ownedOrg.id, legacyRole: "ADMIN" };
      }
    }
    const callerRecord = await client.user.findFirst({
      where: { id: userId },
    });
    const compatOrgId = (
      callerRecord as unknown as { organizationId?: string | null }
    )?.organizationId;
    const compatRole = (callerRecord as unknown as { role?: string })?.role;
    return { orgId: compatOrgId ?? null, legacyRole: compatRole };
  }

  async getMembers(userId: string, activeOrgId?: string | null) {
    let currentOrgId = activeOrgId || null;
    if (!currentOrgId) {
      const userMember = await this.prisma.organizationMember.findFirst({
        where: { userId },
        orderBy: getPreferredMembershipOrderBy(),
        select: { organizationId: true },
      });
      const ownedOrg = await this.prisma.organization.findFirst({
        where: { ownerId: userId },
        orderBy: getPreferredOwnedOrgOrderBy(),
        select: { id: true },
      });
      currentOrgId = userMember?.organizationId || ownedOrg?.id || null;
    }

    if (!currentOrgId) {
      return [];
    }

    const org = await this.prisma.organization.findFirst({
      where: { id: currentOrgId },
      select: {
        id: true,
        ownerId: true,
        nameDisplayOrder: true,
      },
    });
    if (!org) {
      return [];
    }
    const nameOrder: NameDisplayOrder =
      org?.nameDisplayOrder === "LAST_FIRST" ? "LAST_FIRST" : "FIRST_LAST";

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

    const allUsers =
      memberUserIds.size > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: Array.from(memberUserIds) } },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
              createdAt: true,
            },
          })
        : [];

    const roleMap = new Map<string, string>();
    const joinedAtMap = new Map<string, Date>();
    for (const m of memberships) {
      roleMap.set(m.userId, m.role);
      if (m.createdAt) {
        joinedAtMap.set(m.userId, m.createdAt);
      }
    }
    if (org?.ownerId) {
      roleMap.set(org.ownerId, "ADMIN");
    }

    const members = allUsers.map((u) => {
      const isOwner = Boolean(org && org.ownerId === u.id);
      const role = isOwner ? "ADMIN" : roleMap.get(u.id) || "MEMBER";
      return {
        id: u.id,
        userId: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        name: formatUserDisplayName(u, nameOrder),
        email: u.email,
        role,
        avatarUrl: u.avatarUrl,
        createdAt: joinedAtMap.get(u.id) ?? u.createdAt,
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
    activeOrgId?: string | null,
  ) {
    const caller = await this.prisma.user.findFirst({
      where: { id: callerId },
      select: { id: true },
    });

    const resolved = caller
      ? await this.resolveTargetOrgId(this.prisma, callerId, activeOrgId)
      : { orgId: null };

    if (!caller || !resolved.orgId) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_USER_NO_ORG,
        "User is not associated with an organization",
      );
    }

    const targetOrgId = resolved.orgId;
    const org = await this.prisma.organization.findFirst({
      where: { id: targetOrgId },
      select: {
        id: true,
        ownerId: true,
      },
    });

    const callerMembership =
      typeof this.prisma.organizationMember?.findFirst === "function"
        ? await this.prisma.organizationMember.findFirst({
            where: { organizationId: targetOrgId, userId: caller.id },
            select: { role: true },
          })
        : null;

    const isCallerOwner = Boolean(org && org.ownerId === caller.id);
    const effectiveCallerRole = isCallerOwner
      ? "ADMIN"
      : callerMembership?.role || resolved.legacyRole || "MEMBER";
    const canManageMembers = await this.resolveCanManageMembers(
      this.prisma,
      targetOrgId,
      effectiveCallerRole,
      isCallerOwner,
    );

    if (!canManageMembers) {
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

    const oldRole = membership?.role || null;

    if (!membership) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_MEMBER_NOT_FOUND,
        "Member not found in this organization",
      );
    }

    if (
      !isCallerOwner &&
      effectiveCallerRole !== "ADMIN" &&
      (newRole === "ADMIN" || membership.role === "ADMIN")
    ) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
        "Only organization owners and administrators can assign or modify the ADMIN role.",
      );
    }

    await runInTransaction(this.prisma, async (tx) => {
      if (membership) {
        await tx.organizationMember.update({
          where: { id: membership.id },
          data: { role: newRole },
        });
      } else {
        await tx.organizationMember.upsert({
          where: {
            organizationId_userId: {
              organizationId: targetOrgId,
              userId: targetMemberId,
            },
          },
          create: {
            id: crypto.randomUUID(),
            organizationId: targetOrgId,
            userId: targetMemberId,
            role: newRole,
            updatedAt: toInstant(),
          },
          update: {
            role: newRole,
            updatedAt: toInstant(),
          },
        });
      }

      const txUserCompat = tx.user as unknown as MockUserTableCompat;
      if (txUserCompat?.store) {
        await txUserCompat.update?.({
          where: { id: targetMemberId },
          data: { role: newRole },
        });
      }
    });

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

  async removeMember(
    callerId: string,
    targetMemberId: string,
    activeOrgId?: string | null,
  ) {
    return runInTransaction(this.prisma, async (tx) => {
      const caller = await tx.user.findFirst({
        where: { id: callerId },
        select: { id: true },
      });

      const resolved = caller
        ? await this.resolveTargetOrgId(tx, callerId, activeOrgId)
        : { orgId: null };

      if (!caller || !resolved.orgId) {
        throw new AppNotFoundException(
          APP_ERROR_CODES.ORG_USER_NO_ORG,
          "User is not associated with an organization",
        );
      }

      const targetOrgId = resolved.orgId;
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

      const callerMembership =
        typeof tx.organizationMember?.findFirst === "function"
          ? await tx.organizationMember.findFirst({
              where: { organizationId: targetOrgId, userId: caller.id },
              select: { role: true },
            })
          : null;

      const isCallerOwner = Boolean(org && org.ownerId === caller.id);
      const effectiveCallerRole = isCallerOwner
        ? "ADMIN"
        : callerMembership?.role || resolved.legacyRole || "MEMBER";
      const canManageMembers = await this.resolveCanManageMembers(
        tx,
        targetOrgId,
        effectiveCallerRole,
        isCallerOwner,
      );

      if (!canManageMembers) {
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

      if (!isCallerOwner && effectiveCallerRole !== "ADMIN") {
        const targetMembership =
          typeof tx.organizationMember?.findFirst === "function"
            ? await tx.organizationMember.findFirst({
                where: {
                  organizationId: targetOrgId,
                  userId: targetMemberId,
                },
                select: { role: true },
              })
            : null;
        if (targetMembership?.role === "ADMIN") {
          throw new AppForbiddenException(
            APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
            "Only organization owners and administrators can remove an administrator.",
          );
        }
      }

      // Remove from OrganizationMember
      await tx.organizationMember.deleteMany({
        where: {
          organizationId: targetOrgId,
          userId: targetMemberId,
        },
      });

      const txUserCompat = tx.user as unknown as MockUserTableCompat;
      if (txUserCompat?.store) {
        await txUserCompat.updateMany?.({
          where: { id: targetMemberId, organizationId: targetOrgId },
          data: { organizationId: null, role: "MEMBER" },
        });
      }

      await this.auditLog?.logOrg(
        targetOrgId,
        caller.id,
        "MEMBER_REMOVED",
        "MEMBER",
        { memberId: targetMemberId },
        tx as unknown as PrismaService,
      );

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

  async leaveOrganization(callerId: string, activeOrgId?: string | null) {
    return runInTransaction(this.prisma, async (tx) => {
      const caller = await tx.user.findFirst({
        where: { id: callerId },
        select: { id: true },
      });

      const resolved = caller
        ? await this.resolveTargetOrgId(tx, callerId, activeOrgId)
        : { orgId: null };

      if (!caller || !resolved.orgId) {
        throw new AppNotFoundException(
          APP_ERROR_CODES.ORG_USER_NO_ORG,
          "User is not associated with an organization",
        );
      }

      const targetOrgId = resolved.orgId;
      const org = await tx.organization.findFirst({
        where: { id: targetOrgId },
        select: {
          id: true,
          ownerId: true,
          name: true,
        },
      });

      if (!org) {
        throw new AppNotFoundException(
          APP_ERROR_CODES.ORG_NOT_FOUND,
          "Organization not found",
        );
      }

      // Serialize membership departure with ownership transfer on the organization row.
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

      if (org.ownerId === callerId) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.ORG_OWNER_CANNOT_LEAVE,
          "Organization owner must transfer ownership or delete the organization before leaving.",
        );
      }

      const deleted = await tx.organizationMember.deleteMany({
        where: {
          organizationId: targetOrgId,
          userId: callerId,
        },
      });

      if (deleted.count === 0) {
        throw new AppNotFoundException(
          APP_ERROR_CODES.ORG_MEMBER_NOT_FOUND,
          "Member not found in this organization",
        );
      }

      const txWithPrefs = tx as unknown as {
        notificationPreference?: {
          deleteMany?: (args: {
            where: { organizationId: string; userId: string };
          }) => Promise<unknown>;
        };
      };
      if (
        typeof txWithPrefs.notificationPreference?.deleteMany === "function"
      ) {
        await txWithPrefs.notificationPreference.deleteMany({
          where: {
            organizationId: targetOrgId,
            userId: callerId,
          },
        });
      }

      const txUserCompat = tx.user as unknown as MockUserTableCompat;
      if (txUserCompat?.store) {
        await txUserCompat.updateMany?.({
          where: { id: callerId, organizationId: targetOrgId },
          data: { organizationId: null, role: "MEMBER" },
        });
      }

      await this.auditLog?.logOrg(
        targetOrgId,
        caller.id,
        "MEMBER_LEFT",
        "MEMBER",
        { memberId: callerId },
        tx as unknown as PrismaService,
      );

      this.eventsService?.emit({
        type: "MEMBERS_CHANGED",
        organizationId: targetOrgId,
        data: { memberId: callerId },
      });
      this.eventsService?.emit({
        type: "AUDIT_LOGS_CHANGED",
        organizationId: targetOrgId,
      });

      return {
        success: true,
        organizationId: targetOrgId,
        organizationName: org.name,
        message: "Successfully left the organization",
      };
    });
  }

  private async resolveCanManageMembers(
    client: {
      organizationRolePermission?: {
        findFirst?: (args: {
          where: {
            organizationId: string;
            role: Role;
            permission: string;
          };
          select: { granted: true };
        }) => Promise<{ granted: boolean } | null>;
      };
    },
    organizationId: string,
    effectiveRole: string,
    isOwner: boolean,
  ): Promise<boolean> {
    if (isOwner || effectiveRole === "ADMIN") {
      return true;
    }
    const rolePermOverride =
      typeof client.organizationRolePermission?.findFirst === "function"
        ? await client.organizationRolePermission.findFirst({
            where: {
              organizationId,
              role: effectiveRole as Role,
              permission: "org:manage_members",
            },
            select: { granted: true },
          })
        : null;
    return rolePermOverride
      ? rolePermOverride.granted
      : hasPermission(effectiveRole as Role, "org:manage_members");
  }
}
