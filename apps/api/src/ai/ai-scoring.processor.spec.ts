import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Job, Queue } from "bullmq";
import {
  AI_SCORING_DLQ_NAME,
  AiScoringProcessor,
} from "./ai-scoring.processor";
import type { AiScoringJobData, AiScoringService } from "./ai-scoring.service";
import type { WebhookNotifierService } from "../common/webhook/webhook-notifier.service";

describe("AiScoringProcessor", () => {
  let processor: AiScoringProcessor;
  let mockScoringService: { scoreApplicationNow: ReturnType<typeof vi.fn> };
  let mockDlqQueue: { add: ReturnType<typeof vi.fn> };
  let mockWebhookNotifier: { notifyDlq: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockScoringService = {
      scoreApplicationNow: vi.fn().mockResolvedValue({ ok: true }),
    };
    mockDlqQueue = {
      add: vi.fn().mockResolvedValue({ id: "dlq-job-1" }),
    };
    mockWebhookNotifier = {
      notifyDlq: vi.fn().mockResolvedValue(undefined),
    };

    processor = new AiScoringProcessor(
      mockScoringService as unknown as AiScoringService,
      mockDlqQueue as unknown as Queue,
      mockWebhookNotifier as unknown as WebhookNotifierService,
    );
  });

  it("returns ok:false gracefully when job is undefined", async () => {
    await expect(processor.process(undefined)).resolves.toEqual({ ok: false });
    expect(mockScoringService.scoreApplicationNow).not.toHaveBeenCalled();
  });

  it("skips malformed jobs missing organizationId or applicationId", async () => {
    const job = {
      id: "malformed-1",
      data: { organizationId: "org-1" },
    } as unknown as Job<AiScoringJobData>;

    await expect(processor.process(job)).resolves.toEqual({ ok: false });
    expect(mockScoringService.scoreApplicationNow).not.toHaveBeenCalled();
  });

  it("passes markFailedOnError=false on intermediate retry attempts and true on final attempt", async () => {
    const firstAttempt = {
      id: "score-1",
      attemptsMade: 0,
      opts: { attempts: 3 },
      data: { organizationId: "org-1", applicationId: "app-1" },
    } as unknown as Job<AiScoringJobData>;

    await expect(processor.process(firstAttempt)).resolves.toEqual({
      ok: true,
    });
    expect(mockScoringService.scoreApplicationNow).toHaveBeenCalledWith(
      "org-1",
      "app-1",
      { markFailedOnError: false },
    );

    const finalAttempt = {
      id: "score-1",
      attemptsMade: 2,
      opts: { attempts: 3 },
      data: { organizationId: "org-1", applicationId: "app-1" },
    } as unknown as Job<AiScoringJobData>;

    await expect(processor.process(finalAttempt)).resolves.toEqual({
      ok: true,
    });
    expect(mockScoringService.scoreApplicationNow).toHaveBeenLastCalledWith(
      "org-1",
      "app-1",
      { markFailedOnError: true },
    );
  });

  it("forwards permanently failed scoring jobs to DLQ and webhook notifier", async () => {
    await processor.onFailed(undefined, new Error("ignored"));
    expect(mockDlqQueue.add).not.toHaveBeenCalled();

    const failedJob = {
      id: "ai-score-app-1",
      name: "score-application",
      attemptsMade: 3,
      opts: { attempts: 3 },
      data: { organizationId: "org-1", applicationId: "app-1" },
    } as unknown as Job<AiScoringJobData>;

    await processor.onFailed(failedJob, new Error("AI gateway exhausted"));

    expect(mockDlqQueue.add).toHaveBeenCalledWith(
      "dead-letter-ai-scoring",
      expect.objectContaining({
        originalJob: { organizationId: "org-1", applicationId: "app-1" },
        error: "AI gateway exhausted",
        totalAttempts: 3,
      }),
    );
    expect(mockWebhookNotifier.notifyDlq).toHaveBeenCalledWith(
      expect.objectContaining({
        queue: AI_SCORING_DLQ_NAME,
        jobName: "score-application",
        objectName: "app-1",
        reason: "ai-scoring-terminal-failure",
        attemptsMade: 3,
      }),
      "org-1",
    );
  });
});
