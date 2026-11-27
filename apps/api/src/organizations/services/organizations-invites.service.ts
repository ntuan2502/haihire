import { Inject, Injectable, Optional } from "@nestjs/common";
import crypto from "node:crypto";
import { PrismaService, runInTransaction } from "../../prisma/prisma.service";
import { PermissionResolverService } from "../../auth/permission-resolver.service";
import { JoinOrgDto } from "../dto/join-org.dto";
import { toTimestamp, toInstant } from "../../common/date.util";
import {
  AppBadRequestException,
  AppConflictException,
  AppForbiddenException,
  AppNotFoundException,
} from "../../common/app-exception";
import {
  APP_ERROR_CODES,
  ROLE_LIST,
  Role,
  formatUserDisplayName,
  hasPermission,
  normalizeOrgLocalization,
  type DerivedInviteStatus,
  type InviteLinkUsageItem,
  type InviteType,
  type NameDisplayOrder,
} from "@haihire/shared";
import { EventsService } from "../../events/events.service";
import { EmailSystemService } from "../../email/services/email-system.service";
import { OrganizationsAuditLogService } from "./organizations-audit-log.service";
import { env } from "../../config/env";
import {
  attachOrganizationLogoUrl,
  buildOrganizationLogoUrl,
  getPreferredMembershipOrderBy,
  getPreferredOwnedOrgOrderBy,
} from "../organization-logo.util";

export interface InviteLinkRecord {
  id: string;
  token: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: string;
  invitedEmail: string | null;
  inviteType: InviteType;
  expiresAt: string | null;
  maxUses: number | null;
  usesCount: number;
  createdById: string | null;
  createdByName: string;
  status: string;
  derivedStatus: DerivedInviteStatus;
  recentUsages: InviteLinkUsageItem[];
  createdAt: string;
}

function maskEmail(email: string): string {
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf("@");
  if (atIndex <= 0) return "***";
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

function computeDerivedStatus(input: {
  status: string;
  invitedEmail: string | null;
  maxUses: number | null;
  usesCount: number;
  expiresAt: unknown;
}): DerivedInviteStatus {
  if (input.status === "REVOKED") {
    return "REVOKED";
  }
  const isExpiredByDate = Boolean(
    input.expiresAt && toTimestamp(input.expiresAt) < Date.now(),
  );
  if (input.invitedEmail) {
    if (input.usesCount > 0) return "ACCEPTED";
    if (isExpiredByDate || input.status === "EXPIRED") return "EXPIRED";
    return "PENDING";
  }
  if (input.maxUses !== null && input.usesCount >= input.maxUses) {
    return "LIMIT_REACHED";
  }
  if (isExpiredByDate || input.status === "EXPIRED") {
    return "EXPIRED";
  }
  return "ACTIVE";
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
    @Optional()
    @Inject(EmailSystemService)
    private readonly emailSystemService?: EmailSystemService,
    @Optional()
    @Inject(OrganizationsAuditLogService)
    private readonly auditLog?: OrganizationsAuditLogService,
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
    activeOrgId?: string | null,
  ): Promise<MemberInviteContext | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      return null;
    }

    const prismaPartial: Partial<Pick<PrismaService, "organizationMember">> =
      this.prisma;

    const legacyUserOrgId = (
      user as unknown as { organizationId?: string | null }
    )?.organizationId;
    const legacyUserRole = (user as unknown as { role?: string })?.role;

    let orgId: string | null = activeOrgId || null;
    let fallbackMembershipRole: string | undefined;

    if (
      !orgId &&
      typeof prismaPartial.organizationMember?.findFirst === "function"
    ) {
      const firstMembership = await this.prisma.organizationMember.findFirst({
        where: { userId: user.id },
        orderBy: getPreferredMembershipOrderBy(),
        select: { organizationId: true, role: true },
      });
      if (firstMembership?.organizationId) {
        orgId = firstMembership.organizationId;
        fallbackMembershipRole = firstMembership.role;
      }
    }

    if (!orgId && typeof this.prisma.organization?.findFirst === "function") {
      const ownedOrg = await this.prisma.organization.findFirst({
        where: { ownerId: user.id },
        orderBy: getPreferredOwnedOrgOrderBy(),
        select: { id: true },
      });
      if (ownedOrg?.id) {
        orgId = ownedOrg.id;
      }
    }

    if (!orgId) {
      orgId = legacyUserOrgId ?? null;
    }

    if (!orgId) {
      return null;
    }

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

    const isOwner = Boolean(org && org.ownerId === user.id);
    if (
      typeof prismaPartial.organizationMember?.findFirst === "function" &&
      !membership &&
      !isOwner &&
      legacyUserOrgId !== orgId
    ) {
      return null;
    }

    const rawEffectiveRole = isOwner
      ? "ADMIN"
      : (membership?.role ??
        fallbackMembershipRole ??
        legacyUserRole ??
        "MEMBER");
    const effectiveRole =
      ROLE_LIST.find(
        (role) => role === rawEffectiveRole.trim().toUpperCase(),
      ) ?? Role.MEMBER;
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
        role: effectiveRole,
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
    dto: {
      role?: string;
      expiresIn?: string;
      maxUses?: string;
      email?: string;
    },
    activeOrgId?: string | null,
    auditAction: "INVITE_CREATED" | "INVITE_RESENT" = "INVITE_CREATED",
    previousLinkId?: string,
  ): Promise<InviteLinkRecord> {
    const ctx = await this.resolveMemberInviteContext(userId, activeOrgId);
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

    const invitedEmail = dto.email?.trim()
      ? dto.email.trim().toLowerCase()
      : null;

    if (invitedEmail) {
      const existingUser = await this.prisma.user.findFirst({
        where: { email: invitedEmail },
        select: { id: true, email: true },
      });
      const matchedUser =
        existingUser &&
        existingUser.email?.trim().toLowerCase() === invitedEmail
          ? existingUser
          : null;

      if (matchedUser) {
        const isOwnerAlready = Boolean(
          org.ownerId && org.ownerId === matchedUser.id,
        );
        const existingMember =
          typeof this.prisma.organizationMember?.findFirst === "function"
            ? await this.prisma.organizationMember.findFirst({
                where: {
                  organizationId: org.id,
                  userId: matchedUser.id,
                },
                select: { id: true },
              })
            : null;
        const legacyOrgId = (
          matchedUser as unknown as { organizationId?: string | null }
        ).organizationId;
        if (isOwnerAlready || existingMember || legacyOrgId === org.id) {
          throw new AppConflictException(
            APP_ERROR_CODES.ORG_MEMBER_ALREADY_EXISTS,
            "This user is already a member of the organization.",
          );
        }
      }

      if (typeof this.prisma.inviteLink?.updateMany === "function") {
        await this.prisma.inviteLink.updateMany({
          where: {
            organizationId: org.id,
            invitedEmail,
            status: "ACTIVE",
          },
          data: { status: "REVOKED" },
        });
      }
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

    // Calculate max uses (email invitations are always single-use)
    let maxUses: number | null = invitedEmail ? 1 : null;
    if (!invitedEmail) {
      const rawUses = dto.maxUses || "Unlimited";
      if (rawUses !== "Unlimited") {
        const parsed = parseInt(rawUses, 10);
        if (!isNaN(parsed) && parsed > 0) {
          maxUses = parsed;
        }
      }
    }

    const id = crypto.randomUUID();

    await this.prisma.inviteLink.create({
      data: {
        id,
        token,
        organizationId: org.id,
        role: linkRole,
        invitedEmail,
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

    if (invitedEmail && this.emailSystemService) {
      const escapeHtml = (val: string) =>
        val
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      const joinUrl = `${env.FRONTEND_URL.replace(/\/$/, "")}/auth/join/${token}`;
      await this.emailSystemService.sendSystemEmail({
        to: invitedEmail,
        recipientName: invitedEmail,
        organizationId: org.id,
        templateType: "CUSTOM",
        subject: `Invitation to join ${org.name} on HaiHire`,
        body: `<p>Hello,</p><p><strong>${escapeHtml(user.name || "A team member")}</strong> has invited you to join <strong>${escapeHtml(org.name)}</strong> on HaiHire as <strong>${escapeHtml(linkRole)}</strong>.</p><p><a href="${escapeHtml(joinUrl)}">Accept Invitation</a></p><p>This invitation link expires in 7 days and can be used once.</p>`,
      });
    }

    const inviteType: InviteType = invitedEmail ? "EMAIL" : "LINK";

    await this.auditLog?.logOrg(
      org.id,
      user.id,
      auditAction,
      "INVITATION",
      auditAction === "INVITE_RESENT"
        ? {
            linkId: id,
            previousLinkId: previousLinkId ?? null,
            invitedEmail,
            role: linkRole,
          }
        : {
            linkId: id,
            inviteType,
            role: linkRole,
            ...(invitedEmail ? { invitedEmail } : {}),
          },
      undefined,
      {
        targetId: id,
        targetLabel: invitedEmail ?? linkRole,
        changes:
          auditAction === "INVITE_RESENT"
            ? [
                {
                  field: "previousLinkId",
                  before: previousLinkId ?? null,
                  after: id,
                },
              ]
            : [
                { field: "inviteType", before: null, after: inviteType },
                { field: "role", before: null, after: linkRole },
                ...(invitedEmail
                  ? [
                      {
                        field: "invitedEmail",
                        before: null,
                        after: invitedEmail,
                      },
                    ]
                  : []),
              ],
      },
    );

    this.eventsService?.emit({
      type: "AUDIT_LOGS_CHANGED",
      organizationId: org.id,
    });

    return {
      id,
      token,
      organizationId: org.id,
      organizationName: org.name,
      organizationSlug: org.slug,
      role: linkRole,
      invitedEmail,
      inviteType,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      maxUses,
      usesCount: 0,
      createdById: user.id,
      createdByName: user.name || "Team Member",
      status: "ACTIVE",
      derivedStatus: invitedEmail ? "PENDING" : "ACTIVE",
      recentUsages: [],
      createdAt: new Date().toISOString(),
    };
  }

  async resendInviteLink(
    userId: string,
    linkId: string,
    activeOrgId?: string | null,
  ): Promise<InviteLinkRecord> {
    const ctx = await this.resolveMemberInviteContext(userId, activeOrgId);
    if (!ctx) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_USER_NO_ORG,
        "User is not associated with an organization",
      );
    }

    const { orgId, isOwner, effectiveRole, canManageMembers } = ctx;
    if (!canManageMembers) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
        "You do not have permission to resend invite links.",
      );
    }

    const existing = await this.prisma.inviteLink.findFirst({
      where: { id: linkId, organizationId: orgId },
      select: {
        id: true,
        invitedEmail: true,
        role: true,
        usesCount: true,
        status: true,
      },
    });

    if (!existing || !existing.invitedEmail) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_INVITE_INVALID,
        "Email invitation not found in the active organization",
      );
    }

    const existingRole = this.resolveValidInviteRole(existing.role);
    if (
      existingRole === Role.ADMIN &&
      !isOwner &&
      effectiveRole !== Role.ADMIN
    ) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
        "Only organization owners and administrators can resend admin invitations.",
      );
    }

    if (existing.usesCount > 0) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.ORG_INVITE_MAX_USES_REACHED,
        "This invitation has already been accepted.",
      );
    }

    return this.createInviteLink(
      userId,
      {
        email: existing.invitedEmail,
        role: existingRole,
        expiresIn: "7 days",
        maxUses: "1",
      },
      orgId,
      "INVITE_RESENT",
      linkId,
    );
  }

  async getInviteLinks(
    userId: string,
    activeOrgId?: string | null,
    includeRevoked = false,
  ): Promise<InviteLinkRecord[]> {
    const ctx = await this.resolveMemberInviteContext(userId, activeOrgId);
    if (!ctx || !ctx.canManageMembers) {
      return [];
    }

    const { orgId, org } = ctx;

    const allLinks = await this.prisma.inviteLink.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        token: true,
        role: true,
        invitedEmail: true,
        expiresAt: true,
        maxUses: true,
        usesCount: true,
        status: true,
        organizationId: true,
        createdById: true,
        createdAt: true,
      },
    });

    const links = (
      includeRevoked ? allLinks : allLinks.filter((l) => l.status !== "REVOKED")
    ).sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt));

    const linkIds = links.map((l) => l.id);
    const prismaWithUsage = this.prisma as unknown as {
      inviteLinkUsage?: {
        findMany?: (args: {
          where: {
            organizationId: string;
            inviteLinkId: { in: string[] };
          };
          orderBy?: { usedAt: "desc" };
          take?: number;
          select?: {
            id: boolean;
            inviteLinkId: boolean;
            userId: boolean;
            userEmailSnapshot: boolean;
            usedAt: boolean;
          };
        }) => Promise<
          Array<{
            id: string;
            inviteLinkId: string;
            userId: string | null;
            userEmailSnapshot: string;
            usedAt: Date | string;
          }>
        >;
      };
    };

    const rawUsages =
      linkIds.length > 0 &&
      typeof prismaWithUsage.inviteLinkUsage?.findMany === "function"
        ? await prismaWithUsage.inviteLinkUsage.findMany({
            where: {
              organizationId: orgId,
              inviteLinkId: { in: linkIds },
            },
            orderBy: { usedAt: "desc" },
            take: Math.min(Math.max(linkIds.length * 10, 50), 1000),
            select: {
              id: true,
              inviteLinkId: true,
              userId: true,
              userEmailSnapshot: true,
              usedAt: true,
            },
          })
        : [];

    const orgOrder: NameDisplayOrder =
      org?.nameDisplayOrder === "LAST_FIRST" ? "LAST_FIRST" : "FIRST_LAST";

    const referencedUserIds = new Set<string>();
    for (const l of links) {
      if (l.createdById) referencedUserIds.add(l.createdById);
    }
    for (const u of rawUsages) {
      if (u.userId) referencedUserIds.add(u.userId);
    }

    const users =
      referencedUserIds.size > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: Array.from(referencedUserIds) } },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
            },
          })
        : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const usagesByLinkId = new Map<string, InviteLinkUsageItem[]>();
    const sortedUsages = [...rawUsages].sort(
      (a, b) => toTimestamp(b.usedAt) - toTimestamp(a.usedAt),
    );
    for (const usage of sortedUsages) {
      const bucket = usagesByLinkId.get(usage.inviteLinkId) ?? [];
      if (bucket.length >= 5) continue;
      const usageUser = usage.userId ? userMap.get(usage.userId) : undefined;
      const displayName =
        (usageUser && formatUserDisplayName(usageUser, orgOrder)) ||
        usageUser?.email ||
        usage.userEmailSnapshot;
      bucket.push({
        id: usage.id,
        userId: usage.userId,
        userName: displayName,
        userEmail: usageUser?.email ?? usage.userEmailSnapshot,
        userAvatarUrl: usageUser?.avatarUrl ?? null,
        usedAt: new Date(toTimestamp(usage.usedAt)).toISOString(),
      });
      usagesByLinkId.set(usage.inviteLinkId, bucket);
    }

    return links.map((link) => {
      const invitedEmail = link.invitedEmail ?? null;
      const inviteType: InviteType = invitedEmail ? "EMAIL" : "LINK";
      const derivedStatus = computeDerivedStatus({
        status: link.status,
        invitedEmail,
        maxUses: link.maxUses,
        usesCount: link.usesCount,
        expiresAt: link.expiresAt,
      });

      let status = link.status;
      if (status === "ACTIVE") {
        if (link.expiresAt && toTimestamp(link.expiresAt) < Date.now()) {
          status = "EXPIRED";
        } else if (link.maxUses !== null && link.usesCount >= link.maxUses) {
          status = "EXPIRED";
        }
      }

      const creator = link.createdById
        ? userMap.get(link.createdById)
        : undefined;
      const createdByName =
        (creator && formatUserDisplayName(creator, orgOrder)) || "Admin";

      return {
        id: link.id,
        token: link.token,
        organizationId: link.organizationId,
        organizationName: org?.name || "Organization",
        organizationSlug: org?.slug || "org",
        role: link.role,
        invitedEmail,
        inviteType,
        expiresAt: link.expiresAt
          ? new Date(toTimestamp(link.expiresAt)).toISOString()
          : null,
        maxUses: link.maxUses,
        usesCount: link.usesCount,
        createdById: link.createdById,
        createdByName,
        status,
        derivedStatus,
        recentUsages: usagesByLinkId.get(link.id) ?? [],
        createdAt: new Date(toTimestamp(link.createdAt)).toISOString(),
      };
    });
  }

  async getInviteLinkUsages(
    userId: string,
    linkId: string,
    activeOrgId?: string | null,
  ): Promise<InviteLinkUsageItem[]> {
    const ctx = await this.resolveMemberInviteContext(userId, activeOrgId);
    if (!ctx) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_USER_NO_ORG,
        "User is not associated with an organization",
      );
    }
    if (!ctx.canManageMembers) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
        "You do not have permission to view invite link usage history.",
      );
    }

    const { orgId, org } = ctx;
    const link = await this.prisma.inviteLink.findFirst({
      where: { id: linkId, organizationId: orgId },
      select: { id: true },
    });
    if (!link) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_INVITE_INVALID,
        "Invite link not found in the active organization",
      );
    }

    const prismaWithUsage = this.prisma as unknown as {
      inviteLinkUsage?: {
        findMany?: (args: {
          where: { inviteLinkId: string; organizationId: string };
          orderBy?: { usedAt: "desc" };
          select?: {
            id: boolean;
            userId: boolean;
            userEmailSnapshot: boolean;
            usedAt: boolean;
          };
        }) => Promise<
          Array<{
            id: string;
            userId: string | null;
            userEmailSnapshot: string;
            usedAt: Date | string;
          }>
        >;
      };
    };

    if (typeof prismaWithUsage.inviteLinkUsage?.findMany !== "function") {
      return [];
    }

    const rawUsages = await prismaWithUsage.inviteLinkUsage.findMany({
      where: { inviteLinkId: linkId, organizationId: orgId },
      orderBy: { usedAt: "desc" },
      select: {
        id: true,
        userId: true,
        userEmailSnapshot: true,
        usedAt: true,
      },
    });

    const userIds = Array.from(
      new Set(rawUsages.map((u) => u.userId).filter(Boolean) as string[]),
    );
    const users =
      userIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
            },
          })
        : [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    const orgOrder: NameDisplayOrder =
      org?.nameDisplayOrder === "LAST_FIRST" ? "LAST_FIRST" : "FIRST_LAST";

    return [...rawUsages]
      .sort((a, b) => toTimestamp(b.usedAt) - toTimestamp(a.usedAt))
      .map((usage) => {
        const usageUser = usage.userId ? userMap.get(usage.userId) : undefined;
        return {
          id: usage.id,
          userId: usage.userId,
          userName:
            (usageUser && formatUserDisplayName(usageUser, orgOrder)) ||
            usageUser?.email ||
            usage.userEmailSnapshot,
          userEmail: usageUser?.email ?? usage.userEmailSnapshot,
          userAvatarUrl: usageUser?.avatarUrl ?? null,
          usedAt: new Date(toTimestamp(usage.usedAt)).toISOString(),
        };
      });
  }

  async revokeInviteLink(
    userId: string,
    linkId: string,
    activeOrgId?: string | null,
  ) {
    const ctx = await this.resolveMemberInviteContext(userId, activeOrgId);
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

    const existingInvite =
      typeof this.prisma.inviteLink?.findFirst === "function"
        ? await this.prisma.inviteLink.findFirst({
            where: { id: linkId, organizationId: orgId },
            select: { id: true, invitedEmail: true, role: true, status: true },
          })
        : null;

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

    await this.auditLog?.logOrg(
      orgId,
      userId,
      "INVITE_REVOKED",
      "INVITATION",
      {
        linkId,
        ...(existingInvite?.invitedEmail
          ? { invitedEmail: existingInvite.invitedEmail }
          : {}),
      },
      undefined,
      {
        targetId: linkId,
        targetLabel:
          existingInvite?.invitedEmail ?? existingInvite?.role ?? linkId,
        changes: [
          {
            field: "status",
            before: existingInvite?.status ?? "ACTIVE",
            after: "REVOKED",
          },
        ],
      },
    );

    this.eventsService?.emit({
      type: "INVITE_LINKS_CHANGED",
      organizationId: orgId,
      data: { linkId },
    });
    this.eventsService?.emit({
      type: "AUDIT_LOGS_CHANGED",
      organizationId: orgId,
    });

    return { success: true, message: "Invite link revoked successfully" };
  }

  private assertInviteEmailMatch(
    invitedEmail: string | null | undefined,
    callerEmail: string | null | undefined,
  ): void {
    if (!invitedEmail) return;
    const normalizedCaller = callerEmail?.trim().toLowerCase();
    if (
      !normalizedCaller ||
      normalizedCaller !== invitedEmail.trim().toLowerCase()
    ) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.ORG_INVITE_EMAIL_MISMATCH,
        "This invitation was sent to a different email address.",
      );
    }
  }

  private async recordInviteUsage(
    tx: PrismaService,
    params: {
      inviteLinkId: string;
      organizationId: string;
      userId: string;
      userEmailSnapshot: string;
      usedAt: Date;
    },
  ): Promise<void> {
    const txWithUsage = tx as unknown as {
      inviteLinkUsage?: {
        create?: (args: {
          data: {
            id: string;
            inviteLinkId: string;
            organizationId: string;
            userId: string;
            userEmailSnapshot: string;
            usedAt: Date;
          };
        }) => Promise<unknown>;
      };
    };
    if (typeof txWithUsage.inviteLinkUsage?.create === "function") {
      await txWithUsage.inviteLinkUsage.create({
        data: {
          id: crypto.randomUUID(),
          inviteLinkId: params.inviteLinkId,
          organizationId: params.organizationId,
          userId: params.userId,
          userEmailSnapshot: params.userEmailSnapshot,
          usedAt: params.usedAt,
        },
      });
    }
  }

  async getPublicInvite(token: string, currentUserId?: string | null) {
    const link = await this.prisma.inviteLink.findFirst({
      where: { token },
      select: {
        id: true,
        token: true,
        role: true,
        invitedEmail: true,
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
        code: APP_ERROR_CODES.ORG_INVITE_INVALID,
        message: "Invite link not found or invalid",
      };
    }

    if (link.status === "REVOKED") {
      return {
        valid: false,
        code: APP_ERROR_CODES.ORG_INVITE_REVOKED,
        message: "This invitation link has been revoked by an administrator",
        link,
      };
    }

    if (link.expiresAt && toTimestamp(link.expiresAt) < Date.now()) {
      return {
        valid: false,
        code: APP_ERROR_CODES.ORG_INVITE_EXPIRED,
        message: "This invitation link has expired",
        link,
      };
    }

    if (link.maxUses !== null && link.usesCount >= link.maxUses) {
      return {
        valid: false,
        code: APP_ERROR_CODES.ORG_INVITE_MAX_USES_REACHED,
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
        ownerId: true,
        logoObjectKey: true,
        logoUpdatedAt: true,
        nameDisplayOrder: true,
      },
    });
    const orgOrder: NameDisplayOrder =
      org?.nameDisplayOrder === "LAST_FIRST" ? "LAST_FIRST" : "FIRST_LAST";

    let createdByName = "Team Member";
    if (link.createdById) {
      const creatorId = link.createdById as string;
      const isOrgOwner = Boolean(org?.ownerId && org.ownerId === creatorId);
      const isOrgMember =
        isOrgOwner ||
        typeof this.prisma.organizationMember?.findFirst !== "function"
          ? true
          : Boolean(
              await this.prisma.organizationMember.findFirst({
                where: {
                  organizationId: link.organizationId,
                  userId: creatorId,
                },
                select: { id: true },
              }),
            );
      if (isOrgMember) {
        const creator = await this.prisma.user.findFirst({
          where: { id: creatorId },
          select: { id: true, firstName: true, lastName: true },
        });
        const resolved = formatUserDisplayName(creator, orgOrder);
        if (resolved) {
          createdByName = resolved;
        }
      }
    }

    const isEmailRestricted = Boolean(link.invitedEmail);
    const maskedInvitedEmail = link.invitedEmail
      ? maskEmail(link.invitedEmail)
      : null;
    let emailMismatch = false;
    if (isEmailRestricted && link.invitedEmail && currentUserId) {
      const currentUser = await this.prisma.user.findFirst({
        where: { id: currentUserId },
        select: { email: true },
      });
      const callerEmail = currentUser?.email?.trim().toLowerCase();
      emailMismatch = Boolean(
        !callerEmail || callerEmail !== link.invitedEmail.toLowerCase(),
      );
    }

    return {
      valid: true,
      token: link.token,
      role: link.role,
      organization: {
        id: link.organizationId,
        name: org?.name || "Organization",
        slug: org?.slug || "org",
        logoUrl: org ? buildOrganizationLogoUrl(org) : null,
      },
      createdByName,
      expiresAt: link.expiresAt
        ? new Date(toTimestamp(link.expiresAt)).toISOString()
        : null,
      isEmailRestricted,
      maskedInvitedEmail,
      emailMismatch,
    };
  }

  private runCrossOrgInviteTx<T>(
    fn: (tx: PrismaService) => Promise<T>,
  ): Promise<T> {
    // Accepting an invite token is inherently cross-tenant when the caller
    // already belongs to another organization, so bypass tenant RLS for the token lookup/join tx.
    if (typeof this.prisma.withSystemRlsBypass === "function") {
      return this.prisma.withSystemRlsBypass(fn);
    }
    return runInTransaction(this.prisma, fn);
  }

  async joinByToken(userId: string, token: string) {
    const result = await this.runCrossOrgInviteTx(async (tx) => {
      const link = await tx.inviteLink.findFirst({
        where: { token },
        select: {
          id: true,
          token: true,
          role: true,
          invitedEmail: true,
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
          APP_ERROR_CODES.ORG_INVITE_MAX_USES_REACHED,
          "This invitation link has reached its maximum allowed uses",
        );
      }

      // Enforce email-bound invite BEFORE membership checks
      const user = await tx.user.findFirst({
        where: { id: userId },
        select: { id: true, email: true },
      });
      this.assertInviteEmailMatch(link.invitedEmail, user?.email);

      const userMemberships = await tx.organizationMember.findMany({
        where: { userId, organizationId: link.organizationId },
        select: {
          id: true,
          organizationId: true,
          role: true,
        },
      });

      const isAlreadyMember = userMemberships.length > 0;

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
      const nowTimestamp = toInstant();
      await tx.organizationMember.create({
        data: {
          id: newMemberId,
          organizationId: link.organizationId,
          userId,
          role: assignedRole,
          lastAccessedAt: nowTimestamp,
          updatedAt: nowTimestamp,
        },
      });

      await this.recordInviteUsage(tx, {
        inviteLinkId: link.id,
        organizationId: link.organizationId,
        userId,
        userEmailSnapshot: user?.email ?? link.invitedEmail ?? "",
        usedAt: nowTimestamp,
      });

      // Update status to EXPIRED if maxUses reached
      const nextUses = link.usesCount + 1;
      if (link.maxUses !== null && nextUses >= link.maxUses) {
        await tx.inviteLink.update({
          where: { id: link.id },
          data: { status: "EXPIRED" },
        });
      }

      const memberTargetLabel = user?.email ?? link.invitedEmail ?? userId;
      await this.auditLog?.logOrg(
        link.organizationId,
        userId,
        "MEMBER_JOINED",
        "MEMBER",
        { memberId: userId, role: assignedRole, inviteLinkId: link.id },
        tx as unknown as PrismaService,
        {
          targetId: userId,
          targetLabel: memberTargetLabel,
          changes: [{ field: "role", before: null, after: assignedRole }],
        },
      );

      const orgRecord = await tx.organization.findFirst({
        where: { id: link.organizationId },
        select: {
          id: true,
          name: true,
          slug: true,
          ownerId: true,
          logoObjectKey: true,
          logoUpdatedAt: true,
          defaultLanguage: true,
          timezone: true,
          dateFormat: true,
          timeFormat: true,
          nameDisplayOrder: true,
          defaultCurrency: true,
          createdAt: true,
        },
      });
      const org = orgRecord
        ? attachOrganizationLogoUrl({
            ...orgRecord,
            ...normalizeOrgLocalization(orgRecord),
          })
        : null;

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
    this.eventsService?.emit({
      type: "AUDIT_LOGS_CHANGED",
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
    const result = await this.runCrossOrgInviteTx(async (tx) => {
      const inviteLink = await tx.inviteLink.findFirst({
        where: { token: rawInput },
        select: {
          id: true,
          organizationId: true,
          role: true,
          invitedEmail: true,
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
          APP_ERROR_CODES.ORG_INVITE_MAX_USES_REACHED,
          "This invite link has reached its maximum allowed uses.",
        );
      }

      const orgRecord = await tx.organization.findFirst({
        where: { id: inviteLink.organizationId },
        select: {
          id: true,
          name: true,
          slug: true,
          ownerId: true,
          logoObjectKey: true,
          logoUpdatedAt: true,
          defaultLanguage: true,
          timezone: true,
          dateFormat: true,
          timeFormat: true,
          nameDisplayOrder: true,
          defaultCurrency: true,
          createdAt: true,
        },
      });

      if (!orgRecord) {
        throw new AppNotFoundException(
          APP_ERROR_CODES.ORG_NOT_FOUND,
          "Organization not found.",
        );
      }
      const org = attachOrganizationLogoUrl({
        ...orgRecord,
        ...normalizeOrgLocalization(orgRecord),
      });

      const assignedRole = this.resolveValidInviteRole(inviteLink.role);

      // Enforce email-bound invite BEFORE membership checks / org switch
      const callerUser = await tx.user.findFirst({
        where: { id: userId },
        select: { id: true, email: true },
      });
      this.assertInviteEmailMatch(inviteLink.invitedEmail, callerUser?.email);

      // Check if user already has an active membership in this organization
      const existingMembership = await tx.organizationMember.findFirst({
        where: { userId, organizationId: org.id },
        select: {
          id: true,
          organizationId: true,
          role: true,
        },
      });

      if (existingMembership) {
        // User is already a member - switch active organization to this org
        if (typeof tx.organizationMember?.updateMany === "function") {
          await tx.organizationMember.updateMany({
            where: { userId, organizationId: org.id },
            data: { lastAccessedAt: toInstant() },
          });
        }

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
          organizationId: org.id,
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
          APP_ERROR_CODES.ORG_INVITE_MAX_USES_REACHED,
          "This invite link has reached its maximum allowed uses.",
        );
      }

      // Record new persistent membership
      const newMemberId = crypto.randomUUID();
      const memberTimestamp = toInstant();
      await tx.organizationMember.create({
        data: {
          id: newMemberId,
          organizationId: org.id,
          userId,
          role: assignedRole,
          lastAccessedAt: memberTimestamp,
          updatedAt: memberTimestamp,
        },
      });

      await this.recordInviteUsage(tx, {
        inviteLinkId: inviteLink.id,
        organizationId: org.id,
        userId,
        userEmailSnapshot: callerUser?.email ?? inviteLink.invitedEmail ?? "",
        usedAt: memberTimestamp,
      });

      // Update status to EXPIRED if maxUses reached
      const nextUses = inviteLink.usesCount + 1;
      if (inviteLink.maxUses !== null && nextUses >= inviteLink.maxUses) {
        await tx.inviteLink.updateMany({
          where: { id: inviteLink.id, organizationId: org.id },
          data: { status: "EXPIRED" },
        });
      }

      const memberTargetLabel =
        callerUser?.email ?? inviteLink.invitedEmail ?? userId;
      await this.auditLog?.logOrg(
        org.id,
        userId,
        "MEMBER_JOINED",
        "MEMBER",
        {
          memberId: userId,
          role: assignedRole,
          inviteLinkId: inviteLink.id,
        },
        tx as unknown as PrismaService,
        {
          targetId: userId,
          targetLabel: memberTargetLabel,
          changes: [{ field: "role", before: null, after: assignedRole }],
        },
      );

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
      this.eventsService?.emit({
        type: "AUDIT_LOGS_CHANGED",
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
