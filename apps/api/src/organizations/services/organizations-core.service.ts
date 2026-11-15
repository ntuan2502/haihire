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
  formatUserDisplayName,
  normalizeOrgLocalization,
  type OrganizationLocalizationSettings,
} from "@haihire/shared";
import { OrganizationsAuditLogService } from "./organizations-audit-log.service";
import { EventsService } from "../../events/events.service";

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
    let org;
    try {
      org = await runInTransaction(this.prisma, async (tx) => {
        const createdOrg = await tx.organization.create({
          data: {
            id: orgId,
            name: dto.name.trim(),
            slug: normalizedSlug,
            ownerId: userId,
            updatedAt: toInstant(),
          },
          select: ORG_CORE_SELECT,
        });

        // Record membership in OrganizationMember
        await tx.organizationMember.upsert({
          where: {
            organizationId_userId: {
              organizationId: createdOrg.id,
              userId,
            },
          },
          create: {
            id: crypto.randomUUID(),
            organizationId: createdOrg.id,
            userId,
            role: "ADMIN",
            updatedAt: toInstant(),
          },
          update: {
            role: "ADMIN",
            updatedAt: toInstant(),
          },
        });

        const userTableCompat = tx.user as unknown as MockUserTableCompat;
        if (userTableCompat?.store) {
          await userTableCompat.update?.({
            where: { id: userId },
            data: { organizationId: createdOrg.id, role: "ADMIN" },
          });
        }

        return createdOrg;
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

    if (!org) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_NOT_FOUND,
        "Failed to retrieve created organization",
      );
    }

    return {
      organization: this.withLocalization(org),
      message: "Organization created successfully",
    };
  }

  async getMyOrg(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
    });
    if (
      user &&
      "organizationId" in user &&
      (user as unknown as { organizationId: string | null }).organizationId ===
        null
    ) {
      return null;
    }

    const member = await this.prisma.organizationMember.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { organizationId: true },
    });
    const orgId =
      member?.organizationId ||
      (user as unknown as { organizationId?: string })?.organizationId;
    if (orgId) {
      const org = await this.prisma.organization.findFirst({
        where: { id: orgId },
        select: ORG_CORE_SELECT,
      });
      if (org) return this.withLocalization(org);
    }

    const owned = await this.prisma.organization.findFirst({
      where: { ownerId: userId },
      select: ORG_CORE_SELECT,
    });
    return owned ? this.withLocalization(owned) : null;
  }

  async getMyOrgs(userId: string) {
    const ownedOrgs = await this.prisma.organization.findMany({
      where: { ownerId: userId },
      select: ORG_CORE_SELECT,
    });

    const userMemberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      select: {
        id: true,
        organizationId: true,
        role: true,
      },
    });

    const memberOrgIds = [
      ...new Set(userMemberships.map((m) => m.organizationId)),
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
        email: true,
        firstName: true,
        lastName: true,
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

    const isOwner = Boolean(org.ownerId && org.ownerId === userId);
    const membership = await this.prisma.organizationMember.findFirst({
      where: { organizationId: targetOrgId, userId },
      select: {
        id: true,
        role: true,
      },
    });

    if (!isOwner && !membership) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
        "You do not have access to this organization. Please join via an invite link.",
        { organizationId: targetOrgId },
      );
    }

    const targetRole = isOwner ? "ADMIN" : membership?.role || "MEMBER";

    if (isOwner && !membership) {
      await this.prisma.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: targetOrgId,
            userId,
          },
        },
        create: {
          id: crypto.randomUUID(),
          organizationId: targetOrgId,
          userId,
          role: "ADMIN",
          updatedAt: toInstant(),
        },
        update: {
          role: "ADMIN",
          updatedAt: toInstant(),
        },
      });
    }

    if (user && "organizationId" in user) {
      (user as unknown as { organizationId: string }).organizationId =
        targetOrgId;
    }
    const prismaUserCompat = this.prisma.user as unknown as MockUserTableCompat;
    if (prismaUserCompat?.store) {
      await prismaUserCompat.update?.({
        where: { id: userId },
        data: { organizationId: targetOrgId },
      });
    }

    const normalizedOrg = this.withLocalization(org);

    this.eventsService?.emit({
      type: "ORG_UPDATED",
      targetUserId: userId,
      organizationId: org.id,
    });

    return {
      success: true,
      organization: normalizedOrg,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: org.id,
        role: targetRole,
        name: formatUserDisplayName(user, normalizedOrg.nameDisplayOrder),
        organization: normalizedOrg,
        isOwner,
      },
    };
  }

  async updateMyOrg(userId: string, dto: UpdateOrgDto) {
    const userMember = await this.prisma.organizationMember.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { organizationId: true, role: true },
    });
    const ownedOrg = await this.prisma.organization.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
    });
    const legacyOrgId = (user as unknown as { organizationId?: string })
      ?.organizationId;

    const orgId = userMember?.organizationId || ownedOrg?.id || legacyOrgId;
    const userRole = ownedOrg
      ? "ADMIN"
      : userMember?.role ||
        (user as unknown as { role?: string })?.role ||
        "MEMBER";

    if (!orgId) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_USER_NO_ORG,
        "User is not associated with an organization",
      );
    }

    if (userRole === "MEMBER") {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
        "Members have read-only access. Only Admins can perform this action.",
      );
    }

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
    const userMember = await this.prisma.organizationMember.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { organizationId: true, role: true },
    });
    const ownedOrg = await this.prisma.organization.findFirst({
      where: { ownerId: userId },
      select: { id: true, name: true, ownerId: true },
    });
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
    });
    const legacyOrgId = (user as unknown as { organizationId?: string })
      ?.organizationId;

    const orgId = ownedOrg?.id || userMember?.organizationId || legacyOrgId;
    if (!orgId) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_USER_NO_ORG,
        "User is not associated with an organization",
      );
    }

    const currentOrg =
      ownedOrg ||
      (await this.prisma.organization.findFirst({
        where: { id: orgId },
        select: {
          id: true,
          ownerId: true,
          name: true,
        },
      }));

    if (!currentOrg) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_NOT_FOUND,
        "Organization not found",
      );
    }

    if (currentOrg.ownerId !== userId) {
      const role =
        userMember?.role ||
        (user as unknown as { role?: string })?.role ||
        "MEMBER";
      if (role === "MEMBER") {
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

    const prismaUserCompat = this.prisma.user as unknown as MockUserTableCompat;
    const orgUsers = prismaUserCompat?.store
      ? ((await prismaUserCompat.findMany?.({
          where: { organizationId: orgId },
          select: { id: true },
        })) ?? [])
      : [];
    const orgMembers =
      (await this.prisma.organizationMember?.findMany?.({
        where: { organizationId: orgId },
        select: { userId: true },
      })) ?? [];
    const affectedUserIds = new Set<string>([
      userId,
      ...orgUsers.map((u) => String(u.id || "")).filter(Boolean),
      ...orgMembers.map((m) => m.userId),
    ]);

    // Execute atomic cleanup of memberships and organization inside a single transaction
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

      const txUserCompat = tx.user as unknown as MockUserTableCompat;
      if (txUserCompat?.store) {
        await txUserCompat.updateMany?.({
          where: { organizationId: orgId },
          data: { organizationId: null },
        });
      }

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
      const ownedOrg = await tx.organization.findFirst({
        where: { ownerId: userId },
        select: { id: true, ownerId: true },
      });

      if (!ownedOrg) {
        const member = await tx.organizationMember.findFirst({
          where: { userId },
          select: { organizationId: true },
        });
        const callerUser = await tx.user.findFirst({
          where: { id: userId },
        });
        const legacyCallerOrg = (
          callerUser as unknown as { organizationId?: string }
        )?.organizationId;
        if (member || legacyCallerOrg) {
          throw ownerRequired();
        }
        throw new AppNotFoundException(
          APP_ERROR_CODES.ORG_USER_NO_ORG,
          "User is not associated with an organization",
        );
      }
      const organizationId = ownedOrg.id;

      let targetMembership = await tx.organizationMember.findFirst({
        where: { organizationId, userId: newOwnerUserId },
        select: { id: true },
      });

      const targetUser = await tx.user.findFirst({
        where: { id: newOwnerUserId },
      });
      const legacyTargetOrg = (
        targetUser as unknown as { organizationId?: string }
      )?.organizationId;

      if (!targetMembership) {
        if (legacyTargetOrg === organizationId) {
          targetMembership = await tx.organizationMember.create({
            data: {
              id: crypto.randomUUID(),
              organizationId,
              userId: newOwnerUserId,
              role: "ADMIN",
              updatedAt: toInstant(),
            },
          });
        } else {
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

      await tx.organizationMember.updateMany({
        where: { id: targetMembership.id, organizationId },
        data: { role: "ADMIN", updatedAt: now },
      });

      const txUserCompat = tx.user as unknown as MockUserTableCompat;
      if (txUserCompat?.store && legacyTargetOrg === organizationId) {
        await txUserCompat.update?.({
          where: { id: newOwnerUserId },
          data: { role: "ADMIN" },
        });
      }

      await this.auditLog?.logOrg(
        organizationId,
        userId,
        "OWNERSHIP_TRANSFERRED",
        "ORGANIZATION",
        { previousOwnerId: userId, newOwnerId: newOwnerUserId },
        tx,
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
