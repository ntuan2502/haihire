import { Inject, Injectable, Optional } from "@nestjs/common";
import crypto from "node:crypto";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import {
  type EmailTemplateType,
  interpolateEmail as interpolate,
} from "@haihire/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { ActivitiesService } from "../../activities/activities.service";
import { EmailSettingsService } from "./email-settings.service";
import { SendEmailDto, SendTestEmailDto } from "../dto/send-email.dto";
import { EmailTransporterFactory } from "../transporters/transporter.factory";
import { toTimestamp, toInstant } from "../../common/date.util";
import type { GetLogsOptions } from "./email-system.service";

@Injectable()
export class EmailDispatchService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ActivitiesService)
    private readonly activitiesService: ActivitiesService,
    @Inject(EmailSettingsService)
    private readonly settingsService: EmailSettingsService,
    @Optional()
    @InjectQueue("email-queue")
    private readonly emailQueue?: Queue,
  ) {}

  async sendEmail(
    dto: SendEmailDto,
    organizationId?: string,
    senderUser?: { id?: string; name?: string; email?: string },
    userOrgId?: string | null,
  ) {
    const targetOrgId = this.settingsService.resolveOrgId(
      userOrgId,
      organizationId,
      true,
    )!;
    if (this.emailQueue) {
      try {
        const candidateKey = dto.candidateId || dto.to.toLowerCase();
        const appKey = dto.applicationId || "general";
        const templateKey = dto.templateType || "custom";
        const timeBucket = Math.floor(Date.now() / (5 * 60 * 1000));
        const deterministicJobId = `email:${targetOrgId}:${templateKey}:${candidateKey}:${appKey}:${timeBucket}`;

        const job = await this.emailQueue.add(
          "send-email",
          { dto, organizationId: targetOrgId, senderUser },
          {
            jobId: deterministicJobId,
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
        return this.executeSendEmail(dto, targetOrgId, senderUser);
      }
    }
    return this.executeSendEmail(dto, targetOrgId, senderUser);
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
    const settings = await this.settingsService.getRawSettings(organizationId);

    const variables = dto.variables || {};
    const renderedSubject = interpolate(dto.subject, variables);
    const renderedBody = interpolate(dto.body, variables);

    const fromName =
      senderUser?.name || settings?.fromName || "Recruitment Team";
    const fromEmail =
      settings?.fromEmail || senderUser?.email || "careers@workspace.com";

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
      updatedAt: toInstant(),
    });

    // Record candidate activity timeline event
    if (dto.candidateId) {
      await this.activitiesService.createActivity({
        organizationId,
        candidateId: dto.candidateId,
        applicationId: dto.applicationId || null,
        type: "EMAIL_SENT",
        title: `Email Sent: ${renderedSubject}`,
        description: `Sent to ${dto.recipientName} (${dto.to}) - Status: ${sendResult.status}`,
        actorId: senderUser?.id || null,
        actorName: senderUser?.name || settings?.fromName || "Recruiting Team",
        actorRole: "ADMIN",
        metadata: {
          emailLogId: logId,
          templateType: dto.templateType || "CUSTOM",
          subject: renderedSubject,
          status: sendResult.status,
          recipientEmail: dto.to,
          recipientName: dto.recipientName,
        },
      });
    }

    return log;
  }

  async sendTestEmail(
    dto: SendTestEmailDto,
    organizationId?: string,
    senderUser?: { id?: string; name?: string },
    userOrgId?: string | null,
  ) {
    const targetOrgId = this.settingsService.resolveOrgId(
      userOrgId,
      organizationId,
      true,
    )!;
    const settings = await this.settingsService.getRawSettings(targetOrgId);
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
      targetOrgId,
      senderUser,
    );
  }

  async getLogs(
    organizationId?: string,
    options?: GetLogsOptions,
    userOrgId?: string | null,
  ) {
    const targetOrgId = this.settingsService.resolveOrgId(
      userOrgId,
      organizationId,
      false,
    );
    if (!targetOrgId) {
      return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    }

    const opts = options || {};

    let query = this.prisma.db.orm.public.EmailLog.where((l) =>
      l.organizationId.eq(targetOrgId),
    );

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
}
