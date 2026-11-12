import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import crypto from "node:crypto";
import { PrismaService, runInTransaction } from "../../prisma/prisma.service";
import { CreateOrgDto } from "../dto/create-org.dto";
import { UpdateOrgDto } from "../dto/update-org.dto";
import { toInstant } from "../../common/date.util";
import {
  AppBadRequestException,
  AppConflictException,
  AppForbiddenException,
  AppNotFoundException,
} from "../../common/app-exception";
import {
  APP_ERROR_CODES,
  canonicalizeTimezone,
  normalizeOrgLocalization,
  type OrganizationLocalizationSettings,
} from "@haihire/shared";
import { OrganizationsAuditLogService } from "./organizations-audit-log.service";
import { EventsService } from "../../events/events.service";

const ORG_CORE_SELECT = {
  id: true,
  name: true,
  slug: true,
  ownerId: true,
  defaultLanguage: true,
  timezone: true,
  dateFormat: true,
  timeFormat: true,
  nameDisplayOrder: true,
  defaultCurrency: true,
  createdAt: true,
} as const;

const ORG_PUBLIC_SELECT = {
  id: true,
  name: true,
  slug: true,
  defaultLanguage: true,
  timezone: true,
  dateFormat: true,
  timeFormat: true,
  nameDisplayOrder: true,
  defaultCurrency: true,
  createdAt: true,
} as const;

@Injectable()
export class OrganizationsCoreService {
  private readonly logger = new Logger(OrganizationsCoreService.name);
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(OrganizationsAuditLogService)
    private readonly auditLog?: OrganizationsAuditLogService,
    @Optional()
    @Inject(EventsService)
    private readonly eventsService?: EventsService,
  ) {}

  private withLocalization<T extends Record<string, unknown>>(
    org: T,
  ): Omit<T, keyof OrganizationLocalizationSettings> &
    OrganizationLocalizationSettings {
    return {
      ...org,
      ...normalizeOrgLocalization(org),
    };
  }

  async create(userId: string, dto: CreateOrgDto) {
    const normalizedSlug = dto.slug.toLowerCase().trim();

    const existing = await this.prisma.organization.findFirst({
      where: { slug: normalizedSlug },
      select: { id: true, slug: true },
    });

    if (existing) {
      throw new AppConflictException(
        APP_ERROR_CODES.ORG_SLUG_ALREADY_EXISTS,
        `Organization with slug '${normalizedSlug}' already exists. Please choose a different slug.`,
        { slug: normalizedSlug },
      );
    }

    const orgId = crypto.randomUUID();
    try {
      await this.prisma.organization.create({
        data: {
          id: orgId,
          name: dto.name.trim(),
          slug: normalizedSlug,
          ownerId: userId,
          updatedAt: toInstant(),
        },
      });
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      ) {
        throw new AppConflictException(
          APP_ERROR_CODES.ORG_SLUG_ALREADY_EXISTS,
          `Organization with slug '${normalizedSlug}' already exists. Please choose a different slug.`,
          { slug: normalizedSlug },
        );
      }
      throw error;
    }

    const org = await this.prisma.organization.findFirst({
      where: { slug: normalizedSlug },
      select: ORG_CORE_SELECT,
    });

    if (!org) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_NOT_FOUND,
        "Failed to retrieve created organization",
      );
    }

    // Record membership in OrganizationMember
    const memberId = crypto.randomUUID();
    await this.prisma.organizationMember.upsert({
      where: { id: memberId },
      create: {
        id: memberId,
        organizationId: org.id,
        userId,
        role: "ADMIN",
        updatedAt: toInstant(),
      },
      update: {},
    });

    // Link current user to this organization and promote to ADMIN (Owner)
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        organizationId: org.id,
        role: "ADMIN",
      },
    });

    return {
      organization: this.withLocalization(org),
      message: "Organization created successfully",
    };
  }

  async getMyOrg(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!user || !user.organizationId) {
      return null;
    }

    const org = await this.prisma.organization.findFirst({
      where: { id: user.organizationId as string },
      select: ORG_CORE_SELECT,
    });

    return org ? this.withLocalization(org) : null;
  }

  async getMyOrgs(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!user) {
      return [];
    }

    const ownedOrgs = await this.prisma.organization.findMany({
      where: { ownerId: userId },
      select: ORG_CORE_SELECT,
    });

    // Query all persistent memberships for this user
    const userMemberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      select: {
        id: true,
        organizationId: true,
        role: true,
      },
    });

    const memberOrgIds = [
      ...new Set([
        ...userMemberships.map((m) => m.organizationId),
        ...(user.organizationId ? [user.organizationId] : []),
      ]),
    ].filter((id) => !ownedOrgs.some((o) => o.id === id));

    const memberOrgs =
      memberOrgIds.length > 0
        ? await this.prisma.organization.findMany({
            where: { id: { in: memberOrgIds } },
            select: ORG_CORE_SELECT,
          })
        : [];

    return [...ownedOrgs, ...memberOrgs].map((o) => this.withLocalization(o));
  }

  async switchOrg(userId: string, targetOrgId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: {
        id: true,
        organizationId: true,
        role: true,
      },
    });

    if (!user) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.RESOURCE_NOT_FOUND,
        "User not found",
      );
    }

    const org = await this.prisma.organization.findFirst({
      where: { id: targetOrgId },
      select: ORG_CORE_SELECT,
    });

    if (!org) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_NOT_FOUND,
        "Organization not found",
      );
    }

    // Security: User must be owner, have an OrganizationMember record, or currently belong to the target org
    const isOwner = Boolean(org.ownerId && org.ownerId === userId);
    const userMemberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      select: {
        id: true,
        organizationId: true,
        role: true,
      },
    });

    const membership = userMemberships.find(
      (m) => m.organizationId === targetOrgId,
    );
    const isCurrentMember = user.organizationId === targetOrgId;

    if (!isOwner && !membership && !isCurrentMember) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
        "You do not have access to this organization. Please join via an invite link.",
        { organizationId: targetOrgId },
      );
    }

    const targetRole = isOwner
      ? "ADMIN"
      : membership
        ? membership.role
        : user.role || "MEMBER";

    // Self-healing: ensure membership record exists in OrganizationMember
    if (!membership) {
      const memberId = crypto.randomUUID();
      await this.prisma.organizationMember.upsert({
        where: { id: memberId },
        create: {
          id: memberId,
          organizationId: targetOrgId,
          userId,
          role: targetRole,
          updatedAt: toInstant(),
        },
        update: {},
      });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        organizationId: org.id,
        role: targetRole,
      },
    });

    const updatedUser = await this.prisma.user.findFirst({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
      },
    });

    const normalizedOrg = this.withLocalization(org);

    this.eventsService?.emit({
      type: "ORG_UPDATED",
      targetUserId: userId,
      organizationId: org.id,
    });

    return {
      success: true,
      organization: normalizedOrg,
      user: { ...updatedUser, organization: normalizedOrg, isOwner },
    };
  }

  async updateMyOrg(userId: string, dto: UpdateOrgDto) {
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

    if (user.role === "MEMBER") {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
        "Members have read-only access. Only Admins can perform this action.",
      );
    }

    const orgId = user.organizationId as string;

    const currentOrg = await this.prisma.organization.findFirst({
      where: { id: orgId },
      select: {
        id: true,
        slug: true,
      },
    });

    if (!currentOrg) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_NOT_FOUND,
        "Organization not found",
      );
    }

    if (dto.slug) {
      const normalizedSlug = dto.slug.toLowerCase().trim();
      if (normalizedSlug !== currentOrg.slug) {
        const existing = await this.prisma.organization.findFirst({
          where: { slug: normalizedSlug },
          select: { id: true },
        });

        if (existing) {
          throw new AppConflictException(
            APP_ERROR_CODES.ORG_SLUG_ALREADY_EXISTS,
            `Organization with slug '${normalizedSlug}' already exists. Please choose a different slug.`,
            { slug: normalizedSlug },
          );
        }
      }
    }

    const updateData: {
      name?: string;
      slug?: string;
      defaultLanguage?: string;
      timezone?: string;
      dateFormat?: string;
      timeFormat?: string;
      nameDisplayOrder?: string;
      defaultCurrency?: string;
    } = {};
    if (dto.name) updateData.name = dto.name.trim();
    if (dto.slug) updateData.slug = dto.slug.toLowerCase().trim();

    const localizationKeys = [
      "defaultLanguage",
      "timezone",
      "dateFormat",
      "timeFormat",
      "nameDisplayOrder",
      "defaultCurrency",
    ] as const;
    const localizationChanges: Record<string, string> = {};
    for (const key of localizationKeys) {
      const value = dto[key];
      if (value !== undefined) {
        const storedValue =
          key === "timezone" ? canonicalizeTimezone(value) : value;
        updateData[key] = storedValue;
        localizationChanges[key] = storedValue;
      }
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.organization.update({
        where: { id: orgId },
        data: updateData,
      });

      if (Object.keys(localizationChanges).length > 0) {
        await this.auditLog?.logOrg(
          orgId,
          userId,
          "ORG_LOCALIZATION_UPDATED",
          "ORGANIZATION",
          localizationChanges,
        );
      }
    }

    const updatedOrg = await this.prisma.organization.findFirst({
      where: { id: orgId },
      select: ORG_CORE_SELECT,
    });

    if (Object.keys(updateData).length > 0) {
      this.eventsService?.emit({
        type: "ORG_UPDATED",
        organizationId: orgId,
        data: { updatedBy: userId },
      });
      if (Object.keys(localizationChanges).length > 0) {
        this.eventsService?.emit({
          type: "AUDIT_LOGS_CHANGED",
          organizationId: orgId,
        });
      }
    }

    return updatedOrg ? this.withLocalization(updatedOrg) : null;
  }

  async deleteMyOrg(userId: string) {
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

    const orgId = user.organizationId as string;

    const currentOrg = await this.prisma.organization.findFirst({
      where: { id: orgId },
      select: {
        id: true,
        ownerId: true,
        name: true,
      },
    });

    if (!currentOrg) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_NOT_FOUND,
        "Organization not found",
      );
    }

    if (currentOrg.ownerId !== userId) {
      if (user.role === "MEMBER") {
        throw new AppForbiddenException(
          APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
          "Members have read-only access. Only the Organization Owner can perform this action.",
        );
      }
      throw new AppForbiddenException(
        APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
        "Only the organization owner can delete this organization.",
      );
    }

    await this.auditLog?.logPlatform(
      orgId,
      userId,
      "ORG_DELETED",
      "ORGANIZATION",
      { organizationName: currentOrg.name },
    );

    const orgUsers =
      (await this.prisma.user.findMany?.({
        where: { organizationId: orgId },
        select: { id: true },
      })) ?? [];
    const orgMembers =
      (await this.prisma.organizationMember?.findMany?.({
        where: { organizationId: orgId },
        select: { userId: true },
      })) ?? [];
    const affectedUserIds = new Set<string>([
      userId,
      ...orgUsers.map((u) => u.id),
      ...orgMembers.map((m) => m.userId),
    ]);

    // Execute atomic cleanup of users, memberships, and organization inside a single transaction
    await runInTransaction(this.prisma, async (tx) => {
      const locked = await tx.organization.updateMany({
        where: { id: orgId, ownerId: userId },
        data: { ownerId: userId },
      });
      if (locked.count !== 1) {
        throw new AppForbiddenException(
          APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
          "Organization ownership changed; only the current owner can delete it.",
        );
      }
      // Unlink users from this org
      await tx.user.updateMany({
        where: { organizationId: orgId },
        data: { organizationId: null },
      });

      // Clean up all memberships in this org
      await tx.organizationMember.deleteMany({
        where: { organizationId: orgId },
      });

      // Delete organization
      await tx.organization.delete({
        where: { id: orgId },
      });
    });

    for (const targetUserId of affectedUserIds) {
      this.eventsService?.emit({
        type: "MEMBER_REMOVED",
        targetUserId,
        organizationId: orgId,
      });
    }

    return { success: true, message: "Organization deleted successfully" };
  }

  async transferOwnership(userId: string, newOwnerUserId: string) {
    if (userId === newOwnerUserId) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.ORG_CANNOT_TRANSFER_TO_SELF,
        "Cannot transfer organization ownership to yourself",
      );
    }

    const ownerRequired = () =>
      new AppForbiddenException(
        APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
        "Only the organization owner can transfer ownership.",
      );
    const memberRequired = () =>
      new AppBadRequestException(
        APP_ERROR_CODES.ORG_TRANSFER_TARGET_NOT_MEMBER,
        "Target user must be a member of the organization",
      );

    const orgId = await runInTransaction(this.prisma, async (tx) => {
      const user = await tx.user.findFirst({
        where: { id: userId },
        select: { organizationId: true },
      });

      if (!user?.organizationId) {
        throw new AppNotFoundException(
          APP_ERROR_CODES.ORG_USER_NO_ORG,
          "User is not associated with an organization",
        );
      }
      const organizationId = user.organizationId;

      const currentOrg = await tx.organization.findFirst({
        where: { id: organizationId },
        select: { ownerId: true },
      });

      if (!currentOrg) {
        throw new AppNotFoundException(
          APP_ERROR_CODES.ORG_NOT_FOUND,
          "Organization not found",
        );
      }
      if (currentOrg.ownerId !== userId) {
        throw ownerRequired();
      }

      const targetMembership = await tx.organizationMember.findFirst({
        where: { organizationId, userId: newOwnerUserId },
        select: { id: true },
      });

      if (!targetMembership) {
        const target = await tx.user.findFirst({
          where: { id: newOwnerUserId, organizationId },
          select: { id: true },
        });
        if (!target) {
          throw memberRequired();
        }
      }

      const now = toInstant();
      const transferred = await tx.organization.updateMany({
        where: { id: organizationId, ownerId: userId },
        data: { ownerId: newOwnerUserId, updatedAt: now },
      });
      if (transferred.count === 0) {
        throw ownerRequired();
      }

      const promotedUser = await tx.user.updateMany({
        where: { id: newOwnerUserId, organizationId },
        data: { role: "ADMIN", updatedAt: now },
      });

      if (targetMembership) {
        const promotedMembership = await tx.organizationMember.updateMany({
          where: { id: targetMembership.id, organizationId },
          data: { role: "ADMIN", updatedAt: now },
        });
        if (promotedMembership.count === 0) {
          throw memberRequired();
        }
      } else {
        if (promotedUser.count === 0) {
          throw memberRequired();
        }
        const newMemberId = crypto.randomUUID();
        await tx.organizationMember.upsert({
          where: { id: newMemberId },
          create: {
            id: newMemberId,
            organizationId,
            userId: newOwnerUserId,
            role: "ADMIN",
            updatedAt: now,
          },
          update: {
            role: "ADMIN",
            updatedAt: now,
          },
        });
      }

      await this.auditLog?.logOrg(
        organizationId,
        userId,
        "OWNERSHIP_TRANSFERRED",
        "ORGANIZATION",
        { previousOwnerId: userId, newOwnerId: newOwnerUserId },
      );

      return organizationId;
    });

    this.logger.log(
      `Transferred ownership of organization ${orgId} from ${userId} to ${newOwnerUserId}`,
    );

    this.eventsService?.emit({
      type: "ORG_UPDATED",
      organizationId: orgId,
      data: { previousOwnerId: userId, newOwnerId: newOwnerUserId },
    });
    this.eventsService?.emit({
      type: "MEMBERS_CHANGED",
      organizationId: orgId,
      data: { previousOwnerId: userId, newOwnerId: newOwnerUserId },
    });
    this.eventsService?.emit({
      type: "MEMBER_ROLE_UPDATED",
      targetUserId: userId,
      organizationId: orgId,
      role: "ADMIN",
    });
    this.eventsService?.emit({
      type: "MEMBER_ROLE_UPDATED",
      targetUserId: newOwnerUserId,
      organizationId: orgId,
      role: "ADMIN",
    });
    this.eventsService?.emit({
      type: "AUDIT_LOGS_CHANGED",
      organizationId: orgId,
    });

    return {
      success: true,
      newOwnerId: newOwnerUserId,
    };
  }

  async getPublicOrg(slug: string) {
    const org = await this.prisma.organization.findFirst({
      where: { slug },
      select: ORG_PUBLIC_SELECT,
    });

    if (!org) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_NOT_FOUND,
        `Organization '${slug}' not found`,
        { slug },
      );
    }

    return this.withLocalization(org);
  }
}
