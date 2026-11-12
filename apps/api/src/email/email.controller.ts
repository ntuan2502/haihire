import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/roles.guard";
import { RequirePermission } from "../auth/require-permission.decorator";
import { EmailService } from "./email.service";
import { AVAILABLE_VARIABLES } from "./variable-registry";
import { CreateEmailTemplateDto } from "./dto/create-template.dto";
import {
  DuplicateEmailTemplateDto,
  UpdateEmailTemplateDto,
} from "./dto/update-template.dto";
import { UpdateEmailFlowDto } from "./dto/update-flow.dto";
import { UpdateEmailSettingDto } from "./dto/update-setting.dto";
import { SendEmailDto, SendTestEmailDto } from "./dto/send-email.dto";
import { DtoPipe } from "../common/dto-validation.pipe";
import { ActiveTenantGuard } from "../common/guards/active-tenant.guard";

@Controller("email")
@UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
export class EmailController {
  constructor(
    @Inject(EmailService)
    private readonly emailService: EmailService,
  ) {}

  @Get("variables")
  @RequirePermission("email:view")
  getVariables() {
    return AVAILABLE_VARIABLES;
  }

  @Get("templates")
  @RequirePermission("email:view")
  getTemplates(
    @Request() req: { user: { organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
  ) {
    return this.emailService.getTemplates(
      organizationId,
      req.user.organizationId,
    );
  }

  @Post("templates")
  @RequirePermission("email:manage_templates")
  createTemplate(
    @Body(DtoPipe(CreateEmailTemplateDto)) dto: CreateEmailTemplateDto,
    @Request() req: { user: { organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
  ) {
    return this.emailService.createTemplate(
      organizationId,
      dto,
      req.user.organizationId,
    );
  }

  @Post("templates/:id/duplicate")
  @RequirePermission("email:manage_templates")
  duplicateTemplate(
    @Param("id") id: string,
    @Body(DtoPipe(DuplicateEmailTemplateDto)) dto: DuplicateEmailTemplateDto,
    @Request() req: { user: { organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
  ) {
    return this.emailService.duplicateTemplate(
      organizationId,
      id,
      dto,
      req.user.organizationId,
    );
  }

  @Put("templates/by-type/:type")
  @RequirePermission("email:manage_templates")
  updateTemplateByType(
    @Param("type") type: string,
    @Body(DtoPipe(UpdateEmailTemplateDto)) dto: UpdateEmailTemplateDto,
    @Request() req: { user: { organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
  ) {
    return this.emailService.updateTemplate(
      organizationId,
      type,
      dto,
      req.user.organizationId,
    );
  }

  @Put("templates/:id")
  @RequirePermission("email:manage_templates")
  updateTemplate(
    @Param("id") id: string,
    @Body(DtoPipe(UpdateEmailTemplateDto)) dto: UpdateEmailTemplateDto,
    @Request() req: { user: { organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
  ) {
    return this.emailService.updateTemplate(
      organizationId,
      id,
      dto,
      req.user.organizationId,
    );
  }

  @Delete("templates/:id")
  @RequirePermission("email:manage_templates")
  deleteTemplate(
    @Param("id") id: string,
    @Request() req: { user: { organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
  ) {
    return this.emailService.deleteTemplate(
      organizationId,
      id,
      req.user.organizationId,
    );
  }

  @Get("flows")
  @RequirePermission("email:view")
  getFlows(
    @Request() req: { user: { organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
  ) {
    return this.emailService.getFlows(organizationId, req.user.organizationId);
  }

  @Put("flows/:flowKey")
  @RequirePermission("email:manage_templates")
  updateFlow(
    @Param("flowKey") flowKey: string,
    @Body(DtoPipe(UpdateEmailFlowDto)) dto: UpdateEmailFlowDto,
    @Request() req: { user: { organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
  ) {
    return this.emailService.updateFlow(
      organizationId,
      flowKey,
      dto,
      req.user.organizationId,
    );
  }

  @Get("settings")
  @RequirePermission("email:view")
  getSettings(
    @Request() req: { user: { organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
  ) {
    return this.emailService.getSettings(
      organizationId,
      req.user.organizationId,
    );
  }

  @Put("settings")
  @RequirePermission("email:manage_settings")
  updateSettings(
    @Body(DtoPipe(UpdateEmailSettingDto)) dto: UpdateEmailSettingDto,
    @Request() req: { user: { organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
  ) {
    return this.emailService.updateSettings(
      organizationId,
      dto,
      req.user.organizationId,
    );
  }

  @Post("send")
  @RequirePermission("email:send")
  sendEmail(
    @Body(DtoPipe(SendEmailDto)) dto: SendEmailDto,
    @Request()
    req: {
      user: {
        id: string;
        name: string;
        email: string;
        organizationId?: string | null;
      };
    },
    @Query("organizationId") organizationId?: string,
  ) {
    return this.emailService.sendEmail(
      dto,
      organizationId,
      req.user,
      req.user.organizationId,
    );
  }

  @Post("test")
  @RequirePermission("email:send")
  sendTestEmail(
    @Body(DtoPipe(SendTestEmailDto)) dto: SendTestEmailDto,
    @Request()
    req: { user: { id: string; name: string; organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
  ) {
    return this.emailService.sendTestEmail(
      dto,
      organizationId,
      req.user,
      req.user.organizationId,
    );
  }

  @Get("logs")
  @RequirePermission("email:view")
  getLogs(
    @Request() req: { user: { organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
    @Query("candidateId") candidateId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("status") status?: string,
  ) {
    return this.emailService.getLogs(
      organizationId,
      {
        candidateId,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        search,
        status,
      },
      req.user.organizationId,
    );
  }
}
