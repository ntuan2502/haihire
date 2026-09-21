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
import { env } from "../config/env";
import crypto from "node:crypto";

export type EmailTemplateType =
  | "APPLICATION_CONFIRMATION"
  | "INTERVIEW_INVITATION"
  | "REJECTION"
  | "OFFER"
  | "CUSTOM";

export interface TemplateDefinition {
  type: EmailTemplateType;
  name: string;
  subject: string;
  body: string;
  variables: string[];
}

export const DEFAULT_TEMPLATES: TemplateDefinition[] = [
  {
    type: "APPLICATION_CONFIRMATION",
    name: "Xác nhận nhận hồ sơ",
    subject: "Xác nhận đã nhận hồ sơ ứng tuyển vị trí {{job_title}} - {{company_name}}",
    body: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 16px;">
  <h2 style="color: #0284c7; margin-bottom: 16px;">Xin chào {{candidate_name}},</h2>
  <p>Cảm ơn bạn đã quan tâm và nộp hồ sơ ứng tuyển vào vị trí <strong>{{job_title}}</strong> tại <strong>{{company_name}}</strong>.</p>
  <p>Hồ sơ của bạn đã được chuyển tới bộ phận Tuyển dụng để xem xét và đánh giá mức độ phù hợp với yêu cầu công việc. Chúng tôi sẽ phản hồi lại cho bạn trong vòng 3 - 5 ngày làm việc tới.</p>
  <p>Nếu bạn có bất kỳ câu hỏi nào trong thời gian này, vui lòng phản hồi trực tiếp email này.</p>
  <br/>
  <p>Trân trọng,</p>
  <p><strong>Bộ phận Tuyển dụng {{company_name}}</strong></p>
</div>`,
    variables: ["candidate_name", "job_title", "company_name"],
  },
  {
    type: "INTERVIEW_INVITATION",
    name: "Thư mời phỏng vấn",
    subject: "Thư mời phỏng vấn vị trí {{job_title}} - {{company_name}}",
    body: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 16px;">
  <h2 style="color: #0284c7; margin-bottom: 16px;">Thân gửi {{candidate_name}},</h2>
  <p>Sau khi xem xét hồ sơ ứng tuyển của bạn cho vị trí <strong>{{job_title}}</strong>, <strong>{{company_name}}</strong> rất ấn tượng với kinh nghiệm của bạn và trân trọng mời bạn tham gia buổi phỏng vấn trực tuyến.</p>
  <div style="background-color: #f8fafc; padding: 16px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;">
    <p style="margin: 6px 0;">📅 <strong>Thời gian:</strong> {{interview_time}} ngày {{interview_date}}</p>
    <p style="margin: 6px 0;">🌐 <strong>Hình thức:</strong> {{interview_format}}</p>
    <p style="margin: 6px 0;">🔗 <strong>Đường dẫn tham gia:</strong> <a href="{{interview_link}}" style="color: #0284c7;">{{interview_link}}</a></p>
  </div>
  <p>Vui lòng phản hồi email này để xác nhận sự có mặt của bạn hoặc báo lại nếu bạn cần sắp xếp lại thời gian.</p>
  <br/>
  <p>Chúc bạn có một buổi phỏng vấn thành công!</p>
  <p><strong>{{company_name}} Team</strong></p>
</div>`,
    variables: [
      "candidate_name",
      "job_title",
      "company_name",
      "interview_date",
      "interview_time",
      "interview_format",
      "interview_link",
    ],
  },
  {
    type: "REJECTION",
    name: "Thư từ chối ứng viên",
    subject: "Thông báo kết quả ứng tuyển vị trí {{job_title}} - {{company_name}}",
    body: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 16px;">
  <h2 style="color: #475569; margin-bottom: 16px;">Xin chào {{candidate_name}},</h2>
  <p>Cảm ơn bạn đã dành thời gian và sự quan tâm đến cơ hội nghề nghiệp tại <strong>{{company_name}}</strong> với vị trí <strong>{{job_title}}</strong>.</p>
  <p>Chúng tôi đã nhận được nhiều hồ sơ sáng giá và sau quá trình cân nhắc kỹ lưỡng, chúng tôi rất tiếc phải thông báo hiện tại chưa thể đồng hành cùng bạn ở vị trí này.</p>
  <p>Hồ sơ của bạn sẽ được lưu trữ trong hệ thống nhân tài của chúng tôi để ưu tiên liên hệ cho các cơ hội phù hợp hơn trong tương lai.</p>
  <p>Chúc bạn luôn gặt hái nhiều thành công trên con đường sự nghiệp!</p>
  <br/>
  <p>Trân trọng,</p>
  <p><strong>Đội ngũ Tuyển dụng {{company_name}}</strong></p>
</div>`,
    variables: ["candidate_name", "job_title", "company_name"],
  },
  {
    type: "OFFER",
    name: "Thư mời nhận việc (Offer Letter)",
    subject: "Thư mời nhận việc - {{job_title}} tại {{company_name}}",
    body: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 16px;">
  <h2 style="color: #10b981; margin-bottom: 16px;">Chúc mừng {{candidate_name}}! 🎉</h2>
  <p>Ban Giám đốc <strong>{{company_name}}</strong> vui mừng gửi tới bạn lời mời gia nhập đội ngũ của chúng tôi với vai trò <strong>{{job_title}}</strong>.</p>
  <div style="background-color: #f0fdf4; padding: 16px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0;">
    <p style="margin: 6px 0;">💼 <strong>Vị trí:</strong> {{job_title}}</p>
    <p style="margin: 6px 0;">📅 <strong>Ngày bắt đầu dự kiến:</strong> {{start_date}}</p>
    <p style="margin: 6px 0;">💰 <strong>Mức lương & Đãi ngộ:</strong> {{salary}}</p>
  </div>
  <p>Chi tiết về hợp đồng lao động và quy chế công ty được đính kèm trong thư này. Vui lòng ký xác nhận và phản hồi trước hạn quy định.</p>
  <br/>
  <p>Rất mong sớm được chào đón bạn tại văn phòng!</p>
  <p><strong>Ban Nhân sự {{company_name}}</strong></p>
</div>`,
    variables: ["candidate_name", "job_title", "company_name", "start_date", "salary"],
  },
];

export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, key) => {
    return vars[key] !== undefined ? String(vars[key]) : `{{${key}}}`;
  });
}

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
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      created.push({
        ...item,
        variables: def.variables,
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
      updatedAt: Date;
      subject?: string;
      body?: string;
      enabled?: boolean;
    } = {
      updatedAt: new Date(),
    };
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
        smtpSecure: true,
        resendApiKey: null,
        sendgridApiKey: null,
        createdAt: new Date(),
        updatedAt: new Date(),
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
      updatedAt: Date;
      provider?: string;
      fromName?: string;
      fromEmail?: string;
      smtpHost?: string | null;
      smtpPort?: number | null;
      smtpUser?: string | null;
      smtpPass?: string | null;
      smtpSecure?: boolean;
      resendApiKey?: string | null;
      sendgridApiKey?: string | null;
    }

    const updateData: EmailSettingUpdatePayload = {
      updatedAt: new Date(),
    };
    if (dto.provider !== undefined) updateData.provider = dto.provider;
    if (dto.fromName !== undefined) updateData.fromName = dto.fromName;
    if (dto.fromEmail !== undefined) updateData.fromEmail = dto.fromEmail;
    if (dto.smtpHost !== undefined) updateData.smtpHost = dto.smtpHost;
    if (dto.smtpPort !== undefined) updateData.smtpPort = dto.smtpPort;
    if (dto.smtpUser !== undefined) updateData.smtpUser = dto.smtpUser;
    if (dto.smtpSecure !== undefined) updateData.smtpSecure = dto.smtpSecure;

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
      smtpSecure: settings?.smtpSecure,
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
      sentAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
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
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

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
      smtpSecure: env.SYSTEM_EMAIL_SMTP_SECURE,
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
      smtpSecure: env.SYSTEM_EMAIL_SMTP_SECURE,
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
      sentAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
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

    let query = this.prisma.db.orm.public.EmailLog
      .where((l) => l.scope.eq("SYSTEM"));

    const logs = await query.all();
    let mapped = logs
      .map((l) => ({
        ...l,
        recipientName: l.recipientName || "Recipient",
        recipientEmail: l.recipientEmail || "",
      }))
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

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
