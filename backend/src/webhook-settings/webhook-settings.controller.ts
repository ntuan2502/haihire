import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { TenantGuard } from "../common/guards/tenant.guard";
import { DtoPipe } from "../common/dto-validation.pipe";
import { WebhookSettingsService } from "./webhook-settings.service";
import { CreateWebhookSettingDto } from "./dto/create-webhook-setting.dto";
import { UpdateWebhookSettingDto } from "./dto/update-webhook-setting.dto";
import { TestWebhookSettingDto } from "./dto/test-webhook-setting.dto";
import { AppForbiddenException } from "../common/app-exception";
import { APP_ERROR_CODES } from "@haihire/shared";

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    role: string;
    organizationId?: string | null;
  };
}

@Controller("webhook-settings")
@UseGuards(AuthGuard("jwt"), TenantGuard, RolesGuard)
@Roles("ADMIN")
export class WebhookSettingsController {
  constructor(
    @Inject(WebhookSettingsService)
    private readonly service: WebhookSettingsService,
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

  @Get()
  async findAll(@Request() req: AuthenticatedRequest) {
    const orgId = this.getOrgId(req);
    return this.service.findAll(orgId);
  }

  @Get(":id")
  async findOne(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const orgId = this.getOrgId(req);
    return this.service.findOne(id, orgId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Request() req: AuthenticatedRequest,
    @Body(DtoPipe(CreateWebhookSettingDto)) dto: CreateWebhookSettingDto,
  ) {
    const orgId = this.getOrgId(req);
    return this.service.create(orgId, req.user.id, dto);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
    @Body(DtoPipe(UpdateWebhookSettingDto)) dto: UpdateWebhookSettingDto,
  ) {
    const orgId = this.getOrgId(req);
    return this.service.update(id, orgId, req.user.id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  async delete(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const orgId = this.getOrgId(req);
    return this.service.delete(id, orgId);
  }

  @Post("test")
  @HttpCode(HttpStatus.OK)
  async testConnection(
    @Request() req: AuthenticatedRequest,
    @Body(DtoPipe(TestWebhookSettingDto)) dto: TestWebhookSettingDto,
  ) {
    const orgId = this.getOrgId(req);
    return this.service.testConnection(orgId, dto);
  }
}
