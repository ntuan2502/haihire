import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  type OnModuleInit,
} from "@nestjs/common";
import crypto from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { EventsService } from "../events/events.service";
import { CreateOrgDto } from "./dto/create-org.dto";
import { JoinOrgDto } from "./dto/join-org.dto";
import { UpdateOrgDto } from "./dto/update-org.dto";
import { toTimestamp } from "../common/date.util";

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

@Injectable()
export class OrganizationsService implements OnModuleInit {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
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
    // 1. Ensure all organization owners have an OrganizationMember record with ADMIN role
    const allOrgs = await this.prisma.db.orm.public.Organization.select("id", "ownerId").all();
    for (const org of allOrgs) {
      if (org.ownerId) {
        const orgMembers = await this.prisma.db.orm.public.OrganizationMember.select("id", "userId")
          .where((m) => m.organizationId.eq(org.id))
          .all();
        const hasOwner = orgMembers.some((m) => m.userId === org.ownerId);
        if (!hasOwner) {
          const id = crypto.randomUUID();
          await this.prisma.db.orm.public.OrganizationMember.upsert({
            create: {
              id,
              organizationId: org.id,
              userId: org.ownerId,
              role: "ADMIN",
            },
            update: {},
            conflictOn: { id },
          });
        }
      }
    }

    // 2. Ensure all users with an active organizationId have an OrganizationMember record
    const allUsers = await this.prisma.db.orm.public.User.select("id", "organizationId", "role").all();
    for (const user of allUsers) {
      if (user.organizationId) {
        const userOrgs = await this.prisma.db.orm.public.OrganizationMember.select("id", "organizationId")
          .where((m) => m.userId.eq(user.id))
          .all();
        const hasActiveOrg = userOrgs.some((m) => m.organizationId === user.organizationId);
        if (!hasActiveOrg) {
          const id = crypto.randomUUID();
          await this.prisma.db.orm.public.OrganizationMember.upsert({
            create: {
              id,
              organizationId: user.organizationId,
              userId: user.id,
              role: user.role === "ADMIN" ? "ADMIN" : "MEMBER",
            },
            update: {},
            conflictOn: { id },
          });
        }
      }
    }
  }


  async create(userId: string, dto: CreateOrgDto) {
    const normalizedSlug = dto.slug.toLowerCase().trim();

    const existing = await this.prisma.db.orm.public.Organization.select(
      "id",
      "slug",
    )
      .where((o) => o.slug.eq(normalizedSlug))
      .first();

    if (existing) {
      throw new ConflictException(
        `Organization with slug '${normalizedSlug}' already exists. Please choose a different slug.`,
      );
    }

    await this.prisma.db.orm.public.Organization.upsert({
      create: {
        name: dto.name.trim(),
        slug: normalizedSlug,
        ownerId: userId,
      },
      update: {
        ownerId: userId,
      },
      conflictOn: { slug: normalizedSlug },
    });

    const org = await this.prisma.db.orm.public.Organization.select(
      "id",
      "name",
      "slug",
      "ownerId",
      "createdAt",
    )
      .where((o) => o.slug.eq(normalizedSlug))
      .first();

    if (!org) {
      throw new NotFoundException("Failed to retrieve created organization");
    }

    // Record membership in OrganizationMember
    const memberId = crypto.randomUUID();
    await this.prisma.db.orm.public.OrganizationMember.upsert({
      create: {
        id: memberId,
        organizationId: org.id,
        userId,
        role: "ADMIN",
      },
      update: {},
      conflictOn: { id: memberId },
    });

    // Link current user to this organization and promote to ADMIN (Owner)
    await this.prisma.db.orm.public.User.where((u) => u.id.eq(userId)).update({
      organizationId: org.id,
      role: "ADMIN",
    });

    return {
      organization: org,
      message: "Organization created successfully",
    };
  }

  async join(userId: string, dto: JoinOrgDto) {
    let rawInput = dto.inviteCodeOrSlug.trim();
    if (!rawInput) {
      throw new BadRequestException("Please provide a valid invite code or link.");
    }

    // Extract token if user passed a full URL (e.g. /join/:token)
    if (rawInput.includes("/join/")) {
      const parts = rawInput.split("/join/");
      rawInput = parts[parts.length - 1].split("?")[0].trim();
    }

    const inviteLink = await this.prisma.db.orm.public.InviteLink.select(
      "id",
      "organizationId",
      "role",
      "status",
      "expiresAt",
      "maxUses",
      "usesCount",
    )
      .where((l) => l.token.eq(rawInput))
      .first();

    if (!inviteLink || inviteLink.status !== "ACTIVE") {
      throw new NotFoundException(
        "Invalid or inactive invite link. Please ask an administrator for a new invite link.",
      );
    }

    if (
      inviteLink.expiresAt &&
      toTimestamp(inviteLink.expiresAt) < Date.now()
    ) {
      throw new BadRequestException("This invite link has expired.");
    }

    if (
      inviteLink.maxUses !== null &&
      inviteLink.usesCount >= inviteLink.maxUses
    ) {
      throw new BadRequestException(
        "This invite link has reached its maximum allowed uses.",
      );
    }

    const org = await this.prisma.db.orm.public.Organization.select(
      "id",
      "name",
      "slug",
      "ownerId",
      "createdAt",
    )
      .where((o) => o.id.eq(inviteLink.organizationId))
      .first();

    if (!org) {
      throw new NotFoundException("Organization not found.");
    }

    const assignedRole = inviteLink.role === "ADMIN" ? "ADMIN" : "MEMBER";

    // Check if user already has an active membership in this organization
    const userMemberships = await this.prisma.db.orm.public.OrganizationMember.select(
      "id",
      "organizationId",
      "role",
    )
      .where((m) => m.userId.eq(userId))
      .all();

    const existingMembership = userMemberships.find((m) => m.organizationId === org.id);

    if (existingMembership) {
      // User is already a member - switch active organization to this org
      await this.prisma.db.orm.public.User.where((u) => u.id.eq(userId)).update({
        organizationId: org.id,
        role: existingMembership.role,
      });

      return {
        organization: org,
        role: existingMembership.role,
        message: `Switched to ${org.name}`,
      };
    }

    await this.prisma.db.orm.public.InviteLink.where((l) =>
      l.id.eq(inviteLink.id),
    ).update({
      usesCount: inviteLink.usesCount + 1,
    });

    // Record new persistent membership
    const newMemberId = crypto.randomUUID();
    await this.prisma.db.orm.public.OrganizationMember.upsert({
      create: {
        id: newMemberId,
        organizationId: org.id,
        userId,
        role: assignedRole,
      },
      update: {},
      conflictOn: { id: newMemberId },
    });

    await this.prisma.db.orm.public.User.where((u) => u.id.eq(userId)).update({
      organizationId: org.id,
      role: assignedRole,
    });

    return {
      organization: org,
      role: assignedRole,
      message: `Successfully joined ${org.name}`,
    };
  }

  async getMyOrg(userId: string) {
    const user = await this.prisma.db.orm.public.User.select(
      "id",
      "organizationId",
    )
      .where((u) => u.id.eq(userId))
      .first();

    if (!user || !user.organizationId) {
      return null;
    }

    return this.prisma.db.orm.public.Organization.select(
      "id",
      "name",
      "slug",
      "ownerId",
      "createdAt",
    )
      .where((o) => o.id.eq(user.organizationId as string))
      .first();
  }

  async getMyOrgs(userId: string) {
    const user = await this.prisma.db.orm.public.User.select(
      "id",
      "organizationId",
    )
      .where((u) => u.id.eq(userId))
      .first();

    if (!user) {
      return [];
    }

    const allOrgs = await this.prisma.db.orm.public.Organization.select(
      "id",
      "name",
      "slug",
      "ownerId",
      "createdAt",
    ).all();

    // Query all persistent memberships for this user
    const userMemberships = await this.prisma.db.orm.public.OrganizationMember.select(
      "id",
      "organizationId",
      "role",
    )
      .where((m) => m.userId.eq(userId))
      .all();

    const memberOrgIds = new Set(userMemberships.map((m) => m.organizationId));

    // Security & Multi-org: Only return organizations the user owns, is an active member of,
    // or is currently switched to.
    return allOrgs.filter(
      (o) =>
        (o.ownerId && o.ownerId === userId) ||
        memberOrgIds.has(o.id) ||
        (user.organizationId && o.id === user.organizationId),
    );
  }

  async switchOrg(userId: string, targetOrgId: string) {
    const user = await this.prisma.db.orm.public.User.select(
      "id",
      "organizationId",
      "role",
    )
      .where((u) => u.id.eq(userId))
      .first();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const org = await this.prisma.db.orm.public.Organization.select(
      "id",
      "name",
      "slug",
      "ownerId",
      "createdAt",
    )
      .where((o) => o.id.eq(targetOrgId))
      .first();

    if (!org) {
      throw new NotFoundException("Organization not found");
    }

    // Security: User must be owner, have an OrganizationMember record, or currently belong to the target org
    const isOwner = Boolean(org.ownerId && org.ownerId === userId);
    const userMemberships = await this.prisma.db.orm.public.OrganizationMember.select(
      "id",
      "organizationId",
      "role",
    )
      .where((m) => m.userId.eq(userId))
      .all();

    const membership = userMemberships.find((m) => m.organizationId === targetOrgId);
    const isCurrentMember = user.organizationId === targetOrgId;

    if (!isOwner && !membership && !isCurrentMember) {
      throw new ForbiddenException(
        "You do not have access to this organization. Please join via an invite link.",
      );
    }

    const targetRole = isOwner
      ? "ADMIN"
      : membership
        ? membership.role
        : (user.role || "MEMBER");

    // Self-healing: ensure membership record exists in OrganizationMember
    if (!membership) {
      const memberId = crypto.randomUUID();
      await this.prisma.db.orm.public.OrganizationMember.upsert({
        create: {
          id: memberId,
          organizationId: targetOrgId,
          userId,
          role: targetRole,
        },
        update: {},
        conflictOn: { id: memberId },
      });
    }

    await this.prisma.db.orm.public.User.where((u) => u.id.eq(userId)).update({
      organizationId: org.id,
      role: targetRole,
    });

    const updatedUser = await this.prisma.db.orm.public.User.select(
      "id",
      "email",
      "name",
      "role",
      "organizationId",
    )
      .where((u) => u.id.eq(userId))
      .first();

    return {
      success: true,
      organization: org,
      user: { ...updatedUser, organization: org, isOwner },
    };
  }

  async updateMyOrg(userId: string, dto: UpdateOrgDto) {
    const user = await this.prisma.db.orm.public.User.select(
      "id",
      "role",
      "organizationId",
    )
      .where((u) => u.id.eq(userId))
      .first();

    if (!user || !user.organizationId) {
      throw new NotFoundException("User is not associated with an organization");
    }

    if (user.role === "MEMBER") {
      throw new ForbiddenException(
        "Members have read-only access. Only Admins can perform this action.",
      );
    }

    const orgId = user.organizationId as string;

    const currentOrg = await this.prisma.db.orm.public.Organization.select(
      "id",
      "slug",
    )
      .where((o) => o.id.eq(orgId))
      .first();

    if (!currentOrg) {
      throw new NotFoundException("Organization not found");
    }

    if (dto.slug) {
      const normalizedSlug = dto.slug.toLowerCase().trim();
      if (normalizedSlug !== currentOrg.slug) {
        const existing = await this.prisma.db.orm.public.Organization.select(
          "id",
        )
          .where((o) => o.slug.eq(normalizedSlug))
          .first();

        if (existing) {
          throw new ConflictException(
            `Organization with slug '${normalizedSlug}' already exists. Please choose a different slug.`,
          );
        }
      }
    }

    const updateData: { name?: string; slug?: string } = {};
    if (dto.name) updateData.name = dto.name.trim();
    if (dto.slug) updateData.slug = dto.slug.toLowerCase().trim();

    if (Object.keys(updateData).length > 0) {
      await this.prisma.db.orm.public.Organization.where((o) =>
        o.id.eq(orgId),
      ).update(updateData);
    }

    return this.prisma.db.orm.public.Organization.select(
      "id",
      "name",
      "slug",
      "ownerId",
      "createdAt",
    )
      .where((o) => o.id.eq(orgId))
      .first();
  }

  async deleteMyOrg(userId: string) {
    const user = await this.prisma.db.orm.public.User.select(
      "id",
      "role",
      "organizationId",
    )
      .where((u) => u.id.eq(userId))
      .first();

    if (!user || !user.organizationId) {
      throw new NotFoundException("User is not associated with an organization");
    }

    if (user.role === "MEMBER") {
      throw new ForbiddenException(
        "Members have read-only access. Only the Organization Owner can perform this action.",
      );
    }

    const orgId = user.organizationId as string;

    const currentOrg = await this.prisma.db.orm.public.Organization.select(
      "id",
      "ownerId",
    )
      .where((o) => o.id.eq(orgId))
      .first();

    if (!currentOrg) {
      throw new NotFoundException("Organization not found");
    }

    if (currentOrg.ownerId !== userId) {
      throw new ForbiddenException(
        "Only the organization owner can delete this organization.",
      );
    }

    // Unlink users from this org
    await this.prisma.db.orm.public.User.where((u) =>
      u.organizationId.eq(orgId),
    ).update({
      organizationId: null,
    });

    // Clean up all memberships in this org
    await this.prisma.db.orm.public.OrganizationMember.where((m) =>
      m.organizationId.eq(orgId),
    ).delete();

    // Delete organization
    await this.prisma.db.orm.public.Organization.where((o) =>
      o.id.eq(orgId),
    ).delete();

    return { success: true, message: "Organization deleted successfully" };
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
    const memberships = await this.prisma.db.orm.public.OrganizationMember.select(
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

    const allUsers = await this.prisma.db.orm.public.User.select(
      "id",
      "name",
      "email",
      "role",
      "avatarUrl",
      "organizationId",
      "createdAt",
    ).all();

    const roleMap = new Map<string, string>();
    for (const m of memberships) {
      roleMap.set(m.userId, m.role);
    }
    if (org?.ownerId) {
      roleMap.set(org.ownerId, "ADMIN");
    }

    const members = allUsers
      .filter((u) => memberUserIds.has(u.id) || u.organizationId === currentOrgId)
      .map((u) => {
        const isOwner = Boolean(org && org.ownerId === u.id);
        const role = isOwner ? "ADMIN" : (roleMap.get(u.id) || u.role || "MEMBER");
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

    // Ensure owner is first in the list
    if (org?.ownerId) {
      const ownerIdx = members.findIndex((m) => m.id === org.ownerId);
      if (ownerIdx > 0) {
        const [owner] = members.splice(ownerIdx, 1);
        members.unshift(owner);
      }
    }

    return members;
  }

  async updateMemberRole(
    callerId: string,
    targetMemberId: string,
    newRole: "ADMIN" | "MEMBER",
  ) {
    const caller = await this.prisma.db.orm.public.User.select(
      "id",
      "role",
      "organizationId",
    )
      .where((u) => u.id.eq(callerId))
      .first();

    if (!caller || !caller.organizationId) {
      throw new NotFoundException("User is not associated with an organization");
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
      throw new ForbiddenException(
        "Only organization owners and administrators can change member roles.",
      );
    }

    // Cannot change role of Owner
    if (org && org.ownerId === targetMemberId) {
      throw new BadRequestException("Cannot change the role of the organization owner");
    }

    const orgMembers = await this.prisma.db.orm.public.OrganizationMember.select(
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

    if (!membership && (!targetUser || targetUser.organizationId !== targetOrgId)) {
      throw new NotFoundException("Member not found in this organization");
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
      throw new NotFoundException("User is not associated with an organization");
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
      throw new ForbiddenException(
        "Only organization owners and administrators can remove members.",
      );
    }

    if (callerId === targetMemberId) {
      throw new BadRequestException("You cannot remove yourself from the organization");
    }

    // Cannot remove Owner
    if (org && org.ownerId === targetMemberId) {
      throw new BadRequestException("Cannot remove the organization owner");
    }

    // Remove from OrganizationMember
    const memberRecords = await this.prisma.db.orm.public.OrganizationMember.select(
      "id",
      "userId",
    )
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
      const remainingMembership = await this.prisma.db.orm.public.OrganizationMember.select(
        "organizationId",
        "role",
      )
        .where((m) => m.userId.eq(targetMemberId))
        .first();

      const fallbackOrgId = remainingMembership ? remainingMembership.organizationId : null;
      const fallbackRole = remainingMembership ? remainingMembership.role : "MEMBER";

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

  // ==========================================
  // INVITE LINKS MANAGEMENT (DATABASE PERSISTENCE)
  // ==========================================
  async createInviteLink(
    userId: string,
    dto: { role?: string; expiresIn?: string; maxUses?: string },
  ): Promise<InviteLinkRecord> {
    const user = await this.prisma.db.orm.public.User.select(
      "id",
      "name",
      "role",
      "organizationId",
    )
      .where((u) => u.id.eq(userId))
      .first();

    if (!user || !user.organizationId) {
      throw new NotFoundException("User is not associated with an organization");
    }

    const org = await this.prisma.db.orm.public.Organization.select(
      "id",
      "name",
      "slug",
      "ownerId",
    )
      .where((o) => o.id.eq(user.organizationId as string))
      .first();

    if (!org) {
      throw new NotFoundException("Organization not found");
    }

    const isOwner = Boolean(org.ownerId && org.ownerId === user.id);
    const isAdmin = user.role === "ADMIN";

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        "Only organization owners and administrators can create invite links.",
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
        ? Temporal.Instant.fromEpochMilliseconds(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
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
    const linkRole = dto.role === "ADMIN" ? "ADMIN" : "MEMBER";

    await this.prisma.db.orm.public.InviteLink.upsert({
      create: {
        id,
        token,
        organizationId: org.id,
        role: linkRole,
        expiresAt,
        maxUses,
        usesCount: 0,
        status: "ACTIVE",
        createdById: user.id,
      },
      update: {},
      conflictOn: { id: "00000000-0000-0000-0000-000000000000" },
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
    const user = await this.prisma.db.orm.public.User.select(
      "id",
      "role",
      "organizationId",
    )
      .where((u) => u.id.eq(userId))
      .first();

    if (!user || !user.organizationId) {
      return [];
    }

    const orgId = user.organizationId as string;
    const org = await this.prisma.db.orm.public.Organization.select(
      "id",
      "name",
      "slug",
      "ownerId",
    )
      .where((o) => o.id.eq(orgId))
      .first();

    const isOwner = Boolean(org && org.ownerId === user.id);
    const isAdmin = user.role === "ADMIN";

    // Security: Only Admin and Owner can view invite links
    if (!isAdmin && !isOwner) {
      return [];
    }

    const allLinks = await this.prisma.db.orm.public.InviteLink.select(
      "id",
      "token",
      "role",
      "expiresAt",
      "maxUses",
      "usesCount",
      "status",
      "organizationId",
      "createdById",
      "createdAt",
    )
      .where((l) => l.organizationId.eq(orgId))
      .all();

    const links = allLinks.filter((l) => l.status !== "REVOKED");

    const users = await this.prisma.db.orm.public.User.select("id", "name")
      .where((u) => u.organizationId.eq(orgId))
      .all();
    const userMap = new Map(users.map((u) => [u.id, u.name]));

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
        expiresAt: link.expiresAt ? new Date(toTimestamp(link.expiresAt)).toISOString() : null,
        maxUses: link.maxUses,
        usesCount: link.usesCount,
        createdById: link.createdById,
        createdByName: (link.createdById && userMap.get(link.createdById)) || "Admin",
        status,
        createdAt: new Date(toTimestamp(link.createdAt)).toISOString(),
      };
    });
  }

  async revokeInviteLink(userId: string, linkId: string) {
    const user = await this.prisma.db.orm.public.User.select(
      "id",
      "role",
      "organizationId",
    )
      .where((u) => u.id.eq(userId))
      .first();

    if (!user || !user.organizationId) {
      throw new NotFoundException("User is not associated with an organization");
    }

    const org = await this.prisma.db.orm.public.Organization.select(
      "id",
      "ownerId",
    )
      .where((o) => o.id.eq(user.organizationId as string))
      .first();

    const isOwner = Boolean(org && org.ownerId === user.id);
    const isAdmin = user.role === "ADMIN";

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        "Only organization owners and administrators can revoke invite links.",
      );
    }

    await this.prisma.db.orm.public.InviteLink.where((l) =>
      l.id.eq(linkId),
    ).update({
      status: "REVOKED",
    });

    return { success: true, message: "Invite link revoked successfully" };
  }

  async getPublicInvite(token: string) {
    const link = await this.prisma.db.orm.public.InviteLink.select(
      "id",
      "token",
      "role",
      "expiresAt",
      "maxUses",
      "usesCount",
      "status",
      "organizationId",
      "createdById",
    )
      .where((l) => l.token.eq(token))
      .first();

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

    const org = await this.prisma.db.orm.public.Organization.select(
      "id",
      "name",
      "slug",
    )
      .where((o) => o.id.eq(link.organizationId))
      .first();

    let createdByName = "Team Member";
    if (link.createdById) {
      const creator = await this.prisma.db.orm.public.User.select("id", "name")
        .where((u) => u.id.eq(link.createdById as string))
        .first();
      if (creator?.name) {
        createdByName = creator.name;
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
      expiresAt: link.expiresAt ? new Date(toTimestamp(link.expiresAt)).toISOString() : null,
    };
  }

  async joinByToken(userId: string, token: string) {
    const link = await this.prisma.db.orm.public.InviteLink.select(
      "id",
      "token",
      "role",
      "expiresAt",
      "maxUses",
      "usesCount",
      "status",
      "organizationId",
    )
      .where((l) => l.token.eq(token))
      .first();

    if (!link) {
      throw new NotFoundException("Invite link not found or invalid");
    }

    if (link.status === "REVOKED") {
      throw new BadRequestException("This invitation link has been revoked");
    }

    if (link.expiresAt && toTimestamp(link.expiresAt) < Date.now()) {
      throw new BadRequestException("This invitation link has expired");
    }

    if (link.maxUses !== null && link.usesCount >= link.maxUses) {
      throw new BadRequestException(
        "This invitation link has reached its maximum allowed uses",
      );
    }

    // Check if user is already a member of this organization
    const user = await this.prisma.db.orm.public.User.select(
      "id",
      "organizationId",
    )
      .where((u) => u.id.eq(userId))
      .first();

    const userMemberships = await this.prisma.db.orm.public.OrganizationMember.select(
      "id",
      "organizationId",
      "role",
    )
      .where((m) => m.userId.eq(userId))
      .all();

    const isAlreadyMember =
      userMemberships.some((m) => m.organizationId === link.organizationId) ||
      (user && user.organizationId === link.organizationId);

    if (isAlreadyMember) {
      throw new BadRequestException(
        "You are already a member of this organization.",
      );
    }

    // Link user to organization with the role assigned on the invite link (ADMIN or MEMBER)
    const assignedRole = (link.role === "ADMIN" ? "ADMIN" : "MEMBER") as "ADMIN" | "MEMBER";

    // Record persistent membership in OrganizationMember
    const newMemberId = crypto.randomUUID();
    await this.prisma.db.orm.public.OrganizationMember.upsert({
      create: {
        id: newMemberId,
        organizationId: link.organizationId,
        userId,
        role: assignedRole,
      },
      update: {},
      conflictOn: { id: newMemberId },
    });

    await this.prisma.db.orm.public.User.where((u) => u.id.eq(userId)).update({
      organizationId: link.organizationId,
      role: assignedRole,
    });

    // Increment uses count
    const nextUses = link.usesCount + 1;
    const nextStatus: "ACTIVE" | "EXPIRED" | "REVOKED" =
      link.maxUses !== null && nextUses >= link.maxUses ? "EXPIRED" : link.status;

    await this.prisma.db.orm.public.InviteLink.where((l) =>
      l.id.eq(link.id),
    ).update({
      usesCount: nextUses,
      status: nextStatus,
    });

    const org = await this.prisma.db.orm.public.Organization.select(
      "id",
      "name",
      "slug",
    )
      .where((o) => o.id.eq(link.organizationId))
      .first();

    return {
      success: true,
      organization: org,
      role: link.role,
      message: `Successfully joined ${org?.name || "organization"}`,
    };
  }

  async getPublicOrg(slug: string) {
    const org = await this.prisma.db.orm.public.Organization.select(
      "id",
      "name",
      "slug",
      "createdAt",
    )
      .where((o) => o.slug.eq(slug))
      .first();

    if (!org) {
      throw new NotFoundException(`Organization '${slug}' not found`);
    }

    return org;
  }
}
