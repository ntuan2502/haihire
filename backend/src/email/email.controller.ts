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
import { Roles } from "../auth/roles.decorator";
import { EmailService } from "./email.service";
import { UpdateEmailTemplateDto } from "./dto/update-template.dto";
import { UpdateEmailSettingDto } from "./dto/update-setting.dto";
import { SendEmailDto, SendTestEmailDto } from "./dto/send-email.dto";

@Controller("email")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class EmailController {
  constructor(
    @Inject(EmailService)
    private readonly emailService: EmailService,
  ) {}

  @Get("templates")
  getTemplates(
    @Request() req: { user: { organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
  ) {
    const orgId = organizationId || req.user.organizationId;
    if (!orgId) return [];
    return this.emailService.getTemplates(orgId);
  }

  @Put("templates/:type")
  @Roles("ADMIN")
  updateTemplate(
    @Param("type") type: string,
    @Body() dto: UpdateEmailTemplateDto,
    @Request() req: { user: { organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
  ) {
    const orgId = organizationId || req.user.organizationId;
    if (!orgId) throw new Error("Organization ID is required");
    return this.emailService.updateTemplate(orgId, type, dto);
  }

  @Get("settings")
  getSettings(
    @Request() req: { user: { organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
  ) {
    const orgId = organizationId || req.user.organizationId;
    if (!orgId) return null;
    return this.emailService.getSettings(orgId);
  }

  @Put("settings")
  @Roles("ADMIN")
  updateSettings(
    @Body() dto: UpdateEmailSettingDto,
    @Request() req: { user: { organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
  ) {
    const orgId = organizationId || req.user.organizationId;
    if (!orgId) throw new Error("Organization ID is required");
    return this.emailService.updateSettings(orgId, dto);
  }

  @Post("send")
  @Roles("ADMIN")
  sendEmail(
    @Body() dto: SendEmailDto,
    @Request() req: { user: { id: string; name: string; email: string; organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
  ) {
    const orgId = organizationId || req.user.organizationId;
    if (!orgId) throw new Error("Organization ID is required");
    return this.emailService.sendEmail(dto, orgId, req.user);
  }

  @Post("test")
  @Roles("ADMIN")
  sendTestEmail(
    @Body() dto: SendTestEmailDto,
    @Request() req: { user: { id: string; name: string; organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
  ) {
    const orgId = organizationId || req.user.organizationId;
    if (!orgId) throw new Error("Organization ID is required");
    return this.emailService.sendTestEmail(dto, orgId, req.user);
  }

  @Get("logs")
  getLogs(
    @Request() req: { user: { organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
    @Query("candidateId") candidateId?: string,
  ) {
    const orgId = organizationId || req.user.organizationId;
    if (!orgId) return [];
    return this.emailService.getLogs(orgId, candidateId);
  }
}
