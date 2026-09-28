import {
  Inject,
  Injectable,
} from "@nestjs/common";
import { AppConflictException, AppUnauthorizedException } from "../common/app-exception";
import { APP_ERROR_CODES } from "@haihire/shared";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "./constants";
import { env } from "../config/env";

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(JwtService)
    private readonly jwtService: JwtService,
  ) {}

  async validateRecruiter(dto: LoginDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    let user = await this.prisma.db.orm.public.User.select(
      "id",
      "email",
      "name",
      "password",
      "role",
      "avatarUrl",
      "organizationId",
      "createdAt",
    )
      .where((u) => u.email.eq(normalizedEmail))
      .first();

    // Auto-provision demo accounts in non-production environments if database is fresh
    const isDevOrDemoEnabled =
      env.NODE_ENV !== "production" || process.env.ENABLE_DEMO_ACCOUNTS === "true";

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
          const existingOrg = await this.prisma.db.orm.public.Organization.select(
            "id",
          )
            .where((o) => o.slug.eq("admin"))
            .first();

          if (!existingOrg) {
            const newOrgId = crypto.randomUUID();
            await this.prisma.db.orm.public.Organization.upsert({
              create: {
                id: newOrgId,
                name: "Admin",
                slug: "admin",
                ownerId: adminUserId,
              },
              update: { ownerId: adminUserId },
              conflictOn: { slug: "admin" },
            });
            orgId = newOrgId;
          } else {
            orgId = existingOrg.id;
          }

          user = await this.prisma.db.orm.public.User.upsert({
            create: {
              id: adminUserId,
              email: normalizedEmail,
              name: matchedDemo.name,
              role: matchedDemo.role,
              password: hashedPassword,
              organizationId: orgId,
            },
            update: {
              password: hashedPassword,
              name: matchedDemo.name,
              role: matchedDemo.role,
              organizationId: orgId,
            },
            conflictOn: { email: normalizedEmail },
          });
        } else {
          user = await this.prisma.db.orm.public.User.upsert({
            create: {
              email: normalizedEmail,
              name: matchedDemo.name,
              role: matchedDemo.role,
              password: hashedPassword,
              organizationId: null,
            },
            update: {
              password: hashedPassword,
              name: matchedDemo.name,
              role: matchedDemo.role,
              organizationId: null,
            },
            conflictOn: { email: normalizedEmail },
          });
        }
      }
    }

    if (!user || !user.password) {
      throw new AppUnauthorizedException(APP_ERROR_CODES.INVALID_CREDENTIALS, "Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new AppUnauthorizedException(APP_ERROR_CODES.INVALID_CREDENTIALS, "Invalid email or password");
    }

    const { password: _, ...sanitizedUser } = user;

    let organization = null;
    if (sanitizedUser.organizationId) {
      organization = await this.prisma.db.orm.public.Organization.select(
        "id",
        "name",
        "slug",
        "ownerId",
      )
        .where((o) => o.id.eq(sanitizedUser.organizationId as string))
        .first();
    }

    const isOwner = Boolean(
      organization && organization.ownerId === sanitizedUser.id,
    );

    return {
      ...sanitizedUser,
      isOwner,
      organization,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.validateRecruiter(dto);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: "refresh" },
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

    const existing = await this.prisma.db.orm.public.User.select("id")
      .where((u) => u.email.eq(normalizedEmail))
      .first();

    if (existing) {
      throw new AppConflictException(
        APP_ERROR_CODES.USER_EMAIL_EXISTS,
        "An account with this email address already exists.",
      );
    }

    const hashedPassword = bcrypt.hashSync(dto.password, 10);
    const id = crypto.randomUUID();

    await this.prisma.db.orm.public.User.upsert({
      create: {
        id,
        email: normalizedEmail,
        name: dto.name.trim(),
        password: hashedPassword,
        role: "MEMBER",
        organizationId: null,
      },
      update: {},
      conflictOn: { id: "00000000-0000-0000-0000-000000000000" },
    });

    const user = {
      id,
      email: normalizedEmail,
      name: dto.name.trim(),
      role: "MEMBER" as const,
      avatarUrl: null,
      organizationId: null,
      organization: null,
      isOwner: false,
      createdAt: new Date(),
    };

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: "refresh" },
      { expiresIn: "7d" },
    );

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    let decoded: { sub: string; type?: string };
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

    const user = await this.prisma.db.orm.public.User.select(
      "id",
      "email",
      "name",
      "role",
      "organizationId",
    )
      .where((u) => u.id.eq(decoded.sub))
      .first();

    if (!user) {
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.USER_SESSION_EXPIRED,
        "User not found or account has been deactivated",
      );
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const newAccessToken = this.jwtService.sign(payload);
    const newRefreshToken = this.jwtService.sign(
      { sub: user.id, type: "refresh" },
      { expiresIn: "7d" },
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.db.orm.public.User.select(
      "id",
      "email",
      "name",
      "role",
      "avatarUrl",
      "organizationId",
      "createdAt",
    )
      .where((u) => u.id.eq(userId))
      .first();

    if (!user) {
      throw new AppUnauthorizedException(APP_ERROR_CODES.USER_SESSION_EXPIRED, "User session expired or not found");
    }

    let organization = null;
    let isOwner = false;
    if (user.organizationId) {
      organization = await this.prisma.db.orm.public.Organization.select(
        "id",
        "name",
        "slug",
        "ownerId",
      )
        .where((o) => o.id.eq(user.organizationId as string))
        .first();

      if (organization && organization.ownerId === user.id) {
        isOwner = true;
      }
    }

    return {
      ...user,
      isOwner,
      organization,
    };
  }
}
