import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Patch,
  Post,
  Request,
  Res,
  UseGuards,
} from "@nestjs/common";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { AuthService } from "./auth.service";
import {
  clearAuthCookies,
  setAuthCookies,
  setHasOrgCookie,
} from "./auth-cookies";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { UpdateUserPreferencesDto } from "./dto/update-user-preferences.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { OptionalJwtAuthGuard } from "./optional-jwt-auth.guard";
import { DtoPipe } from "../common/dto-validation.pipe";
import { env } from "../config/env";
import { AppUnauthorizedException } from "../common/app-exception";
import { APP_ERROR_CODES, Role } from "@haihire/shared";

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  @Throttle({
    default: { limit: env.NODE_ENV === "production" ? 5 : 100, ttl: 60000 },
  })
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(DtoPipe(LoginDto)) dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    setAuthCookies(
      res,
      result.accessToken,
      result.refreshToken,
      Boolean(result.user?.organizationId),
    );
    return result;
  }

  @Throttle({
    default: { limit: env.NODE_ENV === "production" ? 5 : 100, ttl: 60000 },
  })
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body(DtoPipe(RegisterDto)) dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    setAuthCookies(
      res,
      result.accessToken,
      result.refreshToken,
      Boolean(result.user?.organizationId),
    );
    return result;
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Request()
    req: {
      cookies?: Record<string, string>;
      headers?: { cookie?: string };
    },
    @Body(DtoPipe(RefreshTokenDto)) dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    let token = dto.refreshToken;
    if (!token && req?.cookies && req.cookies["haihire_refresh_token"]) {
      token = req.cookies["haihire_refresh_token"];
    }
    if (!token && req?.headers?.cookie) {
      const match = req.headers.cookie.match(
        /(?:^|;\s*)haihire_refresh_token=([^;]+)/,
      );
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }
    if (!token) {
      clearAuthCookies(res);
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.USER_SESSION_EXPIRED,
        "No refresh token provided",
      );
    }
    try {
      const result = await this.authService.refreshToken({
        refreshToken: token,
      });
      setAuthCookies(
        res,
        result.accessToken,
        result.refreshToken,
        result.hasOrg,
      );
      return result;
    } catch (err) {
      clearAuthCookies(res);
      throw err;
    }
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @Request() req: { user?: { id?: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    if (req?.user?.id) {
      await this.authService.logout(req.user.id);
    }
    clearAuthCookies(res);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post("change-password")
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req: { user: { id: string } },
    @Body(DtoPipe(ChangePasswordDto)) dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.changePassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    setAuthCookies(
      res,
      result.accessToken,
      result.refreshToken,
      Boolean(result.user?.organizationId),
    );
    return result;
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Get("me")
  async getProfile(
    @Request() req: { user: { id: string } },
    @Res({ passthrough: true }) res?: Response,
  ) {
    const user = await this.authService.getProfile(req.user.id);
    setHasOrgCookie(res, Boolean(user?.organizationId));
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch("me/preferences")
  async updatePreferences(
    @Request() req: { user: { id: string } },
    @Body(DtoPipe(UpdateUserPreferencesDto)) dto: UpdateUserPreferencesDto,
  ) {
    return this.authService.updatePreferences(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me/permissions")
  getMyPermissions(
    @Request()
    req: {
      user: {
        id: string;
        role: Role;
        organizationId?: string | null;
        isOwner?: boolean;
      };
    },
  ) {
    return this.authService.getMyPermissions(req.user);
  }
}
