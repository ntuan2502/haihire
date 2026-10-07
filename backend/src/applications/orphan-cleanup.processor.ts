import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from "@nestjs/bullmq";
import { Job, Queue } from "bullmq";
import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { MinioService } from "../minio/minio.service";
import { WebhookNotifierService } from "../common/webhook/webhook-notifier.service";

export interface OrphanCleanupJobData {
  objectName: string;
  reason?: string;
  originalError?: string;
  enqueuedAt?: string;
  organizationId?: string;
}

export const ORPHAN_CLEANUP_QUEUE = "orphan-cleanup-queue";
export const ORPHAN_CLEANUP_DLQ = "orphan-cleanup-dlq";

@Processor(ORPHAN_CLEANUP_QUEUE)
@Injectable()
export class OrphanCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(OrphanCleanupProcessor.name);

  constructor(
    @Inject(MinioService) private readonly minioService: MinioService,
    @Optional()
    @InjectQueue(ORPHAN_CLEANUP_DLQ)
    private readonly dlqQueue?: Queue,
    @Optional()
    @Inject(WebhookNotifierService)
    private readonly webhookNotifier?: WebhookNotifierService,
  ) {
    super();
  }

  async process(job: Job<OrphanCleanupJobData>): Promise<{ success: boolean; objectName: string }> {
    const { objectName } = job.data;
    this.logger.log(
      `[OrphanCleanup] Processing deletion of orphan file: ${objectName} (Attempt: ${job.attemptsMade + 1}/${job.opts.attempts || 5})`,
    );

    try {
      await this.minioService.deleteFile(objectName);
      this.logger.log(`[OrphanCleanup] Successfully deleted orphan file: ${objectName}`);
      return { success: true, objectName };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`[OrphanCleanup] Failed attempt ${job.attemptsMade + 1} to delete ${objectName}: ${msg}`);
      throw err;
    }
  }

  @OnWorkerEvent("failed")
  async onFailed(job: Job<OrphanCleanupJobData>, err: Error): Promise<void> {
    const maxAttempts = job.opts.attempts || 5;
    if (job.attemptsMade >= maxAttempts) {
      this.logger.error(
        `[CRITICAL ALERT - DLQ] MinIO orphan cleanup failed permanently for object '${job.data.objectName}' after ${job.attemptsMade} attempts: ${err.message}. Moving to DLQ.`,
      );
      if (this.dlqQueue) {
        try {
          await this.dlqQueue.add("dead-letter-cleanup", {
            ...job.data,
            failedAt: new Date().toISOString(),
            finalError: err.message,
            totalAttempts: job.attemptsMade,
          });
          this.logger.log(`[OrphanCleanup] Enqueued '${job.data.objectName}' to Dead-Letter Queue '${ORPHAN_CLEANUP_DLQ}'`);
        } catch (dlqErr: unknown) {
          const dlqMsg = dlqErr instanceof Error ? dlqErr.message : String(dlqErr);
          this.logger.error(`[OrphanCleanup] Failed to enqueue to DLQ: ${dlqMsg}`);
        }
      }

      if (this.webhookNotifier) {
        await this.webhookNotifier.notifyDlq(
          {
            queue: "orphan-cleanup-dlq",
            jobName: job.name,
            objectName: job.data.objectName,
            reason: job.data.reason || "Orphan cleanup failure",
            attemptsMade: job.attemptsMade,
            errorMessage: err.message,
            timestamp: new Date().toISOString(),
          },
          job.data.organizationId,
        );
      }
    }
  }
}
