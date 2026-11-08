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
    const user = await this.prisma.db.orm.public.User.select(
      "id",
      "email",
      "name",
      "role",
      "avatarUrl",
      "organizationId",
      "tokenVersion",
      "createdAt",
    )
      .where((u) => u.id.eq(payload.sub))
      .first();

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
      const org = await this.prisma.db.orm.public.Organization.select(
        "id",
        "name",
        "slug",
        "ownerId",
      )
        .where((o) => o.id.eq(user.organizationId as string))
        .first();

      if (org) {
        organization = org;
        isOwner = Boolean(org.ownerId === user.id);
      }
    }

    return {
      ...user,
      isOwner,
      organization,
    };
  }
}
