import { queryEmailLogs } from "./email-log-query";
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
import { toInstant } from "../../common/date.util";
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
      await this.settingsService.requireDeliverySettings(targetOrgId);
      try {
        const candidateKey = dto.candidateId || dto.to.toLowerCase();
        const appKey = dto.applicationId || "general";
        const templateKey = dto.templateType || "custom";
        const timeBucket = Math.floor(Date.now() / (5 * 60 * 1000));
        const deterministicJobId = `email-${crypto
          .createHash("sha256")
          .update(
            JSON.stringify([
              targetOrgId,
              templateKey,
              candidateKey,
              appKey,
              timeBucket,
            ]),
          )
          .digest("hex")}`;

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
    const settings =
      await this.settingsService.requireDeliverySettings(organizationId);

    const variables = dto.variables || {};
    const renderedSubject = interpolate(dto.subject, variables);
    const renderedBody = interpolate(dto.body, variables);

    const fromName = senderUser?.name || settings.fromName;
    const fromEmail = settings.fromEmail;

    const transporter = EmailTransporterFactory.create({
      provider: settings.provider,
      fromName,
      fromEmail,
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort,
      smtpUser: settings.smtpUser,
      smtpPass: settings.smtpPass,
      resendApiKey: settings.resendApiKey,
      sendgridApiKey: settings.sendgridApiKey,
    });

    const sendResult = await transporter.send({
      from: `${fromName} <${fromEmail}>`,
      to: dto.to,
      subject: renderedSubject,
      html: renderedBody,
    });

    const logId = crypto.randomUUID();
    const log = await this.prisma.emailLog.create({
      data: {
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
      },
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
        actorName: fromName,
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
    const settings =
      await this.settingsService.requireDeliverySettings(targetOrgId);
    return this.sendEmail(
      {
        to: dto.to,
        recipientName: "Test Recipient",
        subject: `[Test] Kiểm tra kết nối gửi email - ${settings.fromName}`,
        body: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
  <h2 style="color: #0284c7;">Kiểm tra cấu hình Email thành công! ✅</h2>
  <p>Email này được gửi từ hệ thống ATS để xác thực cấu hình gửi thư của bạn.</p>
  <p><strong>Cấu hình hiện tại:</strong></p>
  <ul>
    <li>Provider: ${settings.provider}</li>
    <li>From Name: ${settings.fromName}</li>
    <li>From Email: ${settings.fromEmail}</li>
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

    const result = await queryEmailLogs(
      this.prisma,
      { organizationId: targetOrgId, scope: "ORGANIZATION" },
      options,
    );
    return {
      ...result,
      data: result.data.map((l) => ({
        ...l,
        candidateName: l.recipientName || "Ứng viên",
        candidateEmail: l.recipientEmail || "",
      })),
    };
  }
}
