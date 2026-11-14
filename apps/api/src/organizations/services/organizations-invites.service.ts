import { Inject, Injectable, Optional } from "@nestjs/common";
import crypto from "node:crypto";
import { PrismaService, runInTransaction } from "../../prisma/prisma.service";
import { PermissionResolverService } from "../../auth/permission-resolver.service";
import { JoinOrgDto } from "../dto/join-org.dto";
import { toTimestamp, toInstant } from "../../common/date.util";
import {
  AppBadRequestException,
  AppForbiddenException,
  AppNotFoundException,
} from "../../common/app-exception";
import {
  APP_ERROR_CODES,
  ROLE_LIST,
  Role,
  formatUserDisplayName,
  hasPermission,
  type NameDisplayOrder,
} from "@haihire/shared";
import { EventsService } from "../../events/events.service";

export interface InviteLinkRecord {
  id: string;
  token: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: string;
  expiresAt: string | null;
  maxUses: number | null;
  usesCount: number;
  createdById: string | null;
  createdByName: string;
  status: string;
  createdAt: string;
}

interface MemberInviteContext {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    name: string | null;
    role: string;
    organizationId: string;
  };
  orgId: string;
  org: {
    id: string;
    name: string;
    slug: string;
    ownerId: string | null;
    nameDisplayOrder?: string;
  } | null;
  isOwner: boolean;
  effectiveRole: Role;
  canManageMembers: boolean;
}

@Injectable()
export class OrganizationsInvitesService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(PermissionResolverService)
    private readonly permissionResolver?: PermissionResolverService,
    @Optional()
    @Inject(EventsService)
    private readonly eventsService?: EventsService,
  ) {}

  private resolveValidInviteRole(rawRole?: string | null): Role {
    if (!rawRole) {
      return Role.MEMBER;
    }
    const normalized = rawRole.trim().toUpperCase();
    if (!normalized) {
      return Role.MEMBER;
    }
    const matched = ROLE_LIST.find((role) => role === normalized);
    if (!matched) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        `Invalid invite role "${rawRole}". Valid roles: ${ROLE_LIST.join(", ")}`,
      );
    }
    return matched;
  }

  private async hasManageMembersPermission(
    organizationId: string,
    effectiveRole: Role,
    isOwner: boolean,
  ): Promise<boolean> {
    if (isOwner || effectiveRole === Role.ADMIN) {
      return true;
    }
    const prismaPartial: Partial<
      Pick<PrismaService, "organizationRolePermission">
    > = this.prisma;
    if (
      this.permissionResolver &&
      typeof prismaPartial.organizationRolePermission?.findMany === "function"
    ) {
      return this.permissionResolver.resolvePermission(
        organizationId,
        effectiveRole,
        "org:manage_members",
      );
    }
    return hasPermission(effectiveRole, "org:manage_members");
  }

  private async resolveMemberInviteContext(
    userId: string,
  ): Promise<MemberInviteContext | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        organizationId: true,
      },
    });

    if (!user || !user.organizationId) {
      return null;
    }

    const orgId = user.organizationId;
    const org = await this.prisma.organization.findFirst({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        ownerId: true,
        nameDisplayOrder: true,
      },
    });

    const prismaPartial: Partial<Pick<PrismaService, "organizationMember">> =
      this.prisma;
    const membership =
      typeof prismaPartial.organizationMember?.findFirst === "function"
        ? await this.prisma.organizationMember.findFirst({
            where: {
              organizationId: orgId,
              userId: user.id,
            },
            select: { role: true },
          })
        : null;

    const rawEffectiveRole = membership?.role ?? user.role;
    const effectiveRole =
      ROLE_LIST.find(
        (role) => role === rawEffectiveRole.trim().toUpperCase(),
      ) ?? Role.MEMBER;
    const isOwner = Boolean(org && org.ownerId === user.id);
    const canManageMembers = await this.hasManageMembersPermission(
      orgId,
      effectiveRole,
      isOwner,
    );
    const orgOrder: NameDisplayOrder =
      org?.nameDisplayOrder === "LAST_FIRST" ? "LAST_FIRST" : "FIRST_LAST";

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: formatUserDisplayName(user, orgOrder),
        role: user.role,
        organizationId: orgId,
      },
      orgId,
      org,
      isOwner,
      effectiveRole,
      canManageMembers,
    };
  }

  async createInviteLink(
    userId: string,
    dto: { role?: string; expiresIn?: string; maxUses?: string },
  ): Promise<InviteLinkRecord> {
    const ctx = await this.resolveMemberInviteContext(userId);
    if (!ctx) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_USER_NO_ORG,
        "User is not associated with an organization",
      );
    }

    const { user, org, isOwner, effectiveRole, canManageMembers } = ctx;
    if (!org) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_NOT_FOUND,
        "Organization not found",
      );
    }

    if (!canManageMembers) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
        "You do not have permission to create invite links.",
      );
    }

    const linkRole = this.resolveValidInviteRole(dto.role);
    if (linkRole === Role.ADMIN && !isOwner && effectiveRole !== Role.ADMIN) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
        "Only organization owners and administrators can create admin invite links.",
      );
    }

    // 64-character cryptographic hex token
    const token = crypto.randomBytes(32).toString("hex");

    // Calculate expiration
    let expiresInDays: number | null = 7;
    const rawExp = dto.expiresIn || "7 days";
    if (rawExp === "1 day" || rawExp === "1") {
      expiresInDays = 1;
    } else if (rawExp === "7 days" || rawExp === "7") {
      expiresInDays = 7;
    } else if (rawExp === "30 days" || rawExp === "30") {
      expiresInDays = 30;
    } else if (rawExp === "Never") {
      expiresInDays = null;
    }

    const expiresAt =
      expiresInDays !== null
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : null;

    // Calculate max uses
    let maxUses: number | null = null;
    const rawUses = dto.maxUses || "Unlimited";
    if (rawUses !== "Unlimited") {
      const parsed = parseInt(rawUses, 10);
      if (!isNaN(parsed) && parsed > 0) {
        maxUses = parsed;
      }
    }

    const id = crypto.randomUUID();

    await this.prisma.inviteLink.create({
      data: {
        id,
        token,
        organizationId: org.id,
        role: linkRole,
        expiresAt,
        maxUses,
        usesCount: 0,
        status: "ACTIVE",
        createdById: user.id,
        updatedAt: toInstant(),
      },
    });

    this.eventsService?.emit({
      type: "INVITE_LINKS_CHANGED",
      organizationId: org.id,
      data: { linkId: id },
    });

    return {
      id,
      token,
      organizationId: org.id,
      organizationName: org.name,
      organizationSlug: org.slug,
      role: linkRole,
      expiresAt: expiresAt ? expiresAt.toString() : null,
      maxUses,
      usesCount: 0,
      createdById: user.id,
      createdByName: user.name || "Team Member",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    };
  }

  async getInviteLinks(userId: string): Promise<InviteLinkRecord[]> {
    const ctx = await this.resolveMemberInviteContext(userId);
    if (!ctx || !ctx.canManageMembers) {
      return [];
    }

    const { orgId, org } = ctx;

    const allLinks = await this.prisma.inviteLink.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        token: true,
        role: true,
        expiresAt: true,
        maxUses: true,
        usesCount: true,
        status: true,
        organizationId: true,
        createdById: true,
        createdAt: true,
      },
    });

    const links = allLinks.filter((l) => l.status !== "REVOKED");

    const orgOrder: NameDisplayOrder =
      org?.nameDisplayOrder === "LAST_FIRST" ? "LAST_FIRST" : "FIRST_LAST";

    const users = await this.prisma.user.findMany({
      where: { organizationId: orgId },
      select: { id: true, firstName: true, lastName: true },
    });
    const userMap = new Map(
      users.map((u) => [u.id, formatUserDisplayName(u, orgOrder)]),
    );

    return links.map((link) => {
      let status = link.status;
      if (status === "ACTIVE") {
        if (link.expiresAt && toTimestamp(link.expiresAt) < Date.now()) {
          status = "EXPIRED";
        } else if (link.maxUses !== null && link.usesCount >= link.maxUses) {
          status = "EXPIRED";
        }
      }

      return {
        id: link.id,
        token: link.token,
        organizationId: link.organizationId,
        organizationName: org?.name || "Organization",
        organizationSlug: org?.slug || "org",
        role: link.role,
        expiresAt: link.expiresAt
          ? new Date(toTimestamp(link.expiresAt)).toISOString()
          : null,
        maxUses: link.maxUses,
        usesCount: link.usesCount,
        createdById: link.createdById,
        createdByName:
          (link.createdById && userMap.get(link.createdById)) || "Admin",
        status,
        createdAt: new Date(toTimestamp(link.createdAt)).toISOString(),
      };
    });
  }

  async revokeInviteLink(userId: string, linkId: string) {
    const ctx = await this.resolveMemberInviteContext(userId);
    if (!ctx) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_USER_NO_ORG,
        "User is not associated with an organization",
      );
    }

    const { orgId, canManageMembers } = ctx;
    if (!canManageMembers) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
        "You do not have permission to revoke invite links.",
      );
    }

    const { count } = await this.prisma.inviteLink.updateMany({
      where: {
        id: linkId,
        organizationId: orgId,
      },
      data: { status: "REVOKED" },
    });

    if (count === 0) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_INVITE_INVALID,
        "Invite link not found in the active organization",
      );
    }

    this.eventsService?.emit({
      type: "INVITE_LINKS_CHANGED",
      organizationId: orgId,
      data: { linkId },
    });

    return { success: true, message: "Invite link revoked successfully" };
  }

  async getPublicInvite(token: string) {
    const link = await this.prisma.inviteLink.findFirst({
      where: { token },
      select: {
        id: true,
        token: true,
        role: true,
        expiresAt: true,
        maxUses: true,
        usesCount: true,
        status: true,
        organizationId: true,
        createdById: true,
      },
    });

    if (!link) {
      return {
        valid: false,
        message: "Invite link not found or invalid",
      };
    }

    if (link.status === "REVOKED") {
      return {
        valid: false,
        message: "This invitation link has been revoked by an administrator",
        link,
      };
    }

    if (link.expiresAt && toTimestamp(link.expiresAt) < Date.now()) {
      return {
        valid: false,
        message: "This invitation link has expired",
        link,
      };
    }

    if (link.maxUses !== null && link.usesCount >= link.maxUses) {
      return {
        valid: false,
        message: "This invitation link has reached its maximum allowed uses",
        link,
      };
    }

    const org = await this.prisma.organization.findFirst({
      where: { id: link.organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        nameDisplayOrder: true,
      },
    });
    const orgOrder: NameDisplayOrder =
      org?.nameDisplayOrder === "LAST_FIRST" ? "LAST_FIRST" : "FIRST_LAST";

    let createdByName = "Team Member";
    if (link.createdById) {
      const creator = await this.prisma.user.findFirst({
        where: {
          id: link.createdById as string,
          organizationId: link.organizationId,
        },
        select: { id: true, firstName: true, lastName: true },
      });
      const resolved = formatUserDisplayName(creator, orgOrder);
      if (resolved) {
        createdByName = resolved;
      }
    }

    return {
      valid: true,
      token: link.token,
      role: link.role,
      organization: {
        id: link.organizationId,
        name: org?.name || "Organization",
        slug: org?.slug || "org",
      },
      createdByName,
      expiresAt: link.expiresAt
        ? new Date(toTimestamp(link.expiresAt)).toISOString()
        : null,
    };
  }

  async joinByToken(userId: string, token: string) {
    const result = await runInTransaction(this.prisma, async (tx) => {
      const link = await tx.inviteLink.findFirst({
        where: { token },
        select: {
          id: true,
          token: true,
          role: true,
          expiresAt: true,
          maxUses: true,
          usesCount: true,
          status: true,
          organizationId: true,
        },
      });

      if (!link) {
        throw new AppNotFoundException(
          APP_ERROR_CODES.ORG_INVITE_INVALID,
          "Invite link not found or invalid",
        );
      }

      if (link.status === "REVOKED") {
        throw new AppBadRequestException(
          APP_ERROR_CODES.ORG_INVITE_REVOKED,
          "This invitation link has been revoked",
        );
      }

      if (link.expiresAt && toTimestamp(link.expiresAt) < Date.now()) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.ORG_INVITE_EXPIRED,
          "This invitation link has expired",
        );
      }

      if (link.maxUses !== null && link.usesCount >= link.maxUses) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.ORG_INVITE_INVALID,
          "This invitation link has reached its maximum allowed uses",
        );
      }

      // Check if user is already a member of this organization
      const user = await tx.user.findFirst({
        where: { id: userId },
        select: {
          id: true,
          organizationId: true,
        },
      });

      const userMemberships = await tx.organizationMember.findMany({
        where: { userId },
        select: {
          id: true,
          organizationId: true,
          role: true,
        },
      });

      const isAlreadyMember =
        userMemberships.some((m) => m.organizationId === link.organizationId) ||
        (user && user.organizationId === link.organizationId);

      if (isAlreadyMember) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.ORG_MEMBER_ALREADY_EXISTS,
          "You are already a member of this organization.",
        );
      }

      // Atomic conditional update on invite link uses (H-08)
      const now = new Date();
      const incResult = await tx.inviteLink.updateMany({
        where: {
          id: link.id,
          status: "ACTIVE",
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          AND: [
            {
              OR: [
                { maxUses: null },
                { usesCount: { lt: link.maxUses ?? 999999999 } },
              ],
            },
          ],
        },
        data: {
          usesCount: { increment: 1 },
        },
      });

      if (incResult.count === 0) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.ORG_INVITE_INVALID,
          "This invitation link has reached its maximum allowed uses or expired",
        );
      }

      const assignedRole = this.resolveValidInviteRole(link.role);

      // Record persistent membership in OrganizationMember
      const newMemberId = crypto.randomUUID();
      await tx.organizationMember.create({
        data: {
          id: newMemberId,
          organizationId: link.organizationId,
          userId,
          role: assignedRole,
          updatedAt: toInstant(),
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          organizationId: link.organizationId,
          role: assignedRole,
        },
      });

      // Update status to EXPIRED if maxUses reached
      const nextUses = link.usesCount + 1;
      if (link.maxUses !== null && nextUses >= link.maxUses) {
        await tx.inviteLink.update({
          where: { id: link.id },
          data: { status: "EXPIRED" },
        });
      }

      const org = await tx.organization.findFirst({
        where: { id: link.organizationId },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      });

      return {
        success: true,
        organization: org,
        role: assignedRole,
        message: `Successfully joined ${org?.name || "organization"}`,
      };
    });

    this.eventsService?.emit({
      type: "MEMBERS_CHANGED",
      organizationId: result.organization?.id,
      data: { userId },
    });
    this.eventsService?.emit({
      type: "INVITE_LINKS_CHANGED",
      organizationId: result.organization?.id,
    });

    return result;
  }

  async join(userId: string, dto: JoinOrgDto) {
    let rawInput = dto.inviteCodeOrSlug.trim();
    if (!rawInput) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.ORG_INVITE_INVALID,
        "Please provide a valid invite code or link.",
      );
    }

    // Extract token if user passed a full URL (e.g. /join/:token)
    if (rawInput.includes("/join/")) {
      const parts = rawInput.split("/join/");
      rawInput = parts[parts.length - 1].split("?")[0].trim();
    }

    let joinedNewMember = false;
    const result = await runInTransaction(this.prisma, async (tx) => {
      const inviteLink = await tx.inviteLink.findFirst({
        where: { token: rawInput },
        select: {
          id: true,
          organizationId: true,
          role: true,
          status: true,
          expiresAt: true,
          maxUses: true,
          usesCount: true,
        },
      });

      if (!inviteLink || inviteLink.status !== "ACTIVE") {
        throw new AppNotFoundException(
          APP_ERROR_CODES.ORG_INVITE_INVALID,
          "Invalid or inactive invite link. Please ask an administrator for a new invite link.",
        );
      }

      if (
        inviteLink.expiresAt &&
        toTimestamp(inviteLink.expiresAt) < Date.now()
      ) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.ORG_INVITE_EXPIRED,
          "This invite link has expired.",
        );
      }

      if (
        inviteLink.maxUses !== null &&
        inviteLink.usesCount >= inviteLink.maxUses
      ) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.ORG_INVITE_INVALID,
          "This invite link has reached its maximum allowed uses.",
        );
      }

      const org = await tx.organization.findFirst({
        where: { id: inviteLink.organizationId },
        select: {
          id: true,
          name: true,
          slug: true,
          ownerId: true,
          createdAt: true,
        },
      });

      if (!org) {
        throw new AppNotFoundException(
          APP_ERROR_CODES.ORG_NOT_FOUND,
          "Organization not found.",
        );
      }

      const assignedRole = this.resolveValidInviteRole(inviteLink.role);

      // Check if user already has an active membership in this organization
      const userMemberships = await tx.organizationMember.findMany({
        where: { userId },
        select: {
          id: true,
          organizationId: true,
          role: true,
        },
      });

      const existingMembership = userMemberships.find(
        (m) => m.organizationId === org.id,
      );

      if (existingMembership) {
        // User is already a member - switch active organization to this org
        await tx.user.update({
          where: { id: userId },
          data: {
            organizationId: org.id,
            role: existingMembership.role,
          },
        });

        return {
          organization: org,
          role: existingMembership.role,
          message: `Switched to ${org.name}`,
        };
      }

      // Atomic conditional update on invite link uses (H-08)
      const now = new Date();
      const incResult = await tx.inviteLink.updateMany({
        where: {
          id: inviteLink.id,
          status: "ACTIVE",
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          AND: [
            {
              OR: [
                { maxUses: null },
                { usesCount: { lt: inviteLink.maxUses ?? 999999999 } },
              ],
            },
          ],
        },
        data: {
          usesCount: { increment: 1 },
        },
      });

      if (incResult.count === 0) {
        throw new AppBadRequestException(
          APP_ERROR_CODES.ORG_INVITE_INVALID,
          "This invite link has reached its maximum allowed uses.",
        );
      }

      // Record new persistent membership
      const newMemberId = crypto.randomUUID();
      await tx.organizationMember.create({
        data: {
          id: newMemberId,
          organizationId: org.id,
          userId,
          role: assignedRole,
          updatedAt: toInstant(),
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          organizationId: org.id,
          role: assignedRole,
        },
      });

      // Update status to EXPIRED if maxUses reached
      const nextUses = inviteLink.usesCount + 1;
      if (inviteLink.maxUses !== null && nextUses >= inviteLink.maxUses) {
        await tx.inviteLink.update({
          where: { id: inviteLink.id },
          data: { status: "EXPIRED" },
        });
      }

      joinedNewMember = true;

      return {
        organization: org,
        role: assignedRole,
        message: `Successfully joined ${org.name}`,
      };
    });

    if (joinedNewMember) {
      this.eventsService?.emit({
        type: "MEMBERS_CHANGED",
        organizationId: result.organization.id,
        data: { userId },
      });
      this.eventsService?.emit({
        type: "INVITE_LINKS_CHANGED",
        organizationId: result.organization.id,
      });
    } else {
      this.eventsService?.emit({
        type: "ORG_UPDATED",
        targetUserId: userId,
        organizationId: result.organization.id,
      });
    }

    return result;
  }
}
