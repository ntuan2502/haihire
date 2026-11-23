import { Injectable, Inject, Optional } from "@nestjs/common";
import type Redis from "ioredis";
import { REDIS_CLIENT } from "../redis/redis.module";
import { PermissionResolverService } from "./permission-resolver.service";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { UpdateUserPreferencesDto } from "./dto/update-user-preferences.dto";
import { UpdateUserProfileDto } from "./dto/update-user-profile.dto";
import {
  AppUnauthorizedException,
  AppConflictException,
  AppBadRequestException,
} from "../common/app-exception";
import {
  APP_ERROR_CODES,
  canonicalizeTimezone,
  formatUserDisplayName,
  normalizeNameInput,
  Role,
  type NameDisplayOrder,
  type Permission,
  PERMISSIONS,
  hasPermission,
} from "@haihire/shared";
import { BCRYPT_SALT_ROUNDS, DEMO_ACCOUNTS, DEMO_PASSWORD } from "./constants";
import { ensureDefaultDemoAccounts } from "../prisma/demo-seed.util";
import { env } from "../config/env";
import { toInstant } from "../common/date.util";
import {
  ORG_SUMMARY_SELECT,
  getPreferredMembershipOrderBy,
  getPreferredOwnedOrgOrderBy,
  serializeOrganizationSummary,
} from "../organizations/organization-logo.util";

const USER_PROFILE_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  preferredLanguage: true,
  preferredTimezone: true,
  createdAt: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(JwtService)
    private readonly jwtService: JwtService,
    @Optional()
    @Inject(REDIS_CLIENT)
    private readonly redis?: Redis,
    @Optional()
    @Inject(PermissionResolverService)
    private readonly permissionResolver?: PermissionResolverService,
  ) {}

  async validateRecruiter(dto: LoginDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    let user = await this.prisma.user.findFirst({
      where: { email: normalizedEmail },
      select: {
        ...USER_PROFILE_SELECT,
        password: true,
        tokenVersion: true,
      },
    });

    // Auto-provision demo accounts in non-production environments if SEED_DEMO_ON_BOOT is enabled
    const isDevOrDemoEnabled =
      env.NODE_ENV !== "production" && env.SEED_DEMO_ON_BOOT;

    if (!user && isDevOrDemoEnabled) {
      const demoAccountList = [DEMO_ACCOUNTS.ADMIN];
      const matchedDemo = demoAccountList.find(
        (a) => a.email.toLowerCase() === normalizedEmail,
      );

      if (matchedDemo && DEMO_PASSWORD && dto.password === DEMO_PASSWORD) {
        await ensureDefaultDemoAccounts(this.prisma);
        user = await this.prisma.user.findFirst({
          where: { email: normalizedEmail },
          select: {
            ...USER_PROFILE_SELECT,
            password: true,
            tokenVersion: true,
          },
        });
      }
    }

    if (!user || !user.password) {
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.INVALID_CREDENTIALS,
        "Invalid email or password",
      );
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.INVALID_CREDENTIALS,
        "Invalid email or password",
      );
    }

    const { password: _, ...sanitizedUser } = user;

    const legacyOrgId = (
      sanitizedUser as unknown as { organizationId?: string | null }
    )?.organizationId;
    const legacyRole = (sanitizedUser as unknown as { role?: string })?.role;

    let activeOrgId: string | null = legacyOrgId ?? null;
    let activeRole: Role = ((legacyRole as Role) || "MEMBER") as Role;
    let organization = null;
    let isOwner = false;

    if (activeOrgId) {
      organization = await this.prisma.organization.findUnique({
        where: { id: activeOrgId },
        select: ORG_SUMMARY_SELECT,
      });
      if (organization) {
        isOwner = Boolean(organization.ownerId === sanitizedUser.id);
        if (this.prisma.organizationMember?.findFirst) {
          const member = await this.prisma.organizationMember.findFirst({
            where: {
              organizationId: organization.id,
              userId: sanitizedUser.id,
            },
            select: { role: true },
          });
          if (member) activeRole = member.role as Role;
        }
      }
    } else {
      if (this.prisma.organizationMember?.findFirst) {
        const member = await this.prisma.organizationMember.findFirst({
          where: { userId: sanitizedUser.id },
          orderBy: getPreferredMembershipOrderBy(),
          select: { organizationId: true, role: true },
        });
        if (member) {
          activeOrgId = member.organizationId;
          activeRole = member.role as Role;
          organization = await this.prisma.organization.findUnique({
            where: { id: member.organizationId },
            select: ORG_SUMMARY_SELECT,
          });
          if (organization) {
            isOwner = Boolean(organization.ownerId === sanitizedUser.id);
          }
        }
      }
      if (!organization) {
        const owned = await this.prisma.organization.findFirst({
          where: { ownerId: sanitizedUser.id },
          orderBy: getPreferredOwnedOrgOrderBy(),
          select: ORG_SUMMARY_SELECT,
        });
        if (owned) {
          organization = owned;
          activeOrgId = owned.id;
          activeRole = Role.ADMIN;
          isOwner = true;
        }
      }
    }

    const orgOrder: NameDisplayOrder =
      organization?.nameDisplayOrder === "LAST_FIRST"
        ? "LAST_FIRST"
        : "FIRST_LAST";

    return {
      ...sanitizedUser,
      organizationId: activeOrgId,
      role: activeRole,
      name: formatUserDisplayName(sanitizedUser, orgOrder),
      isOwner,
      organization: organization
        ? serializeOrganizationSummary(organization)
        : null,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.validateRecruiter(dto);

    const tokenVersion = user.tokenVersion ?? 0;
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId ?? undefined,
      tokenVersion,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        type: "refresh",
        ...(user.organizationId ? { organizationId: user.organizationId } : {}),
        tokenVersion,
        jti: crypto.randomUUID(),
      },
      { expiresIn: "7d" },
    );

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  private async resolveSessionOrgContext(
    userId: string,
    preferredOrgId?: string | null,
    legacyOrgId?: string | null,
    legacyRole?: string,
  ): Promise<{ activeOrgId: string | null; activeRole: Role }> {
    const requestedOrgId = preferredOrgId ?? legacyOrgId ?? null;
    let activeOrgId: string | null = null;
    let activeRole: Role = Role.MEMBER;

    if (requestedOrgId) {
      const org = await this.prisma.organization?.findUnique?.({
        where: { id: requestedOrgId },
        select: { id: true, ownerId: true },
      });
      if (org) {
        const isOwner = Boolean(org.ownerId === userId);
        if (this.prisma.organizationMember?.findFirst) {
          const member = await this.prisma.organizationMember.findFirst({
            where: { organizationId: org.id, userId },
            select: { role: true },
          });
          if (member) {
            activeOrgId = org.id;
            activeRole = (isOwner ? Role.ADMIN : member.role) as Role;
          } else if (isOwner) {
            activeOrgId = org.id;
            activeRole = Role.ADMIN;
          }
        } else {
          activeOrgId = org.id;
          activeRole = isOwner
            ? Role.ADMIN
            : (((legacyRole as Role) || Role.MEMBER) as Role);
        }
      } else if (!this.prisma.organization?.findUnique && legacyOrgId) {
        activeOrgId = legacyOrgId;
        activeRole = ((legacyRole as Role) || Role.MEMBER) as Role;
      }
    }

    if (!activeOrgId && this.prisma.organizationMember?.findFirst) {
      const member = await this.prisma.organizationMember.findFirst({
        where: { userId },
        orderBy: getPreferredMembershipOrderBy(),
        select: { organizationId: true, role: true },
      });
      if (member) {
        activeOrgId = member.organizationId;
        const org = await this.prisma.organization?.findUnique?.({
          where: { id: member.organizationId },
          select: { id: true, ownerId: true },
        });
        const isOwner = Boolean(org && org.ownerId === userId);
        activeRole = (isOwner ? Role.ADMIN : member.role) as Role;
      }
    }

    if (!activeOrgId && this.prisma.organization?.findFirst) {
      const owned = await this.prisma.organization.findFirst({
        where: { ownerId: userId },
        orderBy: getPreferredOwnedOrgOrderBy(),
        select: { id: true },
      });
      if (owned) {
        activeOrgId = owned.id;
        activeRole = Role.ADMIN;
      }
    }

    return { activeOrgId, activeRole };
  }

  /**
   * Issues fresh access & refresh JWTs scoped to a specific organization after
   * org creation, join, switch, or deletion.
   */
  async issueOrgSessionTokens(
    userId: string,
    targetOrgId: string | null,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    hasOrg: boolean;
    role: Role;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        tokenVersion: true,
      },
    });

    if (!user) {
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.USER_SESSION_EXPIRED,
        "User session expired or not found",
      );
    }

    let activeOrgId: string | null = null;
    let activeRole: Role = Role.MEMBER;

    if (targetOrgId) {
      const org = await this.prisma.organization?.findUnique?.({
        where: { id: targetOrgId },
        select: { id: true, ownerId: true },
      });
      if (org) {
        const isOwner = Boolean(org.ownerId === user.id);
        const member = this.prisma.organizationMember?.findFirst
          ? await this.prisma.organizationMember.findFirst({
              where: { organizationId: org.id, userId: user.id },
              select: { role: true },
            })
          : null;
        if (isOwner || member) {
          activeOrgId = org.id;
          activeRole = isOwner
            ? Role.ADMIN
            : (member?.role as Role) || Role.MEMBER;
        }
      }
    }

    const tokenVersion = user.tokenVersion ?? 0;
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: activeRole,
      organizationId: activeOrgId ?? undefined,
      tokenVersion,
    });
    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        type: "refresh",
        ...(activeOrgId ? { organizationId: activeOrgId } : {}),
        tokenVersion,
        jti: crypto.randomUUID(),
      },
      { expiresIn: "7d" },
    );

    return {
      accessToken,
      refreshToken,
      hasOrg: Boolean(activeOrgId),
      role: activeRole,
    };
  }

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const firstName = normalizeNameInput(dto.firstName);
    const lastName = normalizeNameInput(dto.lastName);

    if (!firstName || !lastName) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        "First name and last name are required.",
      );
    }

    const existing = await this.prisma.user.findFirst({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existing) {
      throw new AppConflictException(
        APP_ERROR_CODES.USER_EMAIL_EXISTS,
        "An account with this email address already exists.",
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const id = crypto.randomUUID();

    try {
      await this.prisma.user.create({
        data: {
          id,
          email: normalizedEmail,
          firstName,
          lastName,
          password: hashedPassword,
          tokenVersion: 0,
          updatedAt: toInstant(),
        },
      });
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === "P2002") {
        throw new AppConflictException(
          APP_ERROR_CODES.USER_EMAIL_EXISTS,
          "An account with this email address already exists.",
        );
      }
      throw err;
    }

    const displayName = formatUserDisplayName({ firstName, lastName });
    const user = {
      id,
      email: normalizedEmail,
      firstName,
      lastName,
      name: displayName,
      role: "MEMBER" as const,
      avatarUrl: null,
      preferredLanguage: null,
      preferredTimezone: null,
      organizationId: null,
      organization: null,
      isOwner: false,
      tokenVersion: 0,
      createdAt: new Date(),
    };

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: 0,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        type: "refresh",
        tokenVersion: 0,
        jti: crypto.randomUUID(),
      },
      { expiresIn: "7d" },
    );

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    if (!dto.refreshToken) {
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.USER_SESSION_EXPIRED,
        "No refresh token provided",
      );
    }

    let decoded: {
      sub: string;
      type?: string;
      organizationId?: string | null;
      tokenVersion?: number;
      jti?: string;
    };
    try {
      decoded = this.jwtService.verify(dto.refreshToken);
    } catch {
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.USER_SESSION_EXPIRED,
        "Invalid or expired refresh token",
      );
    }

    if (decoded.type !== "refresh" || !decoded.sub) {
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.USER_SESSION_EXPIRED,
        "Invalid refresh token payload",
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        tokenVersion: true,
      },
    });

    if (!user) {
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.USER_SESSION_EXPIRED,
        "User not found or account has been deactivated",
      );
    }

    const decodedTokenVersion = decoded.tokenVersion ?? 0;
    const userTokenVersion = user.tokenVersion ?? 0;
    if (decodedTokenVersion !== userTokenVersion) {
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.USER_SESSION_EXPIRED,
        "Token has been revoked",
      );
    }

    // Refresh Token Rotation (RTR): Detect reuse of previously exchanged refresh token
    if (this.redis && decoded.jti) {
      try {
        const rtKey = `revoked_rt:${decoded.jti}`;
        const isRevoked = await this.redis.get(rtKey);
        const setResult = isRevoked
          ? null
          : await this.redis.set(rtKey, "1", "EX", 7 * 24 * 3600, "NX");
        if (isRevoked || setResult === null) {
          // Token reuse detected! Invalidate all sessions for this user.
          await this.prisma.user.update({
            where: { id: user.id },
            data: { tokenVersion: { increment: 1 } },
          });
          throw new AppUnauthorizedException(
            APP_ERROR_CODES.USER_SESSION_EXPIRED,
            "Compromised refresh token reuse detected. All sessions revoked.",
          );
        }
      } catch (err) {
        if (err instanceof AppUnauthorizedException) throw err;
      }
    }

    const legacyOrgId = (user as unknown as { organizationId?: string | null })
      ?.organizationId;
    const legacyRole = (user as unknown as { role?: string })?.role;
    const { activeOrgId, activeRole } = await this.resolveSessionOrgContext(
      user.id,
      decoded.organizationId,
      legacyOrgId,
      legacyRole,
    );

    const payload = {
      sub: user.id,
      email: user.email,
      role: activeRole,
      organizationId: activeOrgId ?? undefined,
      tokenVersion: userTokenVersion,
    };

    const newAccessToken = this.jwtService.sign(payload);
    const newRefreshToken = this.jwtService.sign(
      {
        sub: user.id,
        type: "refresh",
        ...(activeOrgId ? { organizationId: activeOrgId } : {}),
        tokenVersion: userTokenVersion,
        jti: crypto.randomUUID(),
      },
      { expiresIn: "7d" },
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      hasOrg: Boolean(activeOrgId),
    };
  }

  async logout(userId: string, activeOrgId?: string | null): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tokenVersion: true,
      },
    });

    if (user) {
      const now = toInstant();
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          tokenVersion: { increment: 1 },
          updatedAt: now,
        },
      });
      if (
        activeOrgId &&
        typeof this.prisma.organizationMember?.updateMany === "function"
      ) {
        await this.prisma.organizationMember.updateMany({
          where: { userId, organizationId: activeOrgId },
          data: { lastAccessedAt: now },
        });
      }
    }
  }

  async logoutWithRefreshToken(refreshToken: string): Promise<void> {
    if (!refreshToken) return;
    try {
      const decoded = this.jwtService.verify<{
        sub?: string;
        type?: string;
        organizationId?: string | null;
      }>(refreshToken);
      if (decoded?.sub && decoded.type === "refresh") {
        await this.logout(decoded.sub, decoded.organizationId);
      }
    } catch {
      // Ignore expired or invalid refresh tokens during logout
    }
  }

  async changePassword(
    userId: string,
    currentPass: string,
    newPass: string,
    requestedOrgId?: string | null,
  ): Promise<{
    success: boolean;
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      name: string;
      role: string;
      avatarUrl: string | null;
      preferredLanguage: string | null;
      preferredTimezone: string | null;
      organizationId: string | null;
      createdAt: Date | string;
    };
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...USER_PROFILE_SELECT,
        password: true,
        tokenVersion: true,
      },
    });

    if (!user || !user.password) {
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.UNAUTHORIZED,
        "User not found or password not configured",
      );
    }

    const isMatch = await bcrypt.compare(currentPass, user.password);
    if (!isMatch) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.INVALID_CURRENT_PASSWORD,
        "Current password does not match",
      );
    }

    const hashedPassword = await bcrypt.hash(newPass, BCRYPT_SALT_ROUNDS);
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        tokenVersion: { increment: 1 },
        updatedAt: toInstant(),
      },
      select: {
        ...USER_PROFILE_SELECT,
        tokenVersion: true,
      },
    });

    const legacyOrgId = (
      updatedUser as unknown as { organizationId?: string | null }
    )?.organizationId;
    const legacyRole = (updatedUser as unknown as { role?: string })?.role;
    const { activeOrgId, activeRole } = await this.resolveSessionOrgContext(
      updatedUser.id,
      requestedOrgId,
      legacyOrgId,
      legacyRole,
    );

    const tokenVersion = updatedUser.tokenVersion ?? 0;
    const payload = {
      sub: updatedUser.id,
      email: updatedUser.email,
      role: activeRole,
      organizationId: activeOrgId ?? undefined,
      tokenVersion,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      {
        sub: updatedUser.id,
        type: "refresh",
        ...(activeOrgId ? { organizationId: activeOrgId } : {}),
        tokenVersion,
        jti: crypto.randomUUID(),
      },
      { expiresIn: "7d" },
    );

    const org = activeOrgId
      ? await this.prisma.organization.findUnique({
          where: { id: activeOrgId },
          select: { nameDisplayOrder: true },
        })
      : null;
    const orgOrder: NameDisplayOrder =
      org?.nameDisplayOrder === "LAST_FIRST" ? "LAST_FIRST" : "FIRST_LAST";

    return {
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        name: formatUserDisplayName(updatedUser, orgOrder),
        role: activeRole,
        avatarUrl: updatedUser.avatarUrl,
        preferredLanguage: updatedUser.preferredLanguage,
        preferredTimezone: updatedUser.preferredTimezone,
        organizationId: activeOrgId,
        createdAt: updatedUser.createdAt,
      },
    };
  }

  async getProfile(userId: string, requestedOrgId?: string | null) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_PROFILE_SELECT,
    });

    if (!user) {
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.USER_SESSION_EXPIRED,
        "User session expired or not found",
      );
    }

    const legacyOrgId = (user as unknown as { organizationId?: string | null })
      ?.organizationId;
    const legacyRole = (user as unknown as { role?: string })?.role;

    let organization = null;
    let isOwner = false;
    let activeOrgId: string | null = null;
    let activeRole: Role = Role.MEMBER;
    const preferredOrgId = requestedOrgId ?? legacyOrgId ?? null;

    if (preferredOrgId) {
      const candidateOrg = await this.prisma.organization.findUnique({
        where: { id: preferredOrgId },
        select: ORG_SUMMARY_SELECT,
      });
      if (candidateOrg) {
        const ownerMatch = Boolean(candidateOrg.ownerId === user.id);
        if (this.prisma.organizationMember?.findFirst) {
          const member = await this.prisma.organizationMember.findFirst({
            where: { organizationId: candidateOrg.id, userId: user.id },
            select: { role: true },
          });
          if (member || ownerMatch) {
            organization = candidateOrg;
            activeOrgId = candidateOrg.id;
            isOwner = ownerMatch;
            activeRole = ownerMatch
              ? Role.ADMIN
              : (member?.role as Role) || Role.MEMBER;
          }
        } else {
          organization = candidateOrg;
          activeOrgId = candidateOrg.id;
          isOwner = ownerMatch;
          activeRole = ownerMatch
            ? Role.ADMIN
            : (((legacyRole as Role) || Role.MEMBER) as Role);
        }
      }
    }

    if (!organization) {
      if (this.prisma.organizationMember?.findFirst) {
        const member = await this.prisma.organizationMember.findFirst({
          where: { userId: user.id },
          orderBy: getPreferredMembershipOrderBy(),
          select: { organizationId: true, role: true },
        });
        if (member) {
          activeOrgId = member.organizationId;
          organization = await this.prisma.organization.findUnique({
            where: { id: member.organizationId },
            select: ORG_SUMMARY_SELECT,
          });
          if (organization) {
            isOwner = Boolean(organization.ownerId === user.id);
            activeRole = isOwner ? Role.ADMIN : (member.role as Role);
          } else {
            activeOrgId = null;
          }
        }
      }
      if (!organization) {
        const owned = await this.prisma.organization.findFirst({
          where: { ownerId: user.id },
          orderBy: getPreferredOwnedOrgOrderBy(),
          select: ORG_SUMMARY_SELECT,
        });
        if (owned) {
          organization = owned;
          activeOrgId = owned.id;
          activeRole = Role.ADMIN;
          isOwner = true;
        }
      }
    }

    const orgOrder: NameDisplayOrder =
      organization?.nameDisplayOrder === "LAST_FIRST"
        ? "LAST_FIRST"
        : "FIRST_LAST";

    return {
      ...user,
      organizationId: activeOrgId,
      role: activeRole,
      name: formatUserDisplayName(user, orgOrder),
      preferredTimezone: user.preferredTimezone
        ? canonicalizeTimezone(user.preferredTimezone)
        : user.preferredTimezone,
      isOwner,
      organization: organization
        ? serializeOrganizationSummary(organization)
        : organization,
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateUserProfileDto,
    requestedOrgId?: string | null,
  ) {
    const firstName = normalizeNameInput(dto.firstName);
    const lastName = normalizeNameInput(dto.lastName);

    if (!firstName || !lastName) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        "First name and last name are required.",
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        updatedAt: toInstant(),
      },
      select: { id: true },
    });

    return this.getProfile(userId, requestedOrgId);
  }

  async updatePreferences(
    userId: string,
    dto: UpdateUserPreferencesDto,
    requestedOrgId?: string | null,
  ) {
    const data: {
      preferredLanguage?: string | null;
      preferredTimezone?: string | null;
      updatedAt: Date;
    } = {
      updatedAt: toInstant(),
    };

    if (dto.preferredLanguage !== undefined) {
      data.preferredLanguage = dto.preferredLanguage;
    }
    if (dto.preferredTimezone !== undefined) {
      data.preferredTimezone = dto.preferredTimezone
        ? canonicalizeTimezone(dto.preferredTimezone)
        : null;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true },
    });

    return this.getProfile(userId, requestedOrgId);
  }

  async getMyPermissions(user: {
    id: string;
    role: Role;
    organizationId?: string | null;
    isOwner?: boolean;
  }) {
    if (this.permissionResolver) {
      const permissions = await this.permissionResolver.resolveAllPermissions(
        user.organizationId,
        user.role,
        user.isOwner ?? false,
      );
      return { permissions };
    }

    if (user.isOwner || user.role === Role.ADMIN) {
      return { permissions: Object.keys(PERMISSIONS) as Permission[] };
    }
    const permissions = (Object.keys(PERMISSIONS) as Permission[]).filter((p) =>
      hasPermission(user.role, p),
    );
    return { permissions };
  }
}
