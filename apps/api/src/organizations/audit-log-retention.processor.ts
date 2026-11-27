import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from "@nestjs/bullmq";
import {
  Inject,
  Injectable,
  Logger,
  Optional,
  type OnModuleInit,
} from "@nestjs/common";
import type { Job, Queue } from "bullmq";
import { WebhookNotifierService } from "../common/webhook/webhook-notifier.service";
import { OrganizationsAuditLogService } from "./services/organizations-audit-log.service";

export const AUDIT_LOG_RETENTION_QUEUE = "audit-log-retention-queue";
export const AUDIT_LOG_RETENTION_DLQ = "audit-log-retention-dlq";
export const AUDIT_LOG_RETENTION_SWEEP_JOB = "scheduled-audit-log-retention";

@Processor(AUDIT_LOG_RETENTION_QUEUE)
@Injectable()
export class AuditLogRetentionProcessor
  extends WorkerHost
  implements OnModuleInit
{
  private readonly logger = new Logger(AuditLogRetentionProcessor.name);

  constructor(
    @Inject(OrganizationsAuditLogService)
    private readonly auditLog: OrganizationsAuditLogService,
    @Optional()
    @InjectQueue(AUDIT_LOG_RETENTION_QUEUE)
    private readonly retentionQueue?: Queue,
    @Optional()
    @InjectQueue(AUDIT_LOG_RETENTION_DLQ)
    private readonly dlqQueue?: Queue,
    @Optional()
    @Inject(WebhookNotifierService)
    private readonly webhookNotifier?: WebhookNotifierService,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    if (
      process.env.NODE_ENV === "test" ||
      !this.retentionQueue ||
      typeof this.retentionQueue.upsertJobScheduler !== "function"
    ) {
      return;
    }

    try {
      await this.retentionQueue.upsertJobScheduler(
        "daily-audit-log-retention-sweep",
        { pattern: "0 3 * * *" },
        {
          name: AUDIT_LOG_RETENTION_SWEEP_JOB,
          data: { trigger: "scheduled" },
          opts: {
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 },
            removeOnComplete: 50,
            removeOnFail: 100,
          },
        },
      );
      this.logger.log(
        "[AuditRetention] Registered BullMQ scheduler 'daily-audit-log-retention-sweep' (0 3 * * *)",
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `[AuditRetention] Skipped registering BullMQ job scheduler: ${msg}`,
      );
    }
  }

  async process(job: Job | undefined): Promise<{
    scannedOrgs: number;
    deletedCount: number;
    hygieneDeleted?: {
      expiredSessions: number;
      oldSecurityLogs: number;
      oldNotifications: number;
      processedOutboxEvents: number;
    };
  }> {
    if (!job) {
      return { scannedOrgs: 0, deletedCount: 0 };
    }

    const result = await this.auditLog.purgeExpiredOrgLogs();
    const hygieneDeleted =
      typeof this.auditLog.purgeExpiredOperationalData === "function"
        ? await this.auditLog.purgeExpiredOperationalData()
        : undefined;

    if (result.deletedCount > 0) {
      this.logger.log(
        `[AuditRetention] Purged ${result.deletedCount} expired audit logs across ${result.scannedOrgs} organization(s).`,
      );
    }
    return { ...result, ...(hygieneDeleted ? { hygieneDeleted } : {}) };
  }

  @OnWorkerEvent("failed")
  async onFailed(job: Job | undefined, err: Error): Promise<void> {
    if (!job) return;
    const maxAttempts = job.opts?.attempts || 3;
    if (job.attemptsMade >= maxAttempts) {
      this.logger.error(
        `[CRITICAL ALERT - DLQ] Audit retention job '${job.id}' failed permanently after ${job.attemptsMade} attempts: ${err.message}`,
      );
      if (this.dlqQueue) {
        try {
          await this.dlqQueue.add("dead-letter-audit-retention", {
            originalJob: job.data,
            failedAt: new Date().toISOString(),
            error: err.message,
            totalAttempts: job.attemptsMade,
          });
        } catch (dlqErr: unknown) {
          this.logger.error(
            `[AuditRetention] Failed to enqueue to DLQ: ${dlqErr instanceof Error ? dlqErr.message : String(dlqErr)}`,
          );
        }
      }
      if (this.webhookNotifier) {
        try {
          await this.webhookNotifier.notifyDlq({
            queue: AUDIT_LOG_RETENTION_DLQ,
            jobName: job.name,
            objectName: String(job.id ?? AUDIT_LOG_RETENTION_SWEEP_JOB),
            reason: "audit-log-retention-terminal-failure",
            attemptsMade: job.attemptsMade,
            errorMessage: err.message,
            timestamp: new Date().toISOString(),
          });
        } catch {
          // Best-effort DLQ alert
        }
      }
    }
  }
}
