import { Inject, Injectable } from "@nestjs/common";
import { AppUnauthorizedException } from "../common/app-exception";
import { APP_ERROR_CODES } from "@haihire/shared";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../prisma/prisma.service";
import { env } from "../config/env";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
      "createdAt",
    )
      .where((u) => u.id.eq(payload.sub))
      .first();

    if (!user) {
      throw new AppUnauthorizedException(APP_ERROR_CODES.UNAUTHORIZED, "User not found or token invalid");
    }

    return user;
  }
}
