import { Inject, Injectable } from "@nestjs/common";
import { AppUnauthorizedException } from "../common/app-exception";
import { APP_ERROR_CODES } from "@haihire/shared";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { env } from "../config/env";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tokenVersion?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
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
              return decodeURIComponent(match[1]);
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
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        organizationId: true,
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

    let isOwner = false;
    let organization: {
      id: string;
      name: string;
      slug: string;
      ownerId: string;
    } | null = null;
    if (user.organizationId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: {
          id: true,
          name: true,
          slug: true,
          ownerId: true,
        },
      });

      if (org) {
        organization = org;
        isOwner = Boolean(org.ownerId === user.id);
      }
    }

    return {
      ...user,
      organization,
      isOwner,
    };
  }
}
