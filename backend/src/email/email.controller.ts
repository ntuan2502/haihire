import {
  Body,
  Controller,
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
import { UpdateEmailTemplateDto } from "./dto/update-template.dto";
import { UpdateEmailSettingDto } from "./dto/update-setting.dto";
import { SendEmailDto, SendTestEmailDto } from "./dto/send-email.dto";
import {
  SendSystemEmailDto,
  SendSystemTestEmailDto,
} from "./dto/send-system-email.dto";
import { DtoPipe } from "../common/dto-validation.pipe";

@Controller("email")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class EmailController {
  constructor(
    @Inject(EmailService)
    private readonly emailService: EmailService,
  ) {}

  @Get("variables")
  getVariables() {
    return AVAILABLE_VARIABLES;
  }

  @Get("templates")
  getTemplates(
    @Request() req: { user: { organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
  ) {
    return this.emailService.getTemplates(
      organizationId,
      req.user.organizationId,
    );
  }

  @Put("templates/:type")
  @RequirePermission("email:manage_templates")
  updateTemplate(
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

  @Get("settings")
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

  @Get("system/config")
  @RequirePermission("email:manage_system")
  getSystemConfig() {
    return this.emailService.getSystemEmailConfig();
  }

  @Post("system/test")
  @RequirePermission("email:manage_system")
  sendSystemTestEmail(
    @Body(DtoPipe(SendSystemTestEmailDto)) dto: SendSystemTestEmailDto,
  ) {
    return this.emailService.sendSystemTestEmail(dto);
  }

  @Post("system/send")
  @RequirePermission("email:manage_system")
  sendSystemEmail(@Body(DtoPipe(SendSystemEmailDto)) dto: SendSystemEmailDto) {
    return this.emailService.sendSystemEmail(dto);
  }

  @Get("system/logs")
  @RequirePermission("email:manage_system")
  getSystemLogs(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("status") status?: string,
  ) {
    return this.emailService.getSystemLogs({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      status,
    });
  }
}
