import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from "@nestjs/bullmq";
import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import type { Job, Queue } from "bullmq";
import { WebhookNotifierService } from "../common/webhook/webhook-notifier.service";
import {
  AI_SCORING_QUEUE,
  AiScoringService,
  type AiScoringJobData,
} from "./ai-scoring.service";

export const AI_SCORING_DLQ_NAME = "ai-scoring-dlq-queue";

@Processor(AI_SCORING_QUEUE, { concurrency: 3 })
@Injectable()
export class AiScoringProcessor extends WorkerHost {
  private readonly logger = new Logger(AiScoringProcessor.name);

  constructor(
    @Inject(AiScoringService)
    private readonly aiScoringService: AiScoringService,
    @Optional()
    @InjectQueue(AI_SCORING_DLQ_NAME)
    private readonly dlqQueue?: Queue,
    @Optional()
    @Inject(WebhookNotifierService)
    private readonly webhookNotifier?: WebhookNotifierService,
  ) {
    super();
  }

  async process(
    job: Job<AiScoringJobData> | undefined,
  ): Promise<{ ok: boolean }> {
    if (!job) {
      return { ok: false };
    }
    const { organizationId, applicationId } = job.data || {};
    if (!organizationId || !applicationId) {
      this.logger.warn(`[AiScoring] Skipping malformed job ${job.id}`);
      return { ok: false };
    }

    const maxAttempts =
      typeof job.opts?.attempts === "number" && job.opts.attempts > 0
        ? job.opts.attempts
        : 1;
    const isFinalAttempt = (job.attemptsMade ?? 0) + 1 >= maxAttempts;

    try {
      await this.aiScoringService.scoreApplicationNow(
        organizationId,
        applicationId,
        { markFailedOnError: isFinalAttempt },
      );
      return { ok: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `[AiScoring] Job ${job.id} failed for app=${applicationId}: ${msg.slice(0, 160)}`,
      );
      throw err;
    }
  }

  @OnWorkerEvent("failed")
  async onFailed(
    job: Job<AiScoringJobData> | undefined,
    err: Error,
  ): Promise<void> {
    if (!job) return;
    const maxAttempts = job.opts?.attempts || 3;
    if (job.attemptsMade >= maxAttempts) {
      this.logger.error(
        `[CRITICAL ALERT - DLQ] AI scoring failed permanently for job '${job.id}' (app=${job.data?.applicationId}) after ${job.attemptsMade} attempts: ${err.message}`,
      );
      if (this.dlqQueue) {
        try {
          await this.dlqQueue.add("dead-letter-ai-scoring", {
            originalJob: job.data,
            failedAt: new Date().toISOString(),
            error: err.message,
            totalAttempts: job.attemptsMade,
          });
        } catch (dlqErr: unknown) {
          this.logger.error(
            `[AiScoring] Failed to enqueue to DLQ: ${dlqErr instanceof Error ? dlqErr.message : String(dlqErr)}`,
          );
        }
      }
      if (this.webhookNotifier) {
        try {
          await this.webhookNotifier.notifyDlq(
            {
              queue: AI_SCORING_DLQ_NAME,
              jobName: job.name,
              objectName:
                job.data?.applicationId || String(job.id ?? "unknown"),
              reason: "ai-scoring-terminal-failure",
              attemptsMade: job.attemptsMade,
              errorMessage: err.message,
              timestamp: new Date().toISOString(),
            },
            job.data?.organizationId,
          );
        } catch {
          // Best-effort DLQ alert
        }
      }
    }
  }
}
