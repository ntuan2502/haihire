import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import {
  ORPHAN_CLEANUP_QUEUE,
  ORPHAN_CLEANUP_DLQ,
} from "../applications/orphan-cleanup.processor";
import { AI_SCORING_QUEUE } from "../ai/ai-scoring.service";
import { AUDIT_LOG_RETENTION_QUEUE } from "../organizations/audit-log-retention.processor";
import { PrismaService } from "../prisma/prisma.service";
import { MinioService } from "../minio/minio.service";

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

export const HTTP_DURATION_BUCKETS = [
  0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
] as const;

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage: string,
): Promise<T> {
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
  private requestDurations = new Map<
    string,
    { count: number; sumSec: number }
  >();
  private requestBuckets = new Map<string, number>();
  private activeDbPoolConnections = 1;

  constructor(
    @InjectQueue(ORPHAN_CLEANUP_QUEUE) private readonly orphanQueue: Queue,
    @InjectQueue(ORPHAN_CLEANUP_DLQ) private readonly dlqQueue: Queue,
    @InjectQueue(EMAIL_QUEUE_NAME) private readonly emailQueue: Queue,
    @Optional()
    @InjectQueue(EMAIL_DLQ_NAME)
    private readonly emailDlqQueue?: Queue,
    @Optional()
    @Inject(PrismaService)
    private readonly prisma?: PrismaService,
    @Optional()
    @Inject(MinioService)
    private readonly minio?: MinioService,
    @Optional()
    @InjectQueue(AI_SCORING_QUEUE)
    private readonly aiScoringQueue?: Queue,
    @Optional()
    @InjectQueue(AUDIT_LOG_RETENTION_QUEUE)
    private readonly auditRetentionQueue?: Queue,
  ) {}

  private static readonly MAX_CARDINALITY = 500;

  recordRequest(route: string, status: number, durationMs: number) {
    let normalizedRoute = route || "UNKNOWN_ROUTE";
    const statusKey = `route="${normalizedRoute}",status="${status}"`;

    if (
      this.requestCounts.size >= MetricsService.MAX_CARDINALITY &&
      !this.requestCounts.has(statusKey)
    ) {
      normalizedRoute = "OTHER";
    }

    const key = `route="${normalizedRoute}",status="${status}"`;
    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);

    const durKey = `route="${normalizedRoute}"`;
    const cur = this.requestDurations.get(durKey) || { count: 0, sumSec: 0 };
    cur.count++;
    cur.sumSec += durationMs / 1000;
    this.requestDurations.set(durKey, cur);

    const durSec = durationMs / 1000;
    for (const b of HTTP_DURATION_BUCKETS) {
      if (durSec <= b) {
        const bKey = `route="${normalizedRoute}",le="${b}"`;
        this.requestBuckets.set(bKey, (this.requestBuckets.get(bKey) || 0) + 1);
      }
    }
    const infKey = `route="${normalizedRoute}",le="+Inf"`;
    this.requestBuckets.set(infKey, (this.requestBuckets.get(infKey) || 0) + 1);
  }

  async updateBullMqMetrics(): Promise<{
    depthLines: string[];
    dlqLines: string[];
  }> {
    const queueDefs = [
      { name: ORPHAN_CLEANUP_QUEUE, queue: this.orphanQueue, isDlq: false },
      { name: ORPHAN_CLEANUP_DLQ, queue: this.dlqQueue, isDlq: true },
      { name: EMAIL_QUEUE_NAME, queue: this.emailQueue, isDlq: false },
    ];

    if (this.emailDlqQueue) {
      queueDefs.push({
        name: EMAIL_DLQ_NAME,
        queue: this.emailDlqQueue,
        isDlq: true,
      });
    }
    if (this.aiScoringQueue) {
      queueDefs.push({
        name: AI_SCORING_QUEUE,
        queue: this.aiScoringQueue,
        isDlq: false,
      });
    }
    if (this.auditRetentionQueue) {
      queueDefs.push({
        name: AUDIT_LOG_RETENTION_QUEUE,
        queue: this.auditRetentionQueue,
        isDlq: false,
      });
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
          depthLines.push(
            `bullmq_queue_depth{queue="${name}",state="${state}"} ${count}`,
          );
        }

        if (isDlq) {
          const dlqSize = (counts.waiting ?? 0) + (counts.active ?? 0);
          dlqLines.push(`bullmq_dlq_size{queue_name="${name}"} ${dlqSize}`);
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Failed to collect BullMQ metrics for queue "${name}": ${errMsg}`,
        );
        for (const state of BULLMQ_TRACKED_STATES) {
          depthLines.push(
            `bullmq_queue_depth{queue="${name}",state="${state}"} -1`,
          );
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
      "# TYPE http_request_duration_seconds histogram",
    );
    if (this.requestDurations.size === 0) {
      for (const b of HTTP_DURATION_BUCKETS) {
        lines.push(
          `http_request_duration_seconds_bucket{route="/health",le="${b}"} 0`,
        );
      }
      lines.push(
        'http_request_duration_seconds_bucket{route="/health",le="+Inf"} 0',
      );
      lines.push('http_request_duration_seconds_sum{route="/health"} 0.0000');
      lines.push('http_request_duration_seconds_count{route="/health"} 0');
    } else {
      const distinctRoutes = new Set(
        Array.from(this.requestDurations.keys()).map((k) =>
          k.replace('route="', "").replace('"', ""),
        ),
      );
      for (const route of distinctRoutes) {
        for (const b of HTTP_DURATION_BUCKETS) {
          const bKey = `route="${route}",le="${b}"`;
          const count = this.requestBuckets.get(bKey) || 0;
          lines.push(
            `http_request_duration_seconds_bucket{route="${route}",le="${b}"} ${count}`,
          );
        }
        const infKey = `route="${route}",le="+Inf"`;
        const infCount = this.requestBuckets.get(infKey) || 0;
        lines.push(
          `http_request_duration_seconds_bucket{route="${route}",le="+Inf"} ${infCount}`,
        );
        const dur = this.requestDurations.get(`route="${route}"`) || {
          count: 0,
          sumSec: 0,
        };
        lines.push(
          `http_request_duration_seconds_sum{route="${route}"} ${dur.sumSec.toFixed(4)}`,
        );
        lines.push(
          `http_request_duration_seconds_count{route="${route}"} ${dur.count}`,
        );
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

    let postgresHealth = 1;
    if (this.prisma) {
      try {
        await this.prisma.$queryRaw`SELECT 1`;
      } catch {
        postgresHealth = 0;
      }
    }

    let redisHealth = 1;
    let redisUsedMemoryBytes: number | null = null;
    let redisMaxMemoryBytes: number | null = null;
    try {
      const q = this.orphanQueue as unknown as {
        client?: Promise<{
          ping?: () => Promise<string>;
          info?: (section: string) => Promise<string>;
        }>;
      };
      if (q && q.client) {
        const client = await q.client;
        if (client && typeof client.ping === "function") {
          const res = await client.ping();
          if (res !== "PONG") redisHealth = 0;
        }
        if (client && typeof client.info === "function") {
          try {
            const memInfo = await client.info("memory");
            const usedMatch = memInfo.match(/^used_memory:(\d+)/m);
            const maxMatch = memInfo.match(/^maxmemory:(\d+)/m);
            if (usedMatch?.[1]) {
              redisUsedMemoryBytes = Number(usedMatch[1]);
            }
            if (maxMatch?.[1]) {
              redisMaxMemoryBytes = Number(maxMatch[1]);
            }
          } catch {
            // Optional memory telemetry should not fail health scraping
          }
        }
      }
    } catch {
      redisHealth = 0;
    }

    let minioHealth = 1;
    if (this.minio && typeof this.minio.checkHealth === "function") {
      try {
        minioHealth = (await this.minio.checkHealth()) ? 1 : 0;
      } catch {
        minioHealth = 0;
      }
    }

    lines.push(
      "# HELP haihire_service_health Binary health status of underlying services (1 = UP, 0 = DOWN)",
      "# TYPE haihire_service_health gauge",
      `haihire_service_health{service="postgres"} ${postgresHealth}`,
      `haihire_service_health{service="redis"} ${redisHealth}`,
      `haihire_service_health{service="minio"} ${minioHealth}`,
    );

    if (redisUsedMemoryBytes !== null && redisMaxMemoryBytes !== null) {
      lines.push(
        "# HELP haihire_redis_used_memory_bytes Valkey/Redis used memory in bytes",
        "# TYPE haihire_redis_used_memory_bytes gauge",
        `haihire_redis_used_memory_bytes ${redisUsedMemoryBytes}`,
        "# HELP haihire_redis_maxmemory_bytes Valkey/Redis configured maxmemory in bytes",
        "# TYPE haihire_redis_maxmemory_bytes gauge",
        `haihire_redis_maxmemory_bytes ${redisMaxMemoryBytes}`,
      );
    }

    const activeDb =
      this.prisma?.getPoolStats?.()?.activeCount ??
      this.activeDbPoolConnections;

    lines.push(
      "# HELP db_pool_active Active connections in database pool.",
      "# TYPE db_pool_active gauge",
      `db_pool_active ${activeDb}`,
      "# HELP haihire_db_pool_active_connections Active connections in database pool.",
      "# TYPE haihire_db_pool_active_connections gauge",
      `haihire_db_pool_active_connections ${activeDb}`,
    );

    return lines.join("\n") + "\n";
  }
}
