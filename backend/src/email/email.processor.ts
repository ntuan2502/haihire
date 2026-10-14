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
  ) {
    super();
  }

  async process(job: Job<SendEmailJobData | SendSystemEmailJobData>): Promise<unknown> {
    this.logger.log(`Processing email job '${job.name}' (ID: ${job.id})`);
    try {
      if (job.name === "send-system-email") {
        const data = job.data as SendSystemEmailJobData;
        return await this.emailService.executeSendSystemEmail(data.dto);
      }
      const data = job.data as SendEmailJobData;
      return await this.emailService.executeSendEmail(
        data.dto,
        data.organizationId,
        data.senderUser,
      );
    } catch (err) {
      this.logger.error(`Failed to process email job ${job.id}:`, err);
      throw err;
    }
  }

  @OnWorkerEvent("failed")
  async onFailed(
    job: Job<SendEmailJobData | SendSystemEmailJobData>,
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
          const dlqMsg = dlqErr instanceof Error ? dlqErr.message : String(dlqErr);
          this.logger.error(`[EmailProcessor] Failed to enqueue to DLQ: ${dlqMsg}`);
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
