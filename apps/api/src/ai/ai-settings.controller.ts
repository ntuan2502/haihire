import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Post,
  Put,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Throttle } from "@nestjs/throttler";
import {
  APP_ERROR_CODES,
  testAiConnectionSchema,
  upsertAiSettingSchema,
  type TestAiConnectionInput,
  type UpsertAiSettingInput,
} from "@haihire/shared";
import { RequirePermission } from "../auth/require-permission.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AppForbiddenException } from "../common/app-exception";
import { DtoPipe } from "../common/dto-validation.pipe";
import { ActiveTenantGuard } from "../common/guards/active-tenant.guard";
import { AiSettingsService } from "./ai-settings.service";

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    role: string;
    organizationId?: string | null;
  };
}

@Controller("ai-settings")
@UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
export class AiSettingsController {
  constructor(
    @Inject(AiSettingsService)
    private readonly aiSettingsService: AiSettingsService,
  ) {}

  private getOrgId(req: AuthenticatedRequest): string {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "Active organization context is required",
      );
    }
    return orgId;
  }

  @Get("status")
  @RequirePermission("job:view")
  getStatus(@Request() req: AuthenticatedRequest) {
    const orgId = this.getOrgId(req);
    return this.aiSettingsService.getStatus(orgId);
  }

  @Get()
  @RequirePermission("settings:manage_integrations")
  getSetting(@Request() req: AuthenticatedRequest) {
    const orgId = this.getOrgId(req);
    return this.aiSettingsService.getSetting(orgId);
  }

  @Put()
  @RequirePermission("settings:manage_integrations")
  upsertSetting(
    @Request() req: AuthenticatedRequest,
    @Body(DtoPipe(upsertAiSettingSchema)) dto: UpsertAiSettingInput,
  ) {
    const orgId = this.getOrgId(req);
    return this.aiSettingsService.upsertSetting(orgId, req.user.id, dto);
  }

  @Delete()
  @RequirePermission("settings:manage_integrations")
  deleteSetting(@Request() req: AuthenticatedRequest) {
    const orgId = this.getOrgId(req);
    return this.aiSettingsService.deleteSetting(orgId, req.user.id);
  }

  @Post("test")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @RequirePermission("settings:manage_integrations")
  testConnection(
    @Request() req: AuthenticatedRequest,
    @Body(DtoPipe(testAiConnectionSchema)) dto: TestAiConnectionInput,
  ) {
    const orgId = this.getOrgId(req);
    return this.aiSettingsService.testConnection(orgId, dto);
  }
}
