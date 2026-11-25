import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import {
  Inject,
  Injectable,
  Logger,
  Optional,
  type OnModuleInit,
} from "@nestjs/common";
import type { Job, Queue } from "bullmq";
import { OrganizationsAuditLogService } from "./services/organizations-audit-log.service";

export const AUDIT_LOG_RETENTION_QUEUE = "audit-log-retention-queue";
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

  async process(_job: Job): Promise<{
    scannedOrgs: number;
    deletedCount: number;
  }> {
    const result = await this.auditLog.purgeExpiredOrgLogs();
    if (result.deletedCount > 0) {
      this.logger.log(
        `[AuditRetention] Purged ${result.deletedCount} expired audit logs across ${result.scannedOrgs} organization(s).`,
      );
    }
    return result;
  }
}
