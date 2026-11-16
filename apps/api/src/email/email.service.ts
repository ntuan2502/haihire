import { Inject, Injectable, Optional } from "@nestjs/common";
import { CreateEmailTemplateDto } from "./dto/create-template.dto";
import {
  DuplicateEmailTemplateDto,
  UpdateEmailTemplateDto,
} from "./dto/update-template.dto";
import { UpdateEmailFlowDto } from "./dto/update-flow.dto";
import { UpdateEmailSettingDto } from "./dto/update-setting.dto";
import { SendEmailDto, SendTestEmailDto } from "./dto/send-email.dto";
import {
  SendSystemEmailDto,
  SendSystemTestEmailDto,
} from "./dto/send-system-email.dto";
import {
  EmailDispatchService,
  EmailTemplatesService,
  EmailFlowsService,
  EmailSettingsService,
  EmailSystemService,
  type EnrichedEmailTemplate,
  type EnrichedEmailFlowConfig,
  type GetLogsOptions,
} from "./services";
import {
  type EmailTemplateType,
  type EmailFlowKey,
  type TemplateDefinition,
  DEFAULT_TEMPLATES,
  EMAIL_FLOW_DEFINITIONS,
  interpolateEmail as interpolate,
} from "@haihire/shared";

export {
  type EmailTemplateType,
  type EmailFlowKey,
  type TemplateDefinition,
  DEFAULT_TEMPLATES,
  interpolate,
};

export type { GetLogsOptions, EnrichedEmailTemplate, EnrichedEmailFlowConfig };

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
    @Optional()
    @Inject(EmailFlowsService)
    private readonly flows?: EmailFlowsService,
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

  async getTemplateById(
    organizationId: string,
    id: string,
  ): Promise<EnrichedEmailTemplate | undefined> {
    return this.templates.getTemplateById(organizationId, id);
  }

  async getTemplateByType(
    organizationId: string,
    type: string,
  ): Promise<EnrichedEmailTemplate | undefined> {
    return this.templates.getTemplateByType(organizationId, type);
  }

  async createTemplate(
    organizationId: string | undefined,
    dto: CreateEmailTemplateDto,
    userOrgId?: string | null,
  ): Promise<EnrichedEmailTemplate> {
    return this.templates.createTemplate(organizationId, dto, userOrgId);
  }

  async updateTemplate(
    organizationId: string | undefined,
    idOrType: string,
    dto: UpdateEmailTemplateDto,
    userOrgId?: string | null,
  ): Promise<EnrichedEmailTemplate> {
    return this.templates.updateTemplate(
      organizationId,
      idOrType,
      dto,
      userOrgId,
    );
  }

  async duplicateTemplate(
    organizationId: string | undefined,
    id: string,
    dto?: DuplicateEmailTemplateDto,
    userOrgId?: string | null,
  ): Promise<EnrichedEmailTemplate> {
    return this.templates.duplicateTemplate(organizationId, id, dto, userOrgId);
  }

  async deleteTemplate(
    organizationId: string | undefined,
    id: string,
    userOrgId?: string | null,
  ): Promise<{ deleted: true; id: string }> {
    return this.templates.deleteTemplate(organizationId, id, userOrgId);
  }

  async getFlows(
    organizationId?: string,
    userOrgId?: string | null,
  ): Promise<EnrichedEmailFlowConfig[]> {
    if (!this.flows) {
      return [];
    }
    return this.flows.getFlows(organizationId, userOrgId);
  }

  async updateFlow(
    organizationId: string | undefined,
    flowKey: string,
    dto: UpdateEmailFlowDto,
    userOrgId?: string | null,
  ): Promise<EnrichedEmailFlowConfig> {
    if (!this.flows) {
      throw new Error("EmailFlowsService is not initialized");
    }
    return this.flows.updateFlow(organizationId, flowKey, dto, userOrgId);
  }

  async resolveFlowTemplate(
    organizationId: string,
    flowKey: EmailFlowKey,
    overrideTemplateId?: string,
  ): Promise<EnrichedEmailTemplate | undefined> {
    if (this.flows) {
      return this.flows.resolveFlowTemplate(
        organizationId,
        flowKey,
        overrideTemplateId,
      );
    }

    const trimmedOverride = overrideTemplateId?.trim();
    if (trimmedOverride) {
      const override = await this.templates.getTemplateById(
        organizationId,
        trimmedOverride,
      );
      return override && override.enabled ? override : undefined;
    }

    const defaultType = EMAIL_FLOW_DEFINITIONS[flowKey].defaultTemplateType;
    const fallback = await this.templates.getTemplateByType(
      organizationId,
      defaultType,
    );
    return fallback && fallback.enabled ? fallback : undefined;
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
