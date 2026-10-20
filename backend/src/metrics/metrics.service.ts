import { Injectable, Logger, Optional } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import {
  ORPHAN_CLEANUP_QUEUE,
  ORPHAN_CLEANUP_DLQ,
} from "../applications/orphan-cleanup.processor";

export const EMAIL_QUEUE_NAME = "email-queue";
export const EMAIL_DLQ_NAME = "email-dlq-queue";

export const BULLMQ_TRACKED_STATES = [
  "waiting",
  "active",
  "completed",
  "failed",
  "delayed",
  "paused",
] as const;

export type BullMqTrackedState = (typeof BULLMQ_TRACKED_STATES)[number];

export const QUEUE_FETCH_TIMEOUT_MS = 2500;

function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private requestCounts = new Map<string, number>();
  private requestDurations = new Map<string, { count: number; sumSec: number }>();
  private activeDbPoolConnections = 1;

  constructor(
    @InjectQueue(ORPHAN_CLEANUP_QUEUE) private readonly orphanQueue: Queue,
    @InjectQueue(ORPHAN_CLEANUP_DLQ) private readonly dlqQueue: Queue,
    @InjectQueue(EMAIL_QUEUE_NAME) private readonly emailQueue: Queue,
    @Optional()
    @InjectQueue(EMAIL_DLQ_NAME)
    private readonly emailDlqQueue?: Queue,
  ) {}

  recordRequest(route: string, status: number, durationMs: number) {
    const key = `route="${route}",status="${status}"`;
    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);

    const durKey = `route="${route}"`;
    const cur = this.requestDurations.get(durKey) || { count: 0, sumSec: 0 };
    cur.count++;
    cur.sumSec += durationMs / 1000;
    this.requestDurations.set(durKey, cur);
  }

  async updateBullMqMetrics(): Promise<{ depthLines: string[]; dlqLines: string[] }> {
    const queueDefs = [
      { name: ORPHAN_CLEANUP_QUEUE, queue: this.orphanQueue, isDlq: false },
      { name: ORPHAN_CLEANUP_DLQ, queue: this.dlqQueue, isDlq: true },
      { name: EMAIL_QUEUE_NAME, queue: this.emailQueue, isDlq: false },
    ];

    if (this.emailDlqQueue) {
      queueDefs.push({ name: EMAIL_DLQ_NAME, queue: this.emailDlqQueue, isDlq: true });
    }

    const depthLines: string[] = [];
    const dlqLines: string[] = [];

    for (const { name, queue, isDlq } of queueDefs) {
      try {
        if (!queue || typeof queue.getJobCounts !== "function") {
          throw new Error("Queue instance is not available");
        }

        const counts = await withTimeout(
          queue.getJobCounts(
            "waiting",
            "active",
            "completed",
            "failed",
            "delayed",
            "paused" as unknown as import("bullmq").JobType,
          ),
          QUEUE_FETCH_TIMEOUT_MS,
          `Timeout fetching job counts after ${QUEUE_FETCH_TIMEOUT_MS}ms`,
        );

        for (const state of BULLMQ_TRACKED_STATES) {
          const count = counts[state] ?? 0;
          depthLines.push(`bullmq_queue_depth{queue="${name}",state="${state}"} ${count}`);
        }

        if (isDlq) {
          const dlqSize = (counts.waiting ?? 0) + (counts.active ?? 0);
          dlqLines.push(`bullmq_dlq_size{queue_name="${name}"} ${dlqSize}`);
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to collect BullMQ metrics for queue "${name}": ${errMsg}`);
        for (const state of BULLMQ_TRACKED_STATES) {
          depthLines.push(`bullmq_queue_depth{queue="${name}",state="${state}"} -1`);
        }
        if (isDlq) {
          dlqLines.push(`bullmq_dlq_size{queue_name="${name}"} -1`);
        }
      }
    }

    return { depthLines, dlqLines };
  }

  async getMetrics(): Promise<string> {
    const lines: string[] = [
      "# HELP http_requests_total Total number of HTTP requests processed.",
      "# TYPE http_requests_total counter",
    ];

    if (this.requestCounts.size === 0) {
      lines.push('http_requests_total{route="/health",status="200"} 0');
    } else {
      for (const [labels, count] of this.requestCounts.entries()) {
        lines.push(`http_requests_total{${labels}} ${count}`);
      }
    }

    lines.push(
      "# HELP http_request_duration_seconds Total duration of HTTP requests in seconds.",
      "# TYPE http_request_duration_seconds summary",
    );
    if (this.requestDurations.size === 0) {
      lines.push('http_request_duration_seconds_sum{route="/health"} 0.0000');
      lines.push('http_request_duration_seconds_count{route="/health"} 0');
    } else {
      for (const [labels, data] of this.requestDurations.entries()) {
        lines.push(`http_request_duration_seconds_sum{${labels}} ${data.sumSec.toFixed(4)}`);
        lines.push(`http_request_duration_seconds_count{${labels}} ${data.count}`);
      }
    }

    const { depthLines, dlqLines } = await this.updateBullMqMetrics();

    lines.push(
      "# HELP bullmq_queue_depth Number of jobs in each BullMQ queue state",
      "# TYPE bullmq_queue_depth gauge",
    );
    lines.push(...depthLines);

    lines.push(
      "# HELP bullmq_dlq_size Number of jobs in BullMQ Dead Letter Queue",
      "# TYPE bullmq_dlq_size gauge",
    );
    lines.push(...dlqLines);

    lines.push(
      "# HELP db_pool_active Active connections in database pool.",
      "# TYPE db_pool_active gauge",
      `db_pool_active ${this.activeDbPoolConnections}`,
    );

    return lines.join("\n") + "\n";
  }
}
