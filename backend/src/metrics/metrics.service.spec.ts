import { describe, it, expect, beforeEach } from "vitest";
import { MetricsService } from "./metrics.service";

describe("MetricsService", () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  it("should return valid Prometheus initial format when no requests recorded", () => {
    const metrics = service.getMetrics();
    expect(metrics).toContain("# HELP http_requests_total");
    expect(metrics).toContain("# TYPE http_requests_total counter");
    expect(metrics).toContain("bullmq_queue_depth 0");
    expect(metrics).toContain("db_pool_active 1");
  });

  it("should record requests and format counters and summaries accurately", () => {
    service.recordRequest("/health", 200, 45);
    service.recordRequest("/health", 200, 55);
    service.recordRequest("/applications", 400, 120);

    const metrics = service.getMetrics();
    expect(metrics).toContain('http_requests_total{route="/health",status="200"} 2');
    expect(metrics).toContain('http_requests_total{route="/applications",status="400"} 1');
    expect(metrics).toContain('http_request_duration_seconds_count{route="/health"} 2');
  });
});
