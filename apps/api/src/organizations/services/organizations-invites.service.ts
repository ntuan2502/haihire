import { Inject, Injectable } from "@nestjs/common";
import crypto from "node:crypto";
import { PrismaService, runInTransaction } from "../../prisma/prisma.service";
import { JoinOrgDto } from "../dto/join-org.dto";
import { toTimestamp, toInstant } from "../../common/date.util";
import {
  AppBadRequestException,
  AppForbiddenException,
  AppNotFoundException,
} from "../../common/app-exception";
import { APP_ERROR_CODES } from "@haihire/shared";

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
export class OrganizationsInvitesService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async createInviteLink(
    userId: string,
    dto: { role?: string; expiresIn?: string; maxUses?: string },
  ): Promise<InviteLinkRecord> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        organizationId: true,
      },
    });

    if (!user || !user.organizationId) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_USER_NO_ORG,
        "User is not associated with an organization",
      );
    }

    const org = await this.prisma.organization.findFirst({
      where: { id: user.organizationId as string },
      select: {
        id: true,
        name: true,
        slug: true,
        ownerId: true,
      },
    });

    if (!org) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_NOT_FOUND,
        "Organization not found",
      );
    }

    const isOwner = Boolean(org.ownerId && org.ownerId === user.id);
    const isAdmin = user.role === "ADMIN";

    if (!isAdmin && !isOwner) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
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
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        organizationId: true,
      },
    });

    if (!user || !user.organizationId) {
      return [];
    }

    const orgId = user.organizationId as string;
    const org = await this.prisma.organization.findFirst({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        ownerId: true,
      },
    });

    const isOwner = Boolean(org && org.ownerId === user.id);
    const isAdmin = user.role === "ADMIN";

    // Security: Only Admin and Owner can view invite links
    if (!isAdmin && !isOwner) {
      return [];
    }

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

    const users = await this.prisma.user.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
    });
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
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        organizationId: true,
      },
    });

    if (!user || !user.organizationId) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_USER_NO_ORG,
        "User is not associated with an organization",
      );
    }

    const orgId = user.organizationId;
    const org = await this.prisma.organization.findFirst({
      where: { id: orgId },
      select: {
        id: true,
        ownerId: true,
      },
    });

    const isOwner = Boolean(org && org.ownerId === user.id);
    const isAdmin = user.role === "ADMIN";

    if (!isAdmin && !isOwner) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
        "Only organization owners and administrators can revoke invite links.",
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
      },
    });

    let createdByName = "Team Member";
    if (link.createdById) {
      const creator = await this.prisma.user.findFirst({
        where: { id: link.createdById as string },
        select: { id: true, name: true },
      });
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
      expiresAt: link.expiresAt
        ? new Date(toTimestamp(link.expiresAt)).toISOString()
        : null,
    };
  }

  async joinByToken(userId: string, token: string) {
    return await runInTransaction(this.prisma, async (tx) => {
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

      const assignedRole = (link.role === "ADMIN" ? "ADMIN" : "MEMBER") as
        | "ADMIN"
        | "MEMBER";

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
        role: link.role,
        message: `Successfully joined ${org?.name || "organization"}`,
      };
    });
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

    return await runInTransaction(this.prisma, async (tx) => {
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

      const assignedRole = inviteLink.role === "ADMIN" ? "ADMIN" : "MEMBER";

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

      return {
        organization: org,
        role: assignedRole,
        message: `Successfully joined ${org.name}`,
      };
    });
  }
}
