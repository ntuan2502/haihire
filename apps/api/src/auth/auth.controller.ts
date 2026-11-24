import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { AuthService } from "./auth.service";
import {
  clearAuthCookies,
  setAuthCookies,
  setHasOrgCookie,
} from "./auth-cookies";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { UpdateUserPreferencesDto } from "./dto/update-user-preferences.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { OptionalJwtAuthGuard } from "./optional-jwt-auth.guard";
import { DtoPipe } from "../common/dto-validation.pipe";
import { env } from "../config/env";
import { AppUnauthorizedException } from "../common/app-exception";
import { avatarFileFilter } from "../common/upload-utils";
import {
  APP_ERROR_CODES,
  MAX_USER_AVATAR_SIZE_BYTES,
  Role,
  registerSchema,
  updateUserAvatarSourceSchema,
  updateUserProfileSchema,
  type RegisterSchema,
  type UpdateUserAvatarSourceSchema,
  type UpdateUserProfileSchema,
} from "@haihire/shared";

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
    @Body(DtoPipe(registerSchema)) dto: RegisterSchema,
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

  private extractRefreshToken(
    req?: {
      cookies?: Record<string, string>;
      headers?: { cookie?: string };
    },
    bodyToken?: string,
  ): string | undefined {
    let token = bodyToken;
    if (!token && req?.cookies && req.cookies["haihire_refresh_token"]) {
      token = req.cookies["haihire_refresh_token"];
    }
    if (!token && req?.headers?.cookie) {
      const match = req.headers.cookie.match(
        /(?:^|;\s*)haihire_refresh_token=([^;]+)/,
      );
      if (match) {
        try {
          token = decodeURIComponent(match[1]);
        } catch {
          return undefined;
        }
      }
    }
    return token;
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
    const token = this.extractRefreshToken(req, dto.refreshToken);
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
    @Request()
    req: {
      user?: { id?: string; organizationId?: string | null };
      cookies?: Record<string, string>;
      headers?: { cookie?: string };
    },
    @Res({ passthrough: true }) res: Response,
  ) {
    if (req?.user?.id) {
      await this.authService.logout(req.user.id, req.user.organizationId);
    } else {
      const refreshToken = this.extractRefreshToken(req);
      if (
        refreshToken &&
        typeof this.authService.logoutWithRefreshToken === "function"
      ) {
        await this.authService.logoutWithRefreshToken(refreshToken);
      }
    }
    clearAuthCookies(res);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post("change-password")
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req: { user: { id: string; organizationId?: string | null } },
    @Body(DtoPipe(ChangePasswordDto)) dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.changePassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword,
      req.user.organizationId,
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
    @Request() req: { user: { id: string; organizationId?: string | null } },
    @Res({ passthrough: true }) res?: Response,
  ) {
    const user = await this.authService.getProfile(
      req.user.id,
      req.user.organizationId,
    );
    setHasOrgCookie(res, Boolean(user?.organizationId));
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch("me/profile")
  async updateProfile(
    @Request() req: { user: { id: string; organizationId?: string | null } },
    @Body(DtoPipe(updateUserProfileSchema)) dto: UpdateUserProfileSchema,
  ) {
    return this.authService.updateProfile(
      req.user.id,
      dto,
      req.user.organizationId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch("me/preferences")
  async updatePreferences(
    @Request() req: { user: { id: string; organizationId?: string | null } },
    @Body(DtoPipe(UpdateUserPreferencesDto)) dto: UpdateUserPreferencesDto,
  ) {
    return this.authService.updatePreferences(
      req.user.id,
      dto,
      req.user.organizationId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post("me/avatar")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_USER_AVATAR_SIZE_BYTES },
      fileFilter: avatarFileFilter,
    }),
  )
  async uploadAvatar(
    @Request() req: { user: { id: string; organizationId?: string | null } },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.authService.uploadAvatar(
      req.user.id,
      file,
      req.user.organizationId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch("me/avatar")
  async updateAvatarSource(
    @Request() req: { user: { id: string; organizationId?: string | null } },
    @Body(DtoPipe(updateUserAvatarSourceSchema))
    dto: UpdateUserAvatarSourceSchema,
  ) {
    return this.authService.updateAvatarSource(
      req.user.id,
      dto.source,
      req.user.organizationId,
    );
  }

  @Throttle({ default: { limit: 600, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @Get("avatars/:userId")
  async getUserAvatar(
    @Request() req: { user: { id: string } },
    @Param("userId", new ParseUUIDPipe()) userId: string,
    @Res() res: Response,
    @Query("v") version?: string,
  ) {
    const { stream, mimeType } = await this.authService.prepareUserAvatarStream(
      req.user.id,
      userId,
    );
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader(
      "Cache-Control",
      version ? "private, max-age=31536000, immutable" : "private, max-age=300",
    );
    stream.on("error", () => {
      if (!res.headersSent) {
        res.status(404).end();
      }
    });
    stream.pipe(res);
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
