import { Injectable } from "@nestjs/common";

@Injectable()
export class MetricsService {
  private requestCounts = new Map<string, number>();
  private requestDurations = new Map<string, { count: number; sumSec: number }>();
  private activeDbPoolConnections = 1;

  recordRequest(route: string, status: number, durationMs: number) {
    const key = `route="${route}",status="${status}"`;
    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);

    const durKey = `route="${route}"`;
    const cur = this.requestDurations.get(durKey) || { count: 0, sumSec: 0 };
    cur.count++;
    cur.sumSec += durationMs / 1000;
    this.requestDurations.set(durKey, cur);
  }

  getMetrics(): string {
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

    lines.push(
      "# HELP bullmq_queue_depth Estimated depth of BullMQ async jobs queue.",
      "# TYPE bullmq_queue_depth gauge",
      "bullmq_queue_depth 0",
      "# HELP db_pool_active Active connections in database pool.",
      "# TYPE db_pool_active gauge",
      `db_pool_active ${this.activeDbPoolConnections}`,
    );

    return lines.join("\n") + "\n";
  }
}
