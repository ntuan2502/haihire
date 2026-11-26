import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import {
  AI_SCORING_QUEUE,
  AiScoringService,
  type AiScoringJobData,
} from "./ai-scoring.service";

@Processor(AI_SCORING_QUEUE, { concurrency: 3 })
@Injectable()
export class AiScoringProcessor extends WorkerHost {
  private readonly logger = new Logger(AiScoringProcessor.name);

  constructor(
    @Inject(AiScoringService)
    private readonly aiScoringService: AiScoringService,
  ) {
    super();
  }

  async process(job: Job<AiScoringJobData>): Promise<{ ok: boolean }> {
    const { organizationId, applicationId } = job.data || {};
    if (!organizationId || !applicationId) {
      this.logger.warn(`[AiScoring] Skipping malformed job ${job.id}`);
      return { ok: false };
    }

    try {
      await this.aiScoringService.scoreApplicationNow(
        organizationId,
        applicationId,
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
}
