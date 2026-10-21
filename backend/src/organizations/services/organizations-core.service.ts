import { Inject, Injectable } from "@nestjs/common";
import crypto from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateOrgDto } from "../dto/create-org.dto";
import { UpdateOrgDto } from "../dto/update-org.dto";
import { toInstant } from "../../common/date.util";
import {
  AppConflictException,
  AppForbiddenException,
  AppNotFoundException,
} from "../../common/app-exception";
import { APP_ERROR_CODES } from "@haihire/shared";

@Injectable()
export class OrganizationsCoreService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  private async executeTx<T>(
    fn: (tx: PrismaService["db"]) => Promise<T>,
  ): Promise<T> {
    const p = this.prisma as unknown as {
      transaction?: (cb: (tx: PrismaService["db"]) => Promise<T>) => Promise<T>;
      executeTx?: (cb: (tx: PrismaService["db"]) => Promise<T>) => Promise<T>;
      db: PrismaService["db"];
    };
    if (typeof p.transaction === "function") {
      return p.transaction(fn);
    }
    if (typeof p.executeTx === "function") {
      return p.executeTx(fn);
    }
    return fn(this.prisma.db);
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
      throw new AppConflictException(
        APP_ERROR_CODES.ORG_SLUG_ALREADY_EXISTS,
        `Organization with slug '${normalizedSlug}' already exists. Please choose a different slug.`,
        { slug: normalizedSlug },
      );
    }

    const orgId = crypto.randomUUID();
    await this.prisma.db.orm.public.Organization.upsert({
      create: {
        id: orgId,
        name: dto.name.trim(),
        slug: normalizedSlug,
        ownerId: userId,
        updatedAt: toInstant(),
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
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_NOT_FOUND,
        "Failed to retrieve created organization",
      );
    }

    // Record membership in OrganizationMember
    const memberId = crypto.randomUUID();
    await this.prisma.db.orm.public.OrganizationMember.upsert({
      create: {
        id: memberId,
        organizationId: org.id,
        userId,
        role: "ADMIN",
        updatedAt: toInstant(),
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

    const ownedOrgs = await this.prisma.db.orm.public.Organization.select(
      "id",
      "name",
      "slug",
      "ownerId",
      "createdAt",
    )
      .where((o) => o.ownerId.eq(userId))
      .all();

    // Query all persistent memberships for this user
    const userMemberships =
      await this.prisma.db.orm.public.OrganizationMember.select(
        "id",
        "organizationId",
        "role",
      )
        .where((m) => m.userId.eq(userId))
        .all();

    const memberOrgIds = [
      ...new Set([
        ...userMemberships.map((m) => m.organizationId),
        ...(user.organizationId ? [user.organizationId] : []),
      ]),
    ].filter((id) => !ownedOrgs.some((o) => o.id === id));

    const memberOrgs =
      memberOrgIds.length > 0
        ? await this.prisma.db.orm.public.Organization.select(
            "id",
            "name",
            "slug",
            "ownerId",
            "createdAt",
          )
            .where((o) => o.id.in(memberOrgIds))
            .all()
        : [];

    return [...ownedOrgs, ...memberOrgs];
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
      throw new AppNotFoundException(
        APP_ERROR_CODES.RESOURCE_NOT_FOUND,
        "User not found",
      );
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
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_NOT_FOUND,
        "Organization not found",
      );
    }

    // Security: User must be owner, have an OrganizationMember record, or currently belong to the target org
    const isOwner = Boolean(org.ownerId && org.ownerId === userId);
    const userMemberships =
      await this.prisma.db.orm.public.OrganizationMember.select(
        "id",
        "organizationId",
        "role",
      )
        .where((m) => m.userId.eq(userId))
        .all();

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
      await this.prisma.db.orm.public.OrganizationMember.upsert({
        create: {
          id: memberId,
          organizationId: targetOrgId,
          userId,
          role: targetRole,
          updatedAt: toInstant(),
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

    const currentOrg = await this.prisma.db.orm.public.Organization.select(
      "id",
      "slug",
    )
      .where((o) => o.id.eq(orgId))
      .first();

    if (!currentOrg) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_NOT_FOUND,
        "Organization not found",
      );
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
          throw new AppConflictException(
            APP_ERROR_CODES.ORG_SLUG_ALREADY_EXISTS,
            `Organization with slug '${normalizedSlug}' already exists. Please choose a different slug.`,
            { slug: normalizedSlug },
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
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_USER_NO_ORG,
        "User is not associated with an organization",
      );
    }

    if (user.role === "MEMBER") {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
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
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_NOT_FOUND,
        "Organization not found",
      );
    }

    if (currentOrg.ownerId !== userId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
        "Only the organization owner can delete this organization.",
      );
    }

    // Execute atomic cleanup of users, memberships, and organization inside a single transaction
    await this.executeTx(async (tx) => {
      // Unlink users from this org
      await tx.orm.public.User.where((u) =>
        u.organizationId.eq(orgId),
      ).updateAll({
        organizationId: null,
      });

      // Clean up all memberships in this org
      await tx.orm.public.OrganizationMember.where((m) =>
        m.organizationId.eq(orgId),
      ).deleteAll();

      // Delete organization
      await tx.orm.public.Organization.where((o) => o.id.eq(orgId)).delete();
    });

    return { success: true, message: "Organization deleted successfully" };
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
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_NOT_FOUND,
        `Organization '${slug}' not found`,
        { slug },
      );
    }

    return org;
  }
}
