import { Inject, Injectable, Optional } from "@nestjs/common";
import crypto from "node:crypto";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import {
  type EmailTemplateType,
  interpolateEmail as interpolate,
} from "@haihire/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { EncryptionService } from "../../common/encryption.service";
import {
  SendSystemEmailDto,
  SendSystemTestEmailDto,
} from "../dto/send-system-email.dto";
import { EmailTransporterFactory } from "../transporters/transporter.factory";
import { toTimestamp, toInstant } from "../../common/date.util";
import { env } from "../../config/env";

export interface GetLogsOptions {
  candidateId?: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

@Injectable()
export class EmailSystemService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(EncryptionService)
    private readonly encryptionService: EncryptionService,
    @Optional()
    @InjectQueue("email-queue")
    private readonly emailQueue?: Queue,
  ) {}

  getSystemEmailConfig() {
    return {
      provider: env.SYSTEM_EMAIL_PROVIDER,
      fromName: env.SYSTEM_EMAIL_FROM_NAME,
      fromEmail: env.SYSTEM_EMAIL_FROM_EMAIL,
      smtpHost: env.SYSTEM_EMAIL_SMTP_HOST || null,
      smtpPort: env.SYSTEM_EMAIL_SMTP_PORT,
      smtpUser: env.SYSTEM_EMAIL_SMTP_USER || null,
      smtpPass: this.encryptionService.mask(env.SYSTEM_EMAIL_SMTP_PASS || null),
      resendApiKey: this.encryptionService.mask(
        env.SYSTEM_EMAIL_RESEND_API_KEY || null,
      ),
      sendgridApiKey: this.encryptionService.mask(
        env.SYSTEM_EMAIL_SENDGRID_API_KEY || null,
      ),
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

  async sendSystemEmail(
    dto: SendSystemEmailDto,
    overrideConfig?: ReturnType<typeof this.getRawSystemEmailConfig>,
  ) {
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
        return this.executeSendSystemEmail(dto, overrideConfig);
      }
    }
    return this.executeSendSystemEmail(dto, overrideConfig);
  }

  async executeSendSystemEmail(
    dto: SendSystemEmailDto,
    overrideConfig?: ReturnType<typeof this.getRawSystemEmailConfig>,
  ) {
    const config = overrideConfig || this.getRawSystemEmailConfig();
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
      updatedAt: toInstant(),
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

    const query = this.prisma.db.orm.public.EmailLog.where((l) =>
      l.scope.eq("SYSTEM"),
    );

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
