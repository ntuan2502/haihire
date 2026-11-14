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
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "./constants";
import { env } from "../config/env";
import { toInstant } from "../common/date.util";

const USER_PROFILE_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  avatarUrl: true,
  preferredLanguage: true,
  preferredTimezone: true,
  organizationId: true,
  createdAt: true,
} as const;

const ORG_SUMMARY_SELECT = {
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

    // Auto-provision demo accounts in non-production environments if database is fresh
    const isDevOrDemoEnabled = env.NODE_ENV !== "production";

    if (!user && isDevOrDemoEnabled) {
      const demoAccountList = [DEMO_ACCOUNTS.ADMIN, DEMO_ACCOUNTS.MEMBER];
      const matchedDemo = demoAccountList.find(
        (a) => a.email.toLowerCase() === normalizedEmail,
      );

      if (matchedDemo && dto.password === DEMO_PASSWORD) {
        const hashedPassword = bcrypt.hashSync(DEMO_PASSWORD, 10);
        let orgId: string | null = null;

        if (matchedDemo.role === "ADMIN") {
          const adminUserId = crypto.randomUUID();
          const existingOrg = await this.prisma.organization.findUnique({
            where: { slug: "admin" },
            select: { id: true },
          });

          const orgIdToAssign = existingOrg ? existingOrg.id : null;

          user = await this.prisma.user.upsert({
            where: { email: normalizedEmail },
            create: {
              id: adminUserId,
              email: normalizedEmail,
              firstName: matchedDemo.firstName,
              lastName: matchedDemo.lastName,
              role: matchedDemo.role,
              password: hashedPassword,
              organizationId: orgIdToAssign,
              updatedAt: toInstant(),
            },
            update: {
              password: hashedPassword,
              firstName: matchedDemo.firstName,
              lastName: matchedDemo.lastName,
              role: matchedDemo.role,
              ...(orgIdToAssign ? { organizationId: orgIdToAssign } : {}),
            },
            select: {
              ...USER_PROFILE_SELECT,
              password: true,
              tokenVersion: true,
            },
          });

          if (!existingOrg) {
            const newOrgId = crypto.randomUUID();
            await this.prisma.organization.upsert({
              where: { slug: "admin" },
              create: {
                id: newOrgId,
                name: "Admin",
                slug: "admin",
                ownerId: user.id,
                updatedAt: toInstant(),
              },
              update: { ownerId: user.id },
            });
            orgId = newOrgId;
            await this.prisma.user.update({
              where: { id: user.id },
              data: { organizationId: orgId, updatedAt: toInstant() },
            });
            user = { ...user, organizationId: orgId };
          } else {
            orgId = existingOrg.id;
          }
        } else {
          user = await this.prisma.user.upsert({
            where: { email: normalizedEmail },
            create: {
              id: crypto.randomUUID(),
              email: normalizedEmail,
              firstName: matchedDemo.firstName,
              lastName: matchedDemo.lastName,
              role: matchedDemo.role,
              password: hashedPassword,
              organizationId: null,
              updatedAt: toInstant(),
            },
            update: {
              password: hashedPassword,
              firstName: matchedDemo.firstName,
              lastName: matchedDemo.lastName,
              role: matchedDemo.role,
              organizationId: null,
            },
            select: {
              ...USER_PROFILE_SELECT,
              password: true,
              tokenVersion: true,
            },
          });
        }
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

    let organization = null;
    if (sanitizedUser.organizationId) {
      organization = await this.prisma.organization.findUnique({
        where: { id: sanitizedUser.organizationId },
        select: ORG_SUMMARY_SELECT,
      });
    }

    const isOwner = Boolean(
      organization && organization.ownerId === sanitizedUser.id,
    );
    const orgOrder: NameDisplayOrder =
      organization?.nameDisplayOrder === "LAST_FIRST"
        ? "LAST_FIRST"
        : "FIRST_LAST";

    return {
      ...sanitizedUser,
      name: formatUserDisplayName(sanitizedUser, orgOrder),
      isOwner,
      organization,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.validateRecruiter(dto);

    const tokenVersion = user.tokenVersion ?? 0;
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenVersion,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: "refresh", tokenVersion, jti: crypto.randomUUID() },
      { expiresIn: "7d" },
    );

    return {
      accessToken,
      refreshToken,
      user,
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

    const hashedPassword = bcrypt.hashSync(dto.password, 10);
    const id = crypto.randomUUID();

    await this.prisma.user.create({
      data: {
        id,
        email: normalizedEmail,
        firstName,
        lastName,
        password: hashedPassword,
        role: "MEMBER",
        organizationId: null,
        tokenVersion: 0,
        updatedAt: toInstant(),
      },
    });

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
        role: true,
        organizationId: true,
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
        const isRevoked = await this.redis.get(`revoked_rt:${decoded.jti}`);
        if (isRevoked) {
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
        // Mark this refresh token jti as revoked with a 7-day TTL
        await this.redis.set(
          `revoked_rt:${decoded.jti}`,
          "1",
          "EX",
          7 * 24 * 3600,
        );
      } catch (err) {
        if (err instanceof AppUnauthorizedException) throw err;
      }
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: userTokenVersion,
    };

    const newAccessToken = this.jwtService.sign(payload);
    const newRefreshToken = this.jwtService.sign(
      {
        sub: user.id,
        type: "refresh",
        tokenVersion: userTokenVersion,
        jti: crypto.randomUUID(),
      },
      { expiresIn: "7d" },
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      hasOrg: Boolean(user.organizationId),
    };
  }

  async logout(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tokenVersion: true,
      },
    });

    if (user) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          tokenVersion: { increment: 1 },
          updatedAt: toInstant(),
        },
      });
    }
  }

  async changePassword(
    userId: string,
    currentPass: string,
    newPass: string,
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

    const hashedPassword = bcrypt.hashSync(newPass, 10);
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

    const tokenVersion = updatedUser.tokenVersion ?? 0;
    const payload = {
      sub: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      tokenVersion,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      {
        sub: updatedUser.id,
        type: "refresh",
        tokenVersion,
        jti: crypto.randomUUID(),
      },
      { expiresIn: "7d" },
    );

    const org = updatedUser.organizationId
      ? await this.prisma.organization.findUnique({
          where: { id: updatedUser.organizationId },
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
        role: updatedUser.role,
        avatarUrl: updatedUser.avatarUrl,
        preferredLanguage: updatedUser.preferredLanguage,
        preferredTimezone: updatedUser.preferredTimezone,
        organizationId: updatedUser.organizationId,
        createdAt: updatedUser.createdAt,
      },
    };
  }

  async getProfile(userId: string) {
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

    let organization = null;
    let isOwner = false;
    if (user.organizationId) {
      organization = await this.prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: ORG_SUMMARY_SELECT,
      });

      if (organization && organization.ownerId === user.id) {
        isOwner = true;
      }
    }

    const orgOrder: NameDisplayOrder =
      organization?.nameDisplayOrder === "LAST_FIRST"
        ? "LAST_FIRST"
        : "FIRST_LAST";

    return {
      ...user,
      name: formatUserDisplayName(user, orgOrder),
      preferredTimezone: user.preferredTimezone
        ? canonicalizeTimezone(user.preferredTimezone)
        : user.preferredTimezone,
      isOwner,
      organization: organization
        ? {
            ...organization,
            timezone: canonicalizeTimezone(organization.timezone),
          }
        : organization,
    };
  }

  async updateProfile(userId: string, dto: UpdateUserProfileDto) {
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

    return this.getProfile(userId);
  }

  async updatePreferences(userId: string, dto: UpdateUserPreferencesDto) {
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

    return this.getProfile(userId);
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
