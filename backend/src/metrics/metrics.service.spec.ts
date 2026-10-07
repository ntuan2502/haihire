import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  MetricsService,
  BULLMQ_TRACKED_STATES,
} from "./metrics.service";
import type { Queue } from "bullmq";
import { Logger } from "@nestjs/common";

describe("MetricsService", () => {
  let service: MetricsService;
  let mockOrphanQueue: Partial<Queue>;
  let mockDlqQueue: Partial<Queue>;
  let mockEmailQueue: Partial<Queue>;

  beforeEach(() => {
    mockOrphanQueue = {
      getJobCounts: vi.fn().mockResolvedValue({
        waiting: 3,
        active: 1,
        completed: 150,
        failed: 0,
        delayed: 2,
        paused: 0,
      }),
    };

    mockDlqQueue = {
      getJobCounts: vi.fn().mockResolvedValue({
        waiting: 12,
        active: 0,
        completed: 5,
        failed: 1,
        delayed: 0,
        paused: 0,
      }),
    };

    mockEmailQueue = {
      getJobCounts: vi.fn().mockResolvedValue({
        waiting: 4,
        active: 2,
        completed: 80,
        failed: 0,
        delayed: 0,
        paused: 0,
      }),
    };

    service = new MetricsService(
      mockOrphanQueue as Queue,
      mockDlqQueue as Queue,
      mockEmailQueue as Queue,
    );
  });

  it("Case 1: Happy path - returns all 18 bullmq_queue_depth lines (3 queues x 6 states) with real counts", async () => {
    const metrics = await service.getMetrics();

    // Verify header annotations
    expect(metrics).toContain("# HELP bullmq_queue_depth Number of jobs in each BullMQ queue state");
    expect(metrics).toContain("# TYPE bullmq_queue_depth gauge");

    // Verify orphan cleanup queue metrics
    expect(metrics).toContain('bullmq_queue_depth{queue="orphan-cleanup-queue",state="waiting"} 3');
    expect(metrics).toContain('bullmq_queue_depth{queue="orphan-cleanup-queue",state="active"} 1');
    expect(metrics).toContain('bullmq_queue_depth{queue="orphan-cleanup-queue",state="completed"} 150');
    expect(metrics).toContain('bullmq_queue_depth{queue="orphan-cleanup-queue",state="failed"} 0');
    expect(metrics).toContain('bullmq_queue_depth{queue="orphan-cleanup-queue",state="delayed"} 2');
    expect(metrics).toContain('bullmq_queue_depth{queue="orphan-cleanup-queue",state="paused"} 0');

    // Verify orphan DLQ metrics
    expect(metrics).toContain('bullmq_queue_depth{queue="orphan-cleanup-dlq",state="waiting"} 12');
    expect(metrics).toContain('bullmq_queue_depth{queue="orphan-cleanup-dlq",state="active"} 0');
    expect(metrics).toContain('bullmq_queue_depth{queue="orphan-cleanup-dlq",state="completed"} 5');
    expect(metrics).toContain('bullmq_queue_depth{queue="orphan-cleanup-dlq",state="failed"} 1');
    expect(metrics).toContain('bullmq_queue_depth{queue="orphan-cleanup-dlq",state="delayed"} 0');
    expect(metrics).toContain('bullmq_queue_depth{queue="orphan-cleanup-dlq",state="paused"} 0');

    // Verify email queue metrics
    expect(metrics).toContain('bullmq_queue_depth{queue="email-queue",state="waiting"} 4');
    expect(metrics).toContain('bullmq_queue_depth{queue="email-queue",state="active"} 2');
    expect(metrics).toContain('bullmq_queue_depth{queue="email-queue",state="completed"} 80');
    expect(metrics).toContain('bullmq_queue_depth{queue="email-queue",state="failed"} 0');
    expect(metrics).toContain('bullmq_queue_depth{queue="email-queue",state="delayed"} 0');
    expect(metrics).toContain('bullmq_queue_depth{queue="email-queue",state="paused"} 0');

    // Total bullmq_queue_depth lines should be exactly 18
    const lines = metrics.split("\n").filter((line) => line.startsWith("bullmq_queue_depth{"));
    expect(lines).toHaveLength(18);
  });

  it("Case 2: Orphan queue throw - sets -1 for orphan queue while dlq and email maintain real counts", async () => {
    (mockOrphanQueue.getJobCounts as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Redis connection reset"),
    );

    const metrics = await service.getMetrics();

    // Orphan cleanup lines should all be -1
    for (const state of BULLMQ_TRACKED_STATES) {
      expect(metrics).toContain(`bullmq_queue_depth{queue="orphan-cleanup-queue",state="${state}"} -1`);
    }

    // DLQ and email lines should still have their real values
    expect(metrics).toContain('bullmq_queue_depth{queue="orphan-cleanup-dlq",state="waiting"} 12');
    expect(metrics).toContain('bullmq_queue_depth{queue="email-queue",state="waiting"} 4');
    expect(metrics).toContain('bullmq_queue_depth{queue="email-queue",state="completed"} 80');
  });

  it("Case 3: All 3 queues throw - sets all 18 lines to -1 without crashing", async () => {
    (mockOrphanQueue.getJobCounts as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Redis down"));
    (mockDlqQueue.getJobCounts as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Redis down"));
    (mockEmailQueue.getJobCounts as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Redis down"));

    const metrics = await service.getMetrics();

    const negativeLines = metrics
      .split("\n")
      .filter((line) => line.startsWith("bullmq_queue_depth{") && line.endsWith(" -1"));

    expect(negativeLines).toHaveLength(18);
  });

  it("Case 4: Metric format conforms strictly to Prometheus exposition syntax", async () => {
    const metrics = await service.getMetrics();
    const metricLines = metrics
      .split("\n")
      .filter((line) => line.startsWith("bullmq_queue_depth{"));

    const regex = /^bullmq_queue_depth\{queue="[^"]+",state="(waiting|active|completed|failed|delayed|paused)"\} -?\d+$/;
    for (const line of metricLines) {
      expect(line).toMatch(regex);
    }
  });

  it("Case 5: Preserves HTTP request and DB pool metrics even when BullMQ fails", async () => {
    service.recordRequest("/health", 200, 30);
    service.recordRequest("/api/v1/jobs", 201, 150);

    (mockOrphanQueue.getJobCounts as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Fail"));
    (mockDlqQueue.getJobCounts as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Fail"));
    (mockEmailQueue.getJobCounts as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Fail"));

    const metrics = await service.getMetrics();

    expect(metrics).toContain("# HELP http_requests_total Total number of HTTP requests processed.");
    expect(metrics).toContain('http_requests_total{route="/health",status="200"} 1');
    expect(metrics).toContain('http_requests_total{route="/api/v1/jobs",status="201"} 1');
    expect(metrics).toContain('http_request_duration_seconds_count{route="/health"} 1');
    expect(metrics).toContain("# HELP db_pool_active Active connections in database pool.");
    expect(metrics).toContain("db_pool_active 1");
  });

  it("Case 6: Non-throwing guarantee when non-Error objects are thrown", async () => {
    (mockOrphanQueue.getJobCounts as ReturnType<typeof vi.fn>).mockRejectedValue("string exception");
    (mockDlqQueue.getJobCounts as ReturnType<typeof vi.fn>).mockRejectedValue({ code: "ECONNREFUSED" });

    await expect(service.getMetrics()).resolves.toBeDefined();
    const metrics = await service.getMetrics();
    expect(metrics).toContain('bullmq_queue_depth{queue="orphan-cleanup-queue",state="waiting"} -1');
    expect(metrics).toContain('bullmq_queue_depth{queue="orphan-cleanup-dlq",state="waiting"} -1');
  });

  it("Case 7: Error logging - logs queue name and error message when queue fails", async () => {
    const loggerSpy = vi.spyOn(Logger.prototype, "error").mockImplementation(() => {});

    (mockDlqQueue.getJobCounts as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DLQ redis socket timeout"),
    );

    await service.getMetrics();

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to collect BullMQ metrics for queue "orphan-cleanup-dlq"'),
    );
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining("DLQ redis socket timeout"),
    );

    loggerSpy.mockRestore();
  });

  it("Case 8: Email queue single failure - Orphan and DLQ maintain accurate numbers", async () => {
    (mockEmailQueue.getJobCounts as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Email queue Redis timeout"),
    );

    const metrics = await service.getMetrics();

    // Email queue has -1
    for (const state of BULLMQ_TRACKED_STATES) {
      expect(metrics).toContain(`bullmq_queue_depth{queue="email-queue",state="${state}"} -1`);
    }

    // Orphan and DLQ queues have real numbers
    expect(metrics).toContain('bullmq_queue_depth{queue="orphan-cleanup-queue",state="waiting"} 3');
    expect(metrics).toContain('bullmq_queue_depth{queue="orphan-cleanup-dlq",state="waiting"} 12');
  });

  it("Case 9: Queue instance is missing or invalid - safely returns -1 without throwing", async () => {
    const brokenService = new MetricsService(
      undefined as unknown as Queue,
      null as unknown as Queue,
      {} as unknown as Queue,
    );

    const metrics = await brokenService.getMetrics();
    const lines = metrics.split("\n").filter((line) => line.startsWith("bullmq_queue_depth{"));
    expect(lines).toHaveLength(18);
    for (const line of lines) {
      expect(line).toMatch(/-1$/);
    }
  });

  it("Case 10: Empty counts object returned by queue defaults missing states to 0", async () => {
    (mockOrphanQueue.getJobCounts as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const metrics = await service.getMetrics();

    for (const state of BULLMQ_TRACKED_STATES) {
      expect(metrics).toContain(`bullmq_queue_depth{queue="orphan-cleanup-queue",state="${state}"} 0`);
    }
  });
});
