import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { ActivitiesService } from "../activities/activities.service";
import { EncryptionService } from "../common/encryption.service";
import { UpdateEmailTemplateDto } from "./dto/update-template.dto";
import { UpdateEmailSettingDto } from "./dto/update-setting.dto";
import { SendEmailDto, SendTestEmailDto } from "./dto/send-email.dto";
import { SendSystemEmailDto, SendSystemTestEmailDto } from "./dto/send-system-email.dto";
import { EmailTransporterFactory } from "./transporters/transporter.factory";
import { toTimestamp } from "../common/date.util";
import { env } from "../config/env";
import crypto from "node:crypto";

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

export interface GetLogsOptions {
  candidateId?: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface EnrichedEmailTemplate {
  id: string;
  organizationId: string;
  type: EmailTemplateType;
  name: string;
  subject: string;
  body: string;
  enabled: boolean;
  variables: string[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class EmailService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ActivitiesService)
    private readonly activitiesService: ActivitiesService,
    @Inject(EncryptionService)
    private readonly encryptionService: EncryptionService,
    @Optional()
    @InjectQueue("email-queue")
    private readonly emailQueue?: Queue,
  ) {}

  async getTemplates(organizationId: string): Promise<EnrichedEmailTemplate[]> {
    if (!organizationId) {
      return [];
    }

    const templates = await this.prisma.db.orm.public.EmailTemplate
      .where((t) => t.organizationId.eq(organizationId))
      .all();

    if (templates.length === 0) {
      return this.seedDefaultTemplates(organizationId);
    }

    return templates.map((t) => ({
      ...t,
      variables: t.variables ? (JSON.parse(t.variables) as string[]) : [],
      createdAt: new Date(toTimestamp(t.createdAt)),
      updatedAt: new Date(toTimestamp(t.updatedAt)),
    }));
  }

  async seedDefaultTemplates(organizationId: string): Promise<EnrichedEmailTemplate[]> {
    const created: EnrichedEmailTemplate[] = [];
    for (const def of DEFAULT_TEMPLATES) {
      const item = await this.prisma.db.orm.public.EmailTemplate.create({
        id: crypto.randomUUID(),
        organizationId,
        type: def.type,
        name: def.name,
        subject: def.subject,
        body: def.body,
        enabled: true,
        variables: JSON.stringify(def.variables),
      });
      created.push({
        ...item,
        variables: def.variables,
        createdAt: new Date(toTimestamp(item.createdAt)),
        updatedAt: new Date(toTimestamp(item.updatedAt)),
      });
    }
    return created;
  }

  async getTemplateByType(organizationId: string, type: string): Promise<EnrichedEmailTemplate | undefined> {
    const templates = await this.getTemplates(organizationId);
    return templates.find((t) => t.type === type);
  }

  async updateTemplate(organizationId: string, type: string, dto: UpdateEmailTemplateDto) {
    const existing = await this.prisma.db.orm.public.EmailTemplate
      .where((t) => t.organizationId.eq(organizationId))
      .where((t) => t.type.eq(type as EmailTemplateType))
      .first();

    if (!existing) {
      await this.seedDefaultTemplates(organizationId);
    }

    const current = await this.prisma.db.orm.public.EmailTemplate
      .where((t) => t.organizationId.eq(organizationId))
      .where((t) => t.type.eq(type as EmailTemplateType))
      .first();

    if (!current) {
      throw new NotFoundException(`Template ${type} not found`);
    }

    const updateData: {
      subject?: string;
      body?: string;
      enabled?: boolean;
    } = {};
    if (dto.subject !== undefined) updateData.subject = dto.subject;
    if (dto.body !== undefined) updateData.body = dto.body;
    if (dto.enabled !== undefined) updateData.enabled = dto.enabled;

    await this.prisma.db.orm.public.EmailTemplate
      .where((t) => t.id.eq(current.id))
      .update(updateData);

    const updated = await this.prisma.db.orm.public.EmailTemplate
      .where((t) => t.id.eq(current.id))
      .first();

    return {
      ...updated,
      variables: updated?.variables ? (JSON.parse(updated.variables) as string[]) : [],
      createdAt: updated?.createdAt ? new Date(toTimestamp(updated.createdAt)) : new Date(),
      updatedAt: updated?.updatedAt ? new Date(toTimestamp(updated.updatedAt)) : new Date(),
    };
  }

  async getSettings(organizationId: string) {
    if (!organizationId) {
      return null;
    }

    let settings = await this.prisma.db.orm.public.EmailSetting
      .where((s) => s.organizationId.eq(organizationId))
      .first();

    if (!settings) {
      settings = await this.prisma.db.orm.public.EmailSetting.create({
        id: crypto.randomUUID(),
        organizationId,
        provider: "SIMULATED",
        fromName: "Recruitment Team",
        fromEmail: "careers@workspace.com",
        smtpHost: null,
        smtpPort: null,
        smtpUser: null,
        smtpPass: null,
        resendApiKey: null,
        sendgridApiKey: null,
      });
    }

    return {
      ...settings,
      smtpPass: this.encryptionService.mask(settings.smtpPass),
      resendApiKey: this.encryptionService.mask(settings.resendApiKey),
      sendgridApiKey: this.encryptionService.mask(settings.sendgridApiKey),
    };
  }

  async getRawSettings(organizationId: string) {
    if (!organizationId) {
      return null;
    }

    const settings = await this.prisma.db.orm.public.EmailSetting
      .where((s) => s.organizationId.eq(organizationId))
      .first();

    if (!settings) {
      return this.getSettings(organizationId);
    }

    return {
      ...settings,
      smtpPass: this.encryptionService.decrypt(settings.smtpPass),
      resendApiKey: this.encryptionService.decrypt(settings.resendApiKey),
      sendgridApiKey: this.encryptionService.decrypt(settings.sendgridApiKey),
    };
  }

  async updateSettings(organizationId: string, dto: UpdateEmailSettingDto) {
    const rawCurrent = await this.prisma.db.orm.public.EmailSetting
      .where((s) => s.organizationId.eq(organizationId))
      .first();

    const currentId = rawCurrent?.id || (await this.getSettings(organizationId))?.id;

    if (!currentId) {
      throw new NotFoundException("Email settings not found");
    }

    interface EmailSettingUpdatePayload {
      provider?: string;
      fromName?: string;
      fromEmail?: string;
      smtpHost?: string | null;
      smtpPort?: number | null;
      smtpUser?: string | null;
      smtpPass?: string | null;
      resendApiKey?: string | null;
      sendgridApiKey?: string | null;
    }

    const updateData: EmailSettingUpdatePayload = {};
    if (dto.provider !== undefined) updateData.provider = dto.provider;
    if (dto.fromName !== undefined) updateData.fromName = dto.fromName;
    if (dto.fromEmail !== undefined) updateData.fromEmail = dto.fromEmail;
    if (dto.smtpHost !== undefined) updateData.smtpHost = dto.smtpHost;
    if (dto.smtpPort !== undefined) updateData.smtpPort = dto.smtpPort;
    if (dto.smtpUser !== undefined) updateData.smtpUser = dto.smtpUser;

    // Credentials handling with AES-256-GCM encryption
    if (dto.smtpPass !== undefined) {
      if (dto.smtpPass && !dto.smtpPass.startsWith("•")) {
        updateData.smtpPass = this.encryptionService.encrypt(dto.smtpPass);
      } else if (!dto.smtpPass) {
        updateData.smtpPass = null;
      }
    }
    if (dto.resendApiKey !== undefined) {
      if (dto.resendApiKey && !dto.resendApiKey.startsWith("•")) {
        updateData.resendApiKey = this.encryptionService.encrypt(dto.resendApiKey);
      } else if (!dto.resendApiKey) {
        updateData.resendApiKey = null;
      }
    }
    if (dto.sendgridApiKey !== undefined) {
      if (dto.sendgridApiKey && !dto.sendgridApiKey.startsWith("•")) {
        updateData.sendgridApiKey = this.encryptionService.encrypt(dto.sendgridApiKey);
      } else if (!dto.sendgridApiKey) {
        updateData.sendgridApiKey = null;
      }
    }

    await this.prisma.db.orm.public.EmailSetting
      .where((s) => s.id.eq(currentId))
      .update(updateData);

    return this.getSettings(organizationId);
  }

  async sendEmail(
    dto: SendEmailDto,
    organizationId: string,
    senderUser?: { id?: string; name?: string; email?: string },
  ) {
    if (this.emailQueue) {
      try {
        const job = await this.emailQueue.add(
          "send-email",
          { dto, organizationId, senderUser },
          {
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 1000,
            },
            removeOnComplete: true,
          },
        );
        return {
          id: job.id,
          status: "QUEUED",
          message: "Email queued for delivery",
        };
      } catch (_queueErr) {
        // Fallback gracefully to synchronous delivery if queue dispatch fails
        return this.executeSendEmail(dto, organizationId, senderUser);
      }
    }
    return this.executeSendEmail(dto, organizationId, senderUser);
  }

  async queueEmail(
    dto: SendEmailDto,
    organizationId: string,
    senderUser?: { id?: string; name?: string; email?: string },
  ) {
    return this.sendEmail(dto, organizationId, senderUser);
  }

  async executeSendEmail(
    dto: SendEmailDto,
    organizationId: string,
    senderUser?: { id?: string; name?: string; email?: string },
  ) {
    const settings = await this.getRawSettings(organizationId);

    const variables = dto.variables || {};
    const renderedSubject = interpolate(dto.subject, variables);
    const renderedBody = interpolate(dto.body, variables);

    const fromName = senderUser?.name || settings?.fromName || "Recruitment Team";
    const fromEmail = settings?.fromEmail || senderUser?.email || "careers@workspace.com";

    const transporter = EmailTransporterFactory.create({
      provider: settings?.provider || "SIMULATED",
      fromName,
      fromEmail,
      smtpHost: settings?.smtpHost,
      smtpPort: settings?.smtpPort,
      smtpUser: settings?.smtpUser,
      smtpPass: settings?.smtpPass,
      resendApiKey: settings?.resendApiKey,
      sendgridApiKey: settings?.sendgridApiKey,
    });

    const sendResult = await transporter.send({
      from: `${fromName} <${fromEmail}>`,
      to: dto.to,
      subject: renderedSubject,
      html: renderedBody,
    });

    const logId = crypto.randomUUID();
    const log = await this.prisma.db.orm.public.EmailLog.create({
      id: logId,
      scope: "ORGANIZATION",
      organizationId,
      candidateId: dto.candidateId || null,
      applicationId: dto.applicationId || null,
      senderId: senderUser?.id || null,
      senderName: fromName,
      senderEmail: fromEmail,
      recipientEmail: dto.to,
      recipientName: dto.recipientName,
      templateType: (dto.templateType as EmailTemplateType) || "CUSTOM",
      subject: renderedSubject,
      body: renderedBody,
      status: sendResult.status,
      errorMessage: sendResult.error || null,
    });

    // Record candidate activity timeline event
    if (dto.candidateId) {
      await this.activitiesService.createActivity({
        organizationId,
        candidateId: dto.candidateId,
        applicationId: dto.applicationId || null,
        type: "EMAIL_SENT",
        title: `Đã gửi email: ${renderedSubject}`,
        description: `Gửi thư tới ${dto.recipientName} (${dto.to}) - Trạng thái: ${sendResult.status}`,
        actorId: senderUser?.id || null,
        actorName: senderUser?.name || settings?.fromName || "Hệ thống Tuyển dụng",
        actorRole: "ADMIN",
        metadata: {
          emailLogId: logId,
          templateType: dto.templateType || "CUSTOM",
          subject: renderedSubject,
          status: sendResult.status,
          recipientEmail: dto.to,
        },
      });
    }

    return log;
  }

  async sendTestEmail(dto: SendTestEmailDto, organizationId: string, senderUser?: { id?: string; name?: string }) {
    const settings = await this.getRawSettings(organizationId);
    return this.sendEmail(
      {
        to: dto.to,
        recipientName: "Test Recipient",
        subject: `[Test] Kiểm tra kết nối gửi email - ${settings?.fromName || "ATS"}`,
        body: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
  <h2 style="color: #0284c7;">Kiểm tra cấu hình Email thành công! ✅</h2>
  <p>Email này được gửi từ hệ thống ATS để xác thực cấu hình gửi thư của bạn.</p>
  <p><strong>Cấu hình hiện tại:</strong></p>
  <ul>
    <li>Provider: ${settings?.provider || "SIMULATED"}</li>
    <li>From Name: ${settings?.fromName || "Recruitment Team"}</li>
    <li>From Email: ${settings?.fromEmail || "careers@workspace.com"}</li>
  </ul>
</div>`,
        templateType: "CUSTOM",
      },
      organizationId,
      senderUser,
    );
  }

  async getLogs(organizationId: string, options?: GetLogsOptions) {
    if (!organizationId) {
      return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    }

    const opts = options || {};

    let query = this.prisma.db.orm.public.EmailLog
      .where((l) => l.organizationId.eq(organizationId));

    if (opts.candidateId) {
      query = query.where((l) => l.candidateId.eq(opts.candidateId!));
    }

    const logs = await query.all();
    let mapped = logs
      .map((l) => ({
        ...l,
        candidateName: l.recipientName || "Ứng viên",
        candidateEmail: l.recipientEmail || "",
      }))
      .sort((a, b) => toTimestamp(b.sentAt) - toTimestamp(a.sentAt));

    if (opts.status && opts.status !== "ALL") {
      mapped = mapped.filter((l) => l.status === opts.status);
    }

    if (opts.search && opts.search.trim() !== "") {
      const s = opts.search.trim().toLowerCase();
      mapped = mapped.filter(
        (l) =>
          (l.candidateName || "").toLowerCase().includes(s) ||
          (l.candidateEmail || "").toLowerCase().includes(s) ||
          (l.subject || "").toLowerCase().includes(s),
      );
    }

    const total = mapped.length;
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const limit = opts.limit && opts.limit > 0 ? opts.limit : 20;
    const totalPages = Math.ceil(total / limit) || 1;

    const data = mapped.slice((page - 1) * limit, page * limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  getSystemEmailConfig() {
    return {
      provider: env.SYSTEM_EMAIL_PROVIDER,
      fromName: env.SYSTEM_EMAIL_FROM_NAME,
      fromEmail: env.SYSTEM_EMAIL_FROM_EMAIL,
      smtpHost: env.SYSTEM_EMAIL_SMTP_HOST || null,
      smtpPort: env.SYSTEM_EMAIL_SMTP_PORT,
      smtpUser: env.SYSTEM_EMAIL_SMTP_USER || null,
      smtpPass: this.encryptionService.mask(env.SYSTEM_EMAIL_SMTP_PASS || null),
      resendApiKey: this.encryptionService.mask(env.SYSTEM_EMAIL_RESEND_API_KEY || null),
      sendgridApiKey: this.encryptionService.mask(env.SYSTEM_EMAIL_SENDGRID_API_KEY || null),
    };
  }

  getRawSystemEmailConfig() {
    return {
      provider: env.SYSTEM_EMAIL_PROVIDER,
      fromName: env.SYSTEM_EMAIL_FROM_NAME,
      fromEmail: env.SYSTEM_EMAIL_FROM_EMAIL,
      smtpHost: env.SYSTEM_EMAIL_SMTP_HOST || null,
      smtpPort: env.SYSTEM_EMAIL_SMTP_PORT,
      smtpUser: env.SYSTEM_EMAIL_SMTP_USER || null,
      smtpPass: env.SYSTEM_EMAIL_SMTP_PASS || null,
      resendApiKey: env.SYSTEM_EMAIL_RESEND_API_KEY || null,
      sendgridApiKey: env.SYSTEM_EMAIL_SENDGRID_API_KEY || null,
    };
  }

  async sendSystemEmail(dto: SendSystemEmailDto) {
    if (this.emailQueue) {
      try {
        const job = await this.emailQueue.add(
          "send-system-email",
          { dto },
          {
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 1000,
            },
            removeOnComplete: true,
          },
        );
        return {
          id: job.id,
          status: "QUEUED",
          message: "System email queued for delivery",
        };
      } catch (_queueErr) {
        return this.executeSendSystemEmail(dto);
      }
    }
    return this.executeSendSystemEmail(dto);
  }

  async executeSendSystemEmail(dto: SendSystemEmailDto) {
    const config = this.getRawSystemEmailConfig();
    const variables = dto.variables || {};
    const renderedSubject = interpolate(dto.subject, variables);
    const renderedBody = interpolate(dto.body, variables);

    const transporter = EmailTransporterFactory.create(config);

    const sendResult = await transporter.send({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: dto.to,
      subject: renderedSubject,
      html: renderedBody,
    });

    const logId = crypto.randomUUID();
    const log = await this.prisma.db.orm.public.EmailLog.create({
      id: logId,
      scope: "SYSTEM",
      organizationId: dto.organizationId || null,
      candidateId: null,
      applicationId: null,
      senderId: null,
      senderName: config.fromName,
      senderEmail: config.fromEmail,
      recipientEmail: dto.to,
      recipientName: dto.recipientName || dto.to,
      templateType: (dto.templateType as EmailTemplateType) || "CUSTOM",
      subject: renderedSubject,
      body: renderedBody,
      status: sendResult.status,
      errorMessage: sendResult.error || null,
    });

    return {
      success: sendResult.success,
      status: sendResult.status,
      provider: config.provider,
      to: dto.to,
      from: `${config.fromName} <${config.fromEmail}>`,
      subject: renderedSubject,
      logId: log?.id || null,
      error: sendResult.error,
    };
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
    const opts = options || {};

    const query = this.prisma.db.orm.public.EmailLog
      .where((l) => l.scope.eq("SYSTEM"));

    const logs = await query.all();
    let mapped = logs
      .map((l) => ({
        ...l,
        recipientName: l.recipientName || "Recipient",
        recipientEmail: l.recipientEmail || "",
      }))
      .sort((a, b) => toTimestamp(b.sentAt) - toTimestamp(a.sentAt));

    if (opts.status && opts.status !== "ALL") {
      mapped = mapped.filter((l) => l.status === opts.status);
    }

    if (opts.search && opts.search.trim() !== "") {
      const s = opts.search.trim().toLowerCase();
      mapped = mapped.filter(
        (l) =>
          (l.recipientName || "").toLowerCase().includes(s) ||
          (l.recipientEmail || "").toLowerCase().includes(s) ||
          (l.subject || "").toLowerCase().includes(s),
      );
    }

    const total = mapped.length;
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const limit = opts.limit && opts.limit > 0 ? opts.limit : 20;
    const totalPages = Math.ceil(total / limit) || 1;

    const data = mapped.slice((page - 1) * limit, page * limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }
}
