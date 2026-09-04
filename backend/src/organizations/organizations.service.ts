import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import crypto from "node:crypto";
import { PrismaService } from "../prisma.service";
import { CreateOrgDto } from "./dto/create-org.dto";
import { JoinOrgDto } from "./dto/join-org.dto";
import { UpdateOrgDto } from "./dto/update-org.dto";

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
export class OrganizationsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  private generateInviteCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "ORG-";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
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

    const inviteCode = this.generateInviteCode();

    await this.prisma.db.orm.public.Organization.upsert({
      create: {
        name: dto.name.trim(),
        slug: normalizedSlug,
        inviteCode,
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
      "inviteCode",
      "ownerId",
      "createdAt",
    )
      .where((o) => o.slug.eq(normalizedSlug))
      .first();

    if (!org) {
      throw new NotFoundException("Failed to retrieve created organization");
    }

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

    if (!inviteLink || inviteLink.status !== "active") {
      throw new NotFoundException(
        "Invalid or inactive invite link. Please ask an administrator for a new invite link.",
      );
    }

    if (
      inviteLink.expiresAt &&
      new Date(inviteLink.expiresAt) < new Date()
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
      "inviteCode",
      "ownerId",
      "createdAt",
    )
      .where((o) => o.id.eq(inviteLink.organizationId))
      .first();

    if (!org) {
      throw new NotFoundException("Organization not found.");
    }

    const user = await this.prisma.db.orm.public.User.select(
      "id",
      "organizationId",
    )
      .where((u) => u.id.eq(userId))
      .first();

    if (user && user.organizationId === org.id) {
      throw new BadRequestException(
        "You are already a member of this organization.",
      );
    }

    await this.prisma.db.orm.public.InviteLink.where((l) =>
      l.id.eq(inviteLink.id),
    ).update({
      usesCount: inviteLink.usesCount + 1,
    });

    const assignedRole = inviteLink.role === "ADMIN" ? "ADMIN" : "MEMBER";
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
      "inviteCode",
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
      "inviteCode",
      "ownerId",
      "createdAt",
    ).all();

    // Security: Only return organizations the user actually belongs to or owns
    return allOrgs.filter(
      (o) =>
        (user.organizationId && o.id === user.organizationId) ||
        (o.ownerId && o.ownerId === userId),
    );
  }

  async switchOrg(userId: string, targetOrgId: string) {
    const user = await this.prisma.db.orm.public.User.select(
      "id",
      "organizationId",
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
      "inviteCode",
      "ownerId",
      "createdAt",
    )
      .where((o) => o.id.eq(targetOrgId))
      .first();

    if (!org) {
      throw new NotFoundException("Organization not found");
    }

    // Security: User must be owner or already a member of the target org
    const isOwner = Boolean(org.ownerId && org.ownerId === userId);
    const isCurrentMember = user.organizationId === targetOrgId;

    if (!isOwner && !isCurrentMember) {
      throw new ForbiddenException(
        "You do not have access to this organization. Please join via an invite link.",
      );
    }

    await this.prisma.db.orm.public.User.where((u) => u.id.eq(userId)).update({
      organizationId: org.id,
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
      user: { ...updatedUser, organization: org },
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
      "inviteCode",
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

    const org = await this.prisma.db.orm.public.Organization.select(
      "id",
      "ownerId",
    )
      .where((o) => o.id.eq(user.organizationId as string))
      .first();

    const members = await this.prisma.db.orm.public.User.select(
      "id",
      "name",
      "email",
      "role",
      "avatarUrl",
      "createdAt",
    )
      .where((u) => u.organizationId.eq(user.organizationId as string))
      .all();

    return members.map((m) => ({
      ...m,
      isOwner: Boolean(org && org.ownerId === m.id),
    }));
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

    const org = await this.prisma.db.orm.public.Organization.select(
      "id",
      "ownerId",
    )
      .where((o) => o.id.eq(caller.organizationId as string))
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

    // Target user must belong to caller's org
    const targetUser = await this.prisma.db.orm.public.User.select(
      "id",
      "organizationId",
      "role",
    )
      .where((u) => u.id.eq(targetMemberId))
      .first();

    if (!targetUser || targetUser.organizationId !== caller.organizationId) {
      throw new NotFoundException("Member not found in this organization");
    }

    await this.prisma.db.orm.public.User.where((u) =>
      u.id.eq(targetMemberId),
    ).update({
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

    const org = await this.prisma.db.orm.public.Organization.select(
      "id",
      "ownerId",
    )
      .where((o) => o.id.eq(caller.organizationId as string))
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

    const targetUser = await this.prisma.db.orm.public.User.select(
      "id",
      "organizationId",
    )
      .where((u) => u.id.eq(targetMemberId))
      .first();

    if (!targetUser || targetUser.organizationId !== caller.organizationId) {
      throw new NotFoundException("Member not found in this organization");
    }

    await this.prisma.db.orm.public.User.where((u) =>
      u.id.eq(targetMemberId),
    ).update({
      organizationId: null,
      role: "MEMBER",
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
        status: "active",
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
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      maxUses,
      usesCount: 0,
      createdById: user.id,
      createdByName: user.name || "Team Member",
      status: "active",
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

    const links = allLinks.filter((l) => l.status !== "revoked");

    const users = await this.prisma.db.orm.public.User.select("id", "name")
      .where((u) => u.organizationId.eq(orgId))
      .all();
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    const now = new Date();
    return links.map((link) => {
      let status = link.status;
      if (status === "active") {
        if (link.expiresAt && new Date(link.expiresAt) < now) {
          status = "inactive";
        } else if (link.maxUses !== null && link.usesCount >= link.maxUses) {
          status = "inactive";
        }
      }

      return {
        id: link.id,
        token: link.token,
        organizationId: link.organizationId,
        organizationName: org?.name || "Organization",
        organizationSlug: org?.slug || "org",
        role: link.role,
        expiresAt: link.expiresAt ? new Date(link.expiresAt).toISOString() : null,
        maxUses: link.maxUses,
        usesCount: link.usesCount,
        createdById: link.createdById,
        createdByName: (link.createdById && userMap.get(link.createdById)) || "Admin",
        status,
        createdAt: new Date(link.createdAt).toISOString(),
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
      status: "revoked",
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

    if (link.status === "revoked") {
      return {
        valid: false,
        message: "This invitation link has been revoked by an administrator",
        link,
      };
    }

    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
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
      expiresAt: link.expiresAt ? new Date(link.expiresAt).toISOString() : null,
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

    if (link.status === "revoked") {
      throw new BadRequestException("This invitation link has been revoked");
    }

    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
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

    if (user && user.organizationId === link.organizationId) {
      throw new BadRequestException(
        "You are already a member of this organization.",
      );
    }

    // Link user to organization with the role assigned on the invite link (ADMIN or MEMBER)
    const assignedRole = (link.role === "ADMIN" ? "ADMIN" : "MEMBER") as "ADMIN" | "MEMBER";
    await this.prisma.db.orm.public.User.where((u) => u.id.eq(userId)).update({
      organizationId: link.organizationId,
      role: assignedRole,
    });

    // Increment uses count
    const nextUses = link.usesCount + 1;
    const nextStatus =
      link.maxUses !== null && nextUses >= link.maxUses ? "inactive" : link.status;

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
      "inviteCode",
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
}
