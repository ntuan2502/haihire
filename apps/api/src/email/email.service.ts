import { Inject, Injectable } from "@nestjs/common";
import { UpdateEmailTemplateDto } from "./dto/update-template.dto";
import { UpdateEmailSettingDto } from "./dto/update-setting.dto";
import { SendEmailDto, SendTestEmailDto } from "./dto/send-email.dto";
import {
  SendSystemEmailDto,
  SendSystemTestEmailDto,
} from "./dto/send-system-email.dto";
import {
  EmailDispatchService,
  EmailTemplatesService,
  EmailSettingsService,
  EmailSystemService,
  type EnrichedEmailTemplate,
  type GetLogsOptions,
} from "./services";
import {
  type EmailTemplateType,
  type TemplateDefinition,
  DEFAULT_TEMPLATES,
  interpolateEmail as interpolate,
} from "@haihire/shared";

export {
  type EmailTemplateType,
  type TemplateDefinition,
  DEFAULT_TEMPLATES,
  interpolate,
};

export type { GetLogsOptions, EnrichedEmailTemplate };

@Injectable()
export class EmailService {
  constructor(
    @Inject(EmailDispatchService)
    private readonly dispatch: EmailDispatchService,
    @Inject(EmailTemplatesService)
    private readonly templates: EmailTemplatesService,
    @Inject(EmailSettingsService)
    private readonly settings: EmailSettingsService,
    @Inject(EmailSystemService)
    private readonly system: EmailSystemService,
  ) {}

  resolveOrgId(
    userOrgId?: string | null,
    requestedOrgId?: string,
    required = true,
  ): string | undefined {
    return this.settings.resolveOrgId(userOrgId, requestedOrgId, required);
  }

  async getTemplates(
    organizationId?: string,
    userOrgId?: string | null,
  ): Promise<EnrichedEmailTemplate[]> {
    return this.templates.getTemplates(organizationId, userOrgId);
  }

  async seedDefaultTemplates(
    organizationId: string,
  ): Promise<EnrichedEmailTemplate[]> {
    return this.templates.seedDefaultTemplates(organizationId);
  }

  async getTemplateByType(
    organizationId: string,
    type: string,
  ): Promise<EnrichedEmailTemplate | undefined> {
    return this.templates.getTemplateByType(organizationId, type);
  }

  async updateTemplate(
    organizationId: string | undefined,
    type: string,
    dto: UpdateEmailTemplateDto,
    userOrgId?: string | null,
  ) {
    return this.templates.updateTemplate(organizationId, type, dto, userOrgId);
  }

  async getSettings(organizationId?: string, userOrgId?: string | null) {
    return this.settings.getSettings(organizationId, userOrgId);
  }

  async getRawSettings(organizationId: string) {
    return this.settings.getRawSettings(organizationId);
  }

  async updateSettings(
    organizationId: string | undefined,
    dto: UpdateEmailSettingDto,
    userOrgId?: string | null,
  ) {
    return this.settings.updateSettings(organizationId, dto, userOrgId);
  }

  async sendEmail(
    dto: SendEmailDto,
    organizationId?: string,
    senderUser?: { id?: string; name?: string; email?: string },
    userOrgId?: string | null,
  ) {
    return this.dispatch.sendEmail(dto, organizationId, senderUser, userOrgId);
  }

  async queueEmail(
    dto: SendEmailDto,
    organizationId: string,
    senderUser?: { id?: string; name?: string; email?: string },
  ) {
    return this.dispatch.queueEmail(dto, organizationId, senderUser);
  }

  async executeSendEmail(
    dto: SendEmailDto,
    organizationId: string,
    senderUser?: { id?: string; name?: string; email?: string },
  ) {
    return this.dispatch.executeSendEmail(dto, organizationId, senderUser);
  }

  async sendTestEmail(
    dto: SendTestEmailDto,
    organizationId?: string,
    senderUser?: { id?: string; name?: string },
    userOrgId?: string | null,
  ) {
    return this.dispatch.sendTestEmail(
      dto,
      organizationId,
      senderUser,
      userOrgId,
    );
  }

  async getLogs(
    organizationId?: string,
    options?: GetLogsOptions,
    userOrgId?: string | null,
  ) {
    return this.dispatch.getLogs(organizationId, options, userOrgId);
  }

  getSystemEmailConfig() {
    return this.system.getSystemEmailConfig();
  }

  getRawSystemEmailConfig() {
    return this.system.getRawSystemEmailConfig();
  }

  async sendSystemEmail(dto: SendSystemEmailDto) {
    return this.system.sendSystemEmail(dto, this.getRawSystemEmailConfig());
  }

  async executeSendSystemEmail(dto: SendSystemEmailDto) {
    return this.system.executeSendSystemEmail(
      dto,
      this.getRawSystemEmailConfig(),
    );
  }

  async sendSystemTestEmail(dto: SendSystemTestEmailDto) {
    const config = this.getSystemEmailConfig();
    return this.sendSystemEmail({
      to: dto.to,
      recipientName: "System Administrator",
      subject: `[System Test] Kiểm tra kết nối gửi Email Hệ thống - ${config.fromName}`,
      body: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
  <h2 style="color: #0284c7;">Kiểm tra cấu hình System Email thành công! 🚀</h2>
  <p>Email này được gửi từ cấp độ toàn hệ thống (System Level) để xác thực cấu hình môi trường .env.</p>
  <p><strong>Cấu hình hiện tại (.env):</strong></p>
  <ul>
    <li><strong>Provider:</strong> ${config.provider}</li>
    <li><strong>From Name:</strong> ${config.fromName}</li>
    <li><strong>From Email:</strong> ${config.fromEmail}</li>
  </ul>
</div>`,
    });
  }

  async getSystemLogs(options?: GetLogsOptions) {
    return this.system.getSystemLogs(options);
  }
}
