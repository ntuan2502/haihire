import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import crypto from "node:crypto";
import { extname } from "node:path";
import { PrismaService, runInTransaction } from "../../prisma/prisma.service";
import { CreateOrgDto } from "../dto/create-org.dto";
import { UpdateOrgDto } from "../dto/update-org.dto";
import { toInstant } from "../../common/date.util";
import {
  AppBadRequestException,
  AppConflictException,
  AppForbiddenException,
  AppNotFoundException,
  AppServiceUnavailableException,
} from "../../common/app-exception";
import {
  APP_ERROR_CODES,
  canonicalizeTimezone,
  formatUserDisplayName,
  hasPermission,
  normalizeOrgLocalization,
  type OrganizationLocalizationSettings,
  type Role,
} from "@haihire/shared";
import { OrganizationsAuditLogService } from "./organizations-audit-log.service";
import { computeAuditDiff } from "../../common/audit-diff.util";
import { EventsService } from "../../events/events.service";
import { MinioService, type UploadResult } from "../../minio/minio.service";
import { fixUtf8String } from "../../common/doc-utils";
import {
  ALLOWED_LOGO_EXTENSIONS,
  ALLOWED_LOGO_MIME_TYPES,
  sanitizeFilename,
  validateUploadedLogoFile,
} from "../../common/upload-utils";
import {
  attachOrganizationLogoUrl,
  getPreferredMembershipOrderBy,
  getPreferredOwnedOrgOrderBy,
} from "../organization-logo.util";

const ORG_CORE_SELECT = {
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
} as const;

const ORG_PUBLIC_SELECT = {
  id: true,
  name: true,
  slug: true,
  logoObjectKey: true,
  logoUpdatedAt: true,
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
    @Optional()
    @Inject(MinioService)
    private readonly minioService?: MinioService,
  ) {}

  private withLocalization<
    T extends {
      id: string;
      logoObjectKey?: string | null;
      logoMimeType?: string | null;
      logoUpdatedAt?: Date | string | null;
    } & Partial<Record<keyof OrganizationLocalizationSettings, unknown>>,
  >(
    org: T,
  ): Omit<
    T,
    | keyof OrganizationLocalizationSettings
    | "logoObjectKey"
    | "logoMimeType"
    | "logoUpdatedAt"
  > &
    OrganizationLocalizationSettings & { logoUrl: string | null } {
    const withUrl = attachOrganizationLogoUrl(org);
    return {
      ...withUrl,
      ...normalizeOrgLocalization(org),
    } as Omit<
      T,
      | keyof OrganizationLocalizationSettings
      | "logoObjectKey"
      | "logoMimeType"
      | "logoUpdatedAt"
    > &
      OrganizationLocalizationSettings & { logoUrl: string | null };
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
    const now = toInstant();
    let org;
    try {
      org = await runInTransaction(this.prisma, async (tx) => {
        const createdOrg = await tx.organization.create({
          data: {
            id: orgId,
            name: dto.name.trim(),
            slug: normalizedSlug,
            ownerId: userId,
            updatedAt: now,
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
            lastAccessedAt: now,
            updatedAt: now,
          },
          update: {
            role: "ADMIN",
            lastAccessedAt: now,
            updatedAt: now,
          },
        });

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

  async getMyOrg(userId: string, activeOrgId?: string | null) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
    });
    const legacyOrgId = (user as unknown as { organizationId?: string | null })
      ?.organizationId;
    if (
      user &&
      "organizationId" in user &&
      legacyOrgId === null &&
      !activeOrgId
    ) {
      return null;
    }

    if (activeOrgId) {
      const org = await this.prisma.organization.findFirst({
        where: { id: activeOrgId },
        select: ORG_CORE_SELECT,
      });
      if (org) {
        const isOwner = Boolean(org.ownerId === userId);
        const member =
          typeof this.prisma.organizationMember?.findFirst === "function"
            ? await this.prisma.organizationMember.findFirst({
                where: { organizationId: activeOrgId, userId },
                select: { id: true },
              })
            : null;
        if (
          isOwner ||
          member ||
          legacyOrgId === activeOrgId ||
          typeof this.prisma.organizationMember?.findFirst !== "function"
        ) {
          return this.withLocalization(org);
        }
      }
      return null;
    }

    const member = await this.prisma.organizationMember.findFirst({
      where: { userId },
      orderBy: getPreferredMembershipOrderBy(),
      select: { organizationId: true },
    });
    const orgId = member?.organizationId || legacyOrgId;
    if (orgId) {
      const org = await this.prisma.organization.findFirst({
        where: { id: orgId },
        select: ORG_CORE_SELECT,
      });
      if (org) return this.withLocalization(org);
    }

    const owned = await this.prisma.organization.findFirst({
      where: { ownerId: userId },
      orderBy: getPreferredOwnedOrgOrderBy(),
      select: ORG_CORE_SELECT,
    });
    return owned ? this.withLocalization(owned) : null;
  }

  async getMyOrgs(userId: string) {
    const ownedOrgs = await this.prisma.organization.findMany({
      where: { ownerId: userId },
      orderBy: getPreferredOwnedOrgOrderBy(),
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
            orderBy: getPreferredOwnedOrgOrderBy(),
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
    const now = toInstant();

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
          lastAccessedAt: now,
          updatedAt: now,
        },
        update: {
          role: "ADMIN",
          lastAccessedAt: now,
          updatedAt: now,
        },
      });
    } else if (
      membership &&
      typeof this.prisma.organizationMember?.updateMany === "function"
    ) {
      await this.prisma.organizationMember.updateMany({
        where: { organizationId: targetOrgId, userId },
        data: { lastAccessedAt: now },
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

  private async resolveAndAuthorizeOrgUpdate(
    userId: string,
    activeOrgId?: string | null,
  ) {
    let orgId = activeOrgId || null;
    let fallbackMemberRole: string | undefined;

    if (!orgId) {
      const userMember = await this.prisma.organizationMember.findFirst({
        where: { userId },
        orderBy: getPreferredMembershipOrderBy(),
        select: { organizationId: true, role: true },
      });
      const ownedOrg = await this.prisma.organization.findFirst({
        where: { ownerId: userId },
        orderBy: getPreferredOwnedOrgOrderBy(),
        select: { id: true },
      });
      const user = await this.prisma.user.findFirst({
        where: { id: userId },
      });
      const legacyOrgId = (user as unknown as { organizationId?: string })
        ?.organizationId;
      orgId = userMember?.organizationId || ownedOrg?.id || legacyOrgId || null;
      fallbackMemberRole =
        userMember?.role || (user as unknown as { role?: string })?.role;
    }

    if (!orgId) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_USER_NO_ORG,
        "User is not associated with an organization",
      );
    }

    const currentOrg = await this.prisma.organization.findFirst({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        ownerId: true,
        logoObjectKey: true,
        defaultLanguage: true,
        timezone: true,
        dateFormat: true,
        timeFormat: true,
        nameDisplayOrder: true,
        defaultCurrency: true,
      },
    });

    if (!currentOrg) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_NOT_FOUND,
        "Organization not found",
      );
    }

    const isOwnerOfCurrentOrg = Boolean(currentOrg.ownerId === userId);
    let userRole = isOwnerOfCurrentOrg
      ? "ADMIN"
      : fallbackMemberRole || "MEMBER";

    if (typeof this.prisma.organizationMember?.findFirst === "function") {
      const activeMember = await this.prisma.organizationMember.findFirst({
        where: { organizationId: orgId, userId },
        select: { role: true },
      });
      if (!isOwnerOfCurrentOrg && !activeMember && !fallbackMemberRole) {
        throw new AppForbiddenException(
          APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
          "You do not belong to this organization.",
        );
      }
      if (!isOwnerOfCurrentOrg && activeMember?.role) {
        userRole = activeMember.role;
      }
    }

    const rolePermOverride =
      !isOwnerOfCurrentOrg &&
      userRole !== "ADMIN" &&
      typeof this.prisma.organizationRolePermission?.findFirst === "function"
        ? await this.prisma.organizationRolePermission.findFirst({
            where: {
              organizationId: orgId,
              role: userRole as Role,
              permission: "org:update",
            },
            select: { granted: true },
          })
        : null;
    const canUpdateOrg =
      isOwnerOfCurrentOrg ||
      userRole === "ADMIN" ||
      (rolePermOverride
        ? rolePermOverride.granted
        : hasPermission(userRole as Role, "org:update"));

    if (!canUpdateOrg) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
        "Members have read-only access. Only Admins can perform this action.",
      );
    }

    return { orgId, currentOrg };
  }

  async updateMyOrg(
    userId: string,
    dto: UpdateOrgDto,
    activeOrgId?: string | null,
  ) {
    const { orgId, currentOrg } = await this.resolveAndAuthorizeOrgUpdate(
      userId,
      activeOrgId,
    );

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

    let auditWritten = false;
    if (Object.keys(updateData).length > 0) {
      await this.prisma.organization.update({
        where: { id: orgId },
        data: updateData,
      });

      const targetLabel = updateData.name ?? currentOrg.name ?? orgId;
      const coreFields = [
        ...(updateData.name !== undefined ? ["name"] : []),
        ...(updateData.slug !== undefined ? ["slug"] : []),
      ];
      const coreChanges =
        coreFields.length > 0
          ? computeAuditDiff(
              currentOrg as unknown as Record<string, unknown>,
              {
                ...(updateData.name !== undefined
                  ? { name: updateData.name }
                  : {}),
                ...(updateData.slug !== undefined
                  ? { slug: updateData.slug }
                  : {}),
              },
              { fields: coreFields },
            )
          : [];

      if (coreChanges.length > 0) {
        await this.auditLog?.logOrg(
          orgId,
          userId,
          "ORG_UPDATED",
          "ORGANIZATION",
          Object.fromEntries(coreChanges.map((c) => [c.field, c.after])),
          undefined,
          {
            targetId: orgId,
            targetLabel,
            changes: coreChanges,
          },
        );
        auditWritten = true;
      }

      if (Object.keys(localizationChanges).length > 0) {
        const locDiffs = computeAuditDiff(
          currentOrg as unknown as Record<string, unknown>,
          localizationChanges,
          { fields: Object.keys(localizationChanges) },
        );
        await this.auditLog?.logOrg(
          orgId,
          userId,
          "ORG_LOCALIZATION_UPDATED",
          "ORGANIZATION",
          localizationChanges,
          undefined,
          {
            targetId: orgId,
            targetLabel,
            changes: locDiffs.length > 0 ? locDiffs : null,
          },
        );
        auditWritten = true;
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
      if (auditWritten) {
        this.eventsService?.emit({
          type: "AUDIT_LOGS_CHANGED",
          organizationId: orgId,
        });
      }
    }

    return updatedOrg ? this.withLocalization(updatedOrg) : null;
  }

  async uploadMyOrgLogo(
    userId: string,
    file: Express.Multer.File | undefined,
    activeOrgId?: string | null,
  ) {
    const { orgId, currentOrg } = await this.resolveAndAuthorizeOrgUpdate(
      userId,
      activeOrgId,
    );

    const validated = validateUploadedLogoFile(file);

    if (!this.minioService) {
      throw new AppServiceUnavailableException(
        APP_ERROR_CODES.DOCUMENT_UPLOAD_FAILED,
        "Storage service is unavailable",
      );
    }

    let uploadResult: UploadResult;
    try {
      uploadResult = await this.minioService.uploadFile(
        file!,
        "logos",
        orgId,
        ALLOWED_LOGO_EXTENSIONS,
      );
    } catch (error) {
      if (error instanceof AppBadRequestException) {
        throw error;
      }
      throw new AppServiceUnavailableException(
        APP_ERROR_CODES.DOCUMENT_UPLOAD_FAILED,
        "Failed to upload organization logo to storage service",
      );
    }

    const updatedOrg = await runInTransaction(this.prisma, async (tx) => {
      return tx.organization.update({
        where: { id: orgId },
        data: {
          logoObjectKey: uploadResult.fileName,
          logoMimeType: validated.mimeType,
          logoUpdatedAt: toInstant(),
        },
        select: ORG_CORE_SELECT,
      });
    }).catch(async (dbError) => {
      await this.minioService!.deleteFile(uploadResult.fileName).catch(
        (err) => {
          this.logger.warn(
            `Failed to compensate uploaded logo '${uploadResult.fileName}': ${String(err)}`,
          );
        },
      );
      throw dbError;
    });

    if (
      currentOrg.logoObjectKey &&
      currentOrg.logoObjectKey !== uploadResult.fileName
    ) {
      await this.minioService
        .deleteFile(currentOrg.logoObjectKey)
        .catch((err) => {
          this.logger.warn(
            `Failed to remove previous logo '${currentOrg.logoObjectKey}': ${String(err)}`,
          );
        });
    }

    const cleanName = sanitizeFilename(
      fixUtf8String(file!.originalname || `logo${validated.ext}`),
    );
    await this.auditLog?.logOrg(
      orgId,
      userId,
      "ORG_LOGO_UPDATED",
      "ORGANIZATION",
      {
        fileName: cleanName,
        mimeType: validated.mimeType,
        sizeBytes: file!.size ?? file!.buffer?.length ?? 0,
      },
      undefined,
      {
        targetId: orgId,
        targetLabel: updatedOrg?.name ?? currentOrg.name ?? orgId,
        changes: [
          {
            field: "logoObjectKey",
            before: currentOrg.logoObjectKey ?? null,
            after: uploadResult.fileName,
          },
        ],
      },
    );

    this.eventsService?.emit({
      type: "ORG_UPDATED",
      organizationId: orgId,
      data: { updatedBy: userId },
    });
    this.eventsService?.emit({
      type: "AUDIT_LOGS_CHANGED",
      organizationId: orgId,
    });

    return this.withLocalization(updatedOrg);
  }

  async deleteMyOrgLogo(userId: string, activeOrgId?: string | null) {
    const { orgId, currentOrg } = await this.resolveAndAuthorizeOrgUpdate(
      userId,
      activeOrgId,
    );

    const updatedOrg = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        logoObjectKey: null,
        logoMimeType: null,
        logoUpdatedAt: null,
      },
      select: ORG_CORE_SELECT,
    });

    if (currentOrg.logoObjectKey) {
      await this.minioService
        ?.deleteFile(currentOrg.logoObjectKey)
        .catch((err) => {
          this.logger.warn(
            `Failed to delete logo '${currentOrg.logoObjectKey}' from storage: ${String(err)}`,
          );
        });

      await this.auditLog?.logOrg(
        orgId,
        userId,
        "ORG_LOGO_REMOVED",
        "ORGANIZATION",
        null,
        undefined,
        {
          targetId: orgId,
          targetLabel: updatedOrg?.name ?? currentOrg.name ?? orgId,
          changes: [
            {
              field: "logoObjectKey",
              before: currentOrg.logoObjectKey ?? null,
              after: null,
            },
          ],
        },
      );

      this.eventsService?.emit({
        type: "ORG_UPDATED",
        organizationId: orgId,
        data: { updatedBy: userId },
      });
      this.eventsService?.emit({
        type: "AUDIT_LOGS_CHANGED",
        organizationId: orgId,
      });
    }

    return this.withLocalization(updatedOrg);
  }

  async preparePublicOrgLogo(orgId: string) {
    const org = await this.prisma.organization.findFirst({
      where: { id: orgId },
      select: {
        id: true,
        logoObjectKey: true,
        logoMimeType: true,
      },
    });

    if (!org || !org.logoObjectKey) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.DOCUMENT_NOT_FOUND,
        "Organization logo not found",
      );
    }

    if (!this.minioService) {
      throw new AppServiceUnavailableException(
        APP_ERROR_CODES.DOCUMENT_RETRIEVE_FAILED,
        "Storage service is unavailable",
      );
    }

    const normalizedKey = this.minioService.extractObjectName(
      org.logoObjectKey,
    );
    const safeTenant = org.id.trim().replace(/[^a-zA-Z0-9_-]/g, "");
    if (!normalizedKey.startsWith(`tenants/${safeTenant}/logos/`)) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.DOCUMENT_NOT_FOUND,
        "Organization logo not found",
      );
    }

    const ext = extname(normalizedKey).toLowerCase();
    const fallbackMime =
      ext === ".png"
        ? "image/png"
        : ext === ".webp"
          ? "image/webp"
          : "image/jpeg";
    const normalizedMime = org.logoMimeType?.trim().toLowerCase();
    const mimeType =
      normalizedMime && ALLOWED_LOGO_MIME_TYPES.has(normalizedMime)
        ? normalizedMime
        : fallbackMime;

    try {
      const stream = await this.minioService.getObjectStream(
        normalizedKey,
        org.id,
      );
      return { stream, mimeType };
    } catch {
      throw new AppNotFoundException(
        APP_ERROR_CODES.DOCUMENT_NOT_FOUND,
        "Organization logo not found",
      );
    }
  }

  async deleteMyOrg(userId: string, activeOrgId?: string | null) {
    let orgId = activeOrgId || null;
    let fallbackRole: string | undefined;

    if (!orgId) {
      const userMember = await this.prisma.organizationMember.findFirst({
        where: { userId },
        orderBy: getPreferredMembershipOrderBy(),
        select: { organizationId: true, role: true },
      });
      const ownedOrg = await this.prisma.organization.findFirst({
        where: { ownerId: userId },
        orderBy: getPreferredOwnedOrgOrderBy(),
        select: { id: true, name: true, ownerId: true },
      });
      const user = await this.prisma.user.findFirst({
        where: { id: userId },
      });
      const legacyOrgId = (user as unknown as { organizationId?: string })
        ?.organizationId;

      orgId = ownedOrg?.id || userMember?.organizationId || legacyOrgId || null;
      fallbackRole =
        userMember?.role || (user as unknown as { role?: string })?.role;
    }

    if (!orgId) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_USER_NO_ORG,
        "User is not associated with an organization",
      );
    }

    const currentOrg = await this.prisma.organization.findFirst({
      where: { id: orgId },
      select: {
        id: true,
        ownerId: true,
        name: true,
        logoObjectKey: true,
      },
    });

    if (!currentOrg) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.ORG_NOT_FOUND,
        "Organization not found",
      );
    }

    if (currentOrg.ownerId !== userId) {
      let role = fallbackRole || "MEMBER";
      if (typeof this.prisma.organizationMember?.findFirst === "function") {
        const activeMember = await this.prisma.organizationMember.findFirst({
          where: { organizationId: orgId, userId },
          select: { role: true },
        });
        if (activeMember?.role) {
          role = activeMember.role;
        }
      }
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

    const orgMembers =
      (await this.prisma.organizationMember?.findMany?.({
        where: { organizationId: orgId },
        select: { userId: true },
      })) ?? [];
    const affectedUserIds = new Set<string>([
      userId,
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

      // Delete log tables constrained by ON DELETE RESTRICT before deleting org
      await tx.emailLog?.deleteMany?.({ where: { organizationId: orgId } });
      await tx.activityLog?.deleteMany?.({ where: { organizationId: orgId } });
      await tx.organizationAuditLog?.deleteMany?.({
        where: { organizationId: orgId },
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

    if (typeof this.minioService?.deleteTenantPrefix === "function") {
      await this.minioService.deleteTenantPrefix(orgId).catch(() => {});
    } else if (currentOrg.logoObjectKey) {
      await this.minioService
        ?.deleteFile(currentOrg.logoObjectKey)
        .catch(() => {});
    }

    for (const targetUserId of affectedUserIds) {
      this.eventsService?.emit({
        type: "MEMBER_REMOVED",
        targetUserId,
        organizationId: orgId,
      });
    }

    return { success: true, message: "Organization deleted successfully" };
  }

  async transferOwnership(
    userId: string,
    newOwnerUserId: string,
    activeOrgId?: string | null,
  ) {
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
      const ownedOrg = activeOrgId
        ? await tx.organization.findFirst({
            where: { id: activeOrgId, ownerId: userId },
            select: { id: true, ownerId: true, name: true },
          })
        : await tx.organization.findFirst({
            where: { ownerId: userId },
            select: { id: true, ownerId: true, name: true },
          });

      if (!ownedOrg) {
        if (activeOrgId) {
          const targetOrg = await tx.organization.findFirst({
            where: { id: activeOrgId },
            select: { id: true },
          });
          if (targetOrg) {
            throw ownerRequired();
          }
        }
        const member = await tx.organizationMember.findFirst({
          where: { userId },
          select: { organizationId: true },
        });
        if (member) {
          throw ownerRequired();
        }
        throw new AppNotFoundException(
          APP_ERROR_CODES.ORG_USER_NO_ORG,
          "User is not associated with an organization",
        );
      }
      const organizationId = ownedOrg.id;

      const targetMembership = await tx.organizationMember.findFirst({
        where: { organizationId, userId: newOwnerUserId },
        select: { id: true },
      });

      if (!targetMembership) {
        throw memberRequired();
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

      await this.auditLog?.logOrg(
        organizationId,
        userId,
        "OWNERSHIP_TRANSFERRED",
        "ORGANIZATION",
        { previousOwnerId: userId, newOwnerId: newOwnerUserId },
        tx,
        {
          targetId: organizationId,
          targetLabel: ownedOrg.name ?? organizationId,
          changes: [
            {
              field: "ownerId",
              before: userId,
              after: newOwnerUserId,
            },
          ],
        },
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
