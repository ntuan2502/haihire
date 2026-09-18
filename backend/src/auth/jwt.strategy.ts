import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(ConfigService)
    configService: ConfigService,
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {
    const jwtSecret =
      configService.get<string>("JWT_SECRET") || process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET must be configured in environment");
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
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
      throw new UnauthorizedException("User not found or token invalid");
    }

    return user;
  }
}
