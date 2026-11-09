import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Request,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { OptionalJwtAuthGuard } from "./optional-jwt-auth.guard";
import { DtoPipe } from "../common/dto-validation.pipe";
import { env } from "../config/env";
import {
  AppUnauthorizedException,
} from "../common/app-exception";
import { APP_ERROR_CODES, Role } from "@haihire/shared";

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken?: string,
  ) {
    if (res?.cookie) {
      res.cookie("haihire_token", accessToken, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });
      if (refreshToken) {
        res.cookie("haihire_refresh_token", refreshToken, {
          httpOnly: true,
          secure: env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: "/",
        });
      }
    }
  }

  private clearAuthCookies(res: Response) {
    if (res?.cookie) {
      const cookieOptions = {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax" as const,
        maxAge: 0,
        path: "/",
      };
      res.cookie("haihire_token", "", cookieOptions);
      res.cookie("haihire_refresh_token", "", cookieOptions);
    }
  }

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
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
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
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
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
      throw new AppUnauthorizedException(
        APP_ERROR_CODES.USER_SESSION_EXPIRED,
        "No refresh token provided",
      );
    }
    const result = await this.authService.refreshToken({ refreshToken: token });
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return result;
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
    this.clearAuthCookies(res);
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
    this.setAuthCookies(res, result.accessToken);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  getProfile(@Request() req: { user: { id: string } }) {
    return this.authService.getProfile(req.user.id);
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
