import { PrismaService } from "../prisma/prisma.service";
import { PermissionResolverService } from "../auth/permission-resolver.service";
import {
  resolveNotificationRecipient,
  type NotificationEvent,
} from "../notifications/notification-recipient";
import {
  Processor,
  WorkerHost,
  OnWorkerEvent,
  InjectQueue,
} from "@nestjs/bullmq";
import { Job, Queue } from "bullmq";
import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { EmailService } from "./email.service";
import { WebhookNotifierService } from "../common/webhook/webhook-notifier.service";
import type { SendEmailDto } from "./dto/send-email.dto";
import type { SendSystemEmailDto } from "./dto/send-system-email.dto";

const notificationSubjects = {
  applicationReceived: {
    en: "New application received",
    vi: "Có hồ sơ ứng tuyển mới",
  },
  interviewScheduled: {
    en: "Interview scheduled",
    vi: "Đã lên lịch phỏng vấn",
  },
  interviewChanged: {
    en: "Interview updated",
    vi: "Lịch phỏng vấn đã thay đổi",
  },
  interviewCancelled: {
    en: "Interview cancelled",
    vi: "Lịch phỏng vấn đã hủy",
  },
} as const;

export const EMAIL_QUEUE_NAME = "email-queue";
export const EMAIL_DLQ_NAME = "email-dlq-queue";

export interface SendEmailJobData {
  dto: SendEmailDto;
  organizationId: string;
  senderUser?: { id?: string; name?: string };
  emailId?: string;
}

export interface SendSystemEmailJobData {
  dto: SendSystemEmailDto;
  emailId?: string;
}

@Processor(EMAIL_QUEUE_NAME)
@Injectable()
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    @Inject(EmailService) private readonly emailService: EmailService,
    @Optional()
    @InjectQueue(EMAIL_DLQ_NAME)
    private readonly dlqQueue?: Queue,
    @Optional()
    @Inject(WebhookNotifierService)
    private readonly webhookNotifier?: WebhookNotifierService,
    @Optional()
    @Inject(PrismaService)
    private readonly prisma?: PrismaService,
    @Optional()
    @Inject(PermissionResolverService)
    private readonly permissions?: PermissionResolverService,
  ) {
    super();
  }

  async process(
    job: Job<SendEmailJobData | SendSystemEmailJobData | NotificationEvent>,
  ): Promise<unknown> {
    this.logger.log(`Processing email job '${job.name}' (ID: ${job.id})`);
    try {
      if (job.name === "send-notification-email") {
        return await this.sendNotification(job.data as NotificationEvent);
      }
      if (job.name === "send-system-email") {
        const data = job.data as SendSystemEmailJobData;
        const result = await this.emailService.executeSendSystemEmail(data.dto);
        if (result.status === "FAILED") {
          throw new Error(result.error || "System email delivery failed");
        }
        return result;
      }
      const data = job.data as SendEmailJobData;
      const result = await this.emailService.executeSendEmail(
        data.dto,
        data.organizationId,
        data.senderUser,
      );
      if (result.status === "FAILED") {
        throw new Error(result.errorMessage || "Email delivery failed");
      }
      return result;
    } catch (err) {
      this.logger.error(`Failed to process email job ${job.id}:`, err);
      throw err;
    }
  }

  private async sendNotification(event: NotificationEvent) {
    if (!this.prisma || !this.permissions) {
      throw new Error("Notification delivery services are unavailable");
    }
    const permissions = this.permissions;
    const recipient = await this.prisma.withTenantRls(
      event.organizationId,
      (tx) => resolveNotificationRecipient(tx, permissions, event),
    );
    if (!recipient?.email) return { status: "SKIPPED" };
    const language = recipient.user.preferredLanguage === "vi" ? "vi" : "en";
    const subject = notificationSubjects[event.kind][language];
    const body =
      language === "vi"
        ? "Mở HaiHire để xem thông tin mới trong workspace của bạn."
        : "Open HaiHire to view the latest information in your workspace.";
    const result = await this.emailService.executeSendEmail(
      {
        to: recipient.user.email,
        recipientName: recipient.user.email,
        subject,
        body,
        scope: "SYSTEM",
      } as SendEmailDto,
      event.organizationId,
    );
    if (result.status === "FAILED") {
      throw new Error(
        result.errorMessage || "Notification email delivery failed",
      );
    }
    return result;
  }

  @OnWorkerEvent("failed")
  async onFailed(
    job: Job<SendEmailJobData | SendSystemEmailJobData | NotificationEvent>,
    err: Error,
  ): Promise<void> {
    const maxAttempts = job.opts?.attempts || 3;
    if (job.attemptsMade >= maxAttempts) {
      this.logger.error(
        `[CRITICAL ALERT - DLQ] Email delivery failed permanently for job '${job.id}' (${job.name}) after ${job.attemptsMade} attempts: ${err.message}. Moving to DLQ.`,
      );

      if (this.dlqQueue) {
        try {
          await this.dlqQueue.add("dead-letter-email", {
            originalJob: job.data,
            failedAt: new Date().toISOString(),
            error: err.message,
            totalAttempts: job.attemptsMade,
          });
          this.logger.log(
            `[EmailProcessor] Enqueued job '${job.id}' to Dead-Letter Queue '${EMAIL_DLQ_NAME}'`,
          );
        } catch (dlqErr: unknown) {
          const dlqMsg =
            dlqErr instanceof Error ? dlqErr.message : String(dlqErr);
          this.logger.error(
            `[EmailProcessor] Failed to enqueue to DLQ: ${dlqMsg}`,
          );
        }
      }

      if (this.webhookNotifier) {
        try {
          const jobData = job.data as Partial<
            SendEmailJobData & SendSystemEmailJobData & { emailId?: string }
          >;
          const objectName =
            jobData?.emailId ||
            jobData?.dto?.to ||
            (job.id ? String(job.id) : "unknown");
          const organizationId =
            jobData?.organizationId ||
            jobData?.dto?.organizationId ||
            undefined;

          await this.webhookNotifier.notifyDlq(
            {
              queue: EMAIL_DLQ_NAME,
              jobName: job.name,
              objectName,
              reason: "email-queue-terminal-failure",
              attemptsMade: job.attemptsMade,
              errorMessage: err.message,
              timestamp: new Date().toISOString(),
            },
            organizationId,
          );
        } catch (notifierErr: unknown) {
          const notifierMsg =
            notifierErr instanceof Error
              ? notifierErr.message
              : String(notifierErr);
          this.logger.error(
            `[EmailProcessor] Failed to dispatch DLQ webhook alert: ${notifierMsg}`,
          );
        }
      }
    }
  }
}
