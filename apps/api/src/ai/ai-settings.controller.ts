import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Throttle } from "@nestjs/throttler";
import {
  APP_ERROR_CODES,
  createAiConnectionSchema,
  testAiConnectionSchema,
  updateAiConnectionSchema,
  updateAiFeatureRoutesSchema,
  updateAiPolicySchema,
  type CreateAiConnectionInput,
  type TestAiConnectionInput,
  type UpdateAiConnectionInput,
  type UpdateAiFeatureRoutesInput,
  type UpdateAiPolicyInput,
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
  getOverview(@Request() req: AuthenticatedRequest) {
    const orgId = this.getOrgId(req);
    return this.aiSettingsService.getOverview(orgId);
  }

  @Put("policy")
  @RequirePermission("settings:manage_integrations")
  updatePolicy(
    @Request() req: AuthenticatedRequest,
    @Body(DtoPipe(updateAiPolicySchema)) dto: UpdateAiPolicyInput,
  ) {
    const orgId = this.getOrgId(req);
    return this.aiSettingsService.updatePolicy(orgId, req.user.id, dto);
  }

  @Post("connections")
  @RequirePermission("settings:manage_integrations")
  createConnection(
    @Request() req: AuthenticatedRequest,
    @Body(DtoPipe(createAiConnectionSchema)) dto: CreateAiConnectionInput,
  ) {
    const orgId = this.getOrgId(req);
    return this.aiSettingsService.createConnection(orgId, req.user.id, dto);
  }

  @Patch("connections/:id")
  @RequirePermission("settings:manage_integrations")
  updateConnection(
    @Request() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body(DtoPipe(updateAiConnectionSchema)) dto: UpdateAiConnectionInput,
  ) {
    const orgId = this.getOrgId(req);
    return this.aiSettingsService.updateConnection(orgId, req.user.id, id, dto);
  }

  @Delete("connections/:id")
  @RequirePermission("settings:manage_integrations")
  deleteConnection(
    @Request() req: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    const orgId = this.getOrgId(req);
    return this.aiSettingsService.deleteConnection(orgId, req.user.id, id);
  }

  @Post("connections/test")
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @RequirePermission("settings:manage_integrations")
  testConnection(
    @Request() req: AuthenticatedRequest,
    @Body(DtoPipe(testAiConnectionSchema)) dto: TestAiConnectionInput,
  ) {
    const orgId = this.getOrgId(req);
    return this.aiSettingsService.testConnection(orgId, dto);
  }

  @Put("routes")
  @RequirePermission("settings:manage_integrations")
  updateFeatureRoutes(
    @Request() req: AuthenticatedRequest,
    @Body(DtoPipe(updateAiFeatureRoutesSchema))
    dto: UpdateAiFeatureRoutesInput,
  ) {
    const orgId = this.getOrgId(req);
    return this.aiSettingsService.updateFeatureRoutes(orgId, req.user.id, dto);
  }

  @Post("routes/:feature/test")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @RequirePermission("settings:manage_integrations")
  testFeatureRoute(
    @Request() req: AuthenticatedRequest,
    @Param("feature") feature: string,
  ) {
    const orgId = this.getOrgId(req);
    return this.aiSettingsService.testFeatureRoute(orgId, feature);
  }
}
