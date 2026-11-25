import { Inject, Injectable, Optional } from "@nestjs/common";
import { AppUnauthorizedException } from "../common/app-exception";
import {
  APP_ERROR_CODES,
  formatUserDisplayName,
  type NameDisplayOrder,
} from "@haihire/shared";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { env } from "../config/env";
import {
  ORG_SUMMARY_SELECT,
  getPreferredMembershipOrderBy,
  serializeOrganizationSummary,
} from "../organizations/organization-logo.util";
import { UserSecurityService } from "./user-security.service";

export interface JwtPayload {
  sub: string;
  email?: string;
  role?: string;
  type?: string;
  tokenVersion?: number;
  sid?: string;
  organizationId?: string | null;
  activeOrgId?: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(UserSecurityService)
    private readonly userSecurity?: UserSecurityService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          if (req?.cookies && req.cookies["haihire_token"]) {
            return req.cookies["haihire_token"];
          }
          if (req?.headers?.cookie) {
            const match = req.headers.cookie.match(
              /(?:^|;\s*)haihire_token=([^;]+)/,
            );
            if (match) {
              try {
                return decodeURIComponent(match[1]);
              } catch {
                return null;
              }
            }
          }
          return null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type === "refresh") {
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.UNAUTHORIZED,
        "Refresh token cannot be used as an access token",
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        avatarSource: true,
        preferredLanguage: true,
        preferredTimezone: true,
        tokenVersion: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.UNAUTHORIZED,
        "User not found or token invalid",
      );
    }

    const payloadTokenVersion = payload.tokenVersion ?? 0;
    const userTokenVersion = user.tokenVersion ?? 0;
    if (payloadTokenVersion !== userTokenVersion) {
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.UNAUTHORIZED,
        "Token has been revoked",
      );
    }

    if (payload.sid) {
      if (this.userSecurity) {
        await this.userSecurity.validateSession(payload.sid, user.id);
      } else if (typeof this.prisma.userSession?.findUnique === "function") {
        const session = await this.prisma.userSession.findUnique({
          where: { id: payload.sid },
          select: { userId: true, revokedAt: true, expiresAt: true },
        });
        if (
          !session ||
          session.userId !== user.id ||
          session.revokedAt !== null ||
          new Date(session.expiresAt).getTime() <= Date.now()
        ) {
          throw new AppUnauthorizedException(
            APP_ERROR_CODES.UNAUTHORIZED,
            "Session has been revoked or expired",
          );
        }
      }
    }

    const legacyUserOrgId = (
      user as unknown as { organizationId?: string | null }
    )?.organizationId;
    const legacyUserRole = (user as unknown as { role?: string })?.role;

    const requestedOrgId =
      payload.organizationId || payload.activeOrgId || legacyUserOrgId || null;

    let isOwner = false;
    let activeOrgId: string | null = null;
    let activeRole: string = legacyUserRole || payload.role || "MEMBER";
    let organization: {
      id: string;
      name: string;
      slug: string;
      ownerId: string;
      logoUrl?: string | null;
      defaultLanguage?: string;
      timezone?: string;
      dateFormat?: string;
      timeFormat?: string;
      nameDisplayOrder?: string;
      defaultCurrency?: string;
    } | null = null;

    if (requestedOrgId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: requestedOrgId },
        select: ORG_SUMMARY_SELECT,
      });

      if (org) {
        organization = serializeOrganizationSummary(org);
        isOwner = Boolean(org.ownerId === user.id);
        activeOrgId = org.id;

        if (this.prisma.organizationMember?.findFirst) {
          const member = await this.prisma.organizationMember.findFirst({
            where: { organizationId: org.id, userId: user.id },
            select: { role: true },
          });
          if (member) {
            activeRole = isOwner ? "ADMIN" : member.role;
          } else if (isOwner) {
            activeRole = "ADMIN";
          } else {
            organization = null;
            activeOrgId = null;
            activeRole = "MEMBER";
          }
        }
      } else {
        activeRole = "MEMBER";
      }
    } else {
      if (this.prisma.organizationMember?.findFirst) {
        const member = await this.prisma.organizationMember.findFirst({
          where: { userId: user.id },
          orderBy: getPreferredMembershipOrderBy(),
          select: { organizationId: true, role: true },
        });
        if (member) {
          const org = await this.prisma.organization.findUnique({
            where: { id: member.organizationId },
            select: ORG_SUMMARY_SELECT,
          });
          if (org) {
            organization = serializeOrganizationSummary(org);
            isOwner = Boolean(org.ownerId === user.id);
            activeOrgId = org.id;
            activeRole = isOwner ? "ADMIN" : member.role;
          }
        }
      }
    }

    const orgOrder: NameDisplayOrder =
      organization?.nameDisplayOrder === "LAST_FIRST"
        ? "LAST_FIRST"
        : "FIRST_LAST";

    return {
      ...user,
      sessionId: payload.sid ?? null,
      organizationId: activeOrgId,
      role: activeRole,
      name: formatUserDisplayName(user, orgOrder),
      organization,
      isOwner,
    };
  }
}
