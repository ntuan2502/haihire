import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  pushMetrics,
  pushFailureMetric,
  type CleanupReport,
} from "./cleanup-orphan-minio.ts";

describe("MinIO Orphan Cleanup Pushgateway Metrics", () => {
  const originalEnv = { ...process.env };

  const mockReport: CleanupReport = {
    scannedCount: 150,
    dbRefCount: 120,
    orphanCount: 30,
    preservedGraceCount: 10,
    deletedCount: 20,
    bytesFreed: 52428800, // 50 MB
    deletedFiles: ["tenants/org-1/resumes/orphan1.pdf", "tenants/org-2/resumes/orphan2.pdf"],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  // Test Case 1: Push metrics with valid report calls fetch with correct URL, method, and headers
  it("Test 1: push metrics with valid report calls fetch with expected URL and headers", async () => {
    process.env.PUSHGATEWAY_URL = "http://pushgateway:9091";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "OK",
    } as Response);

    await pushMetrics(mockReport);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://pushgateway:9091/metrics/job/minio_orphan_cleanup",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "text/plain" },
      }),
    );
  });

  // Test Case 2: Body contains all 7 metric names and exact values from report
  it("Test 2: metrics body contains all 7 required metric names and exact report values", async () => {
    process.env.PUSHGATEWAY_URL = "http://pushgateway:9091";

    let capturedBody = "";
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      capturedBody = init?.body as string;
      return {
        ok: true,
        status: 200,
        text: async () => "OK",
      } as Response;
    });

    await pushMetrics(mockReport);

    expect(capturedBody).toContain("minio_orphan_cleanup_scanned_total 150");
    expect(capturedBody).toContain("minio_orphan_cleanup_orphans_found_total 30");
    expect(capturedBody).toContain("minio_orphan_cleanup_preserved_total 10");
    expect(capturedBody).toContain("minio_orphan_cleanup_deleted_total 20");
    expect(capturedBody).toContain("minio_orphan_cleanup_bytes_freed_total 52428800");
    expect(capturedBody).toContain("minio_orphan_cleanup_last_run_timestamp_seconds ");
    expect(capturedBody).toContain("minio_orphan_cleanup_success 1");

    // Assert HELP and TYPE definitions
    expect(capturedBody).toContain("# HELP minio_orphan_cleanup_scanned_total");
    expect(capturedBody).toContain("# TYPE minio_orphan_cleanup_scanned_total gauge");
    expect(capturedBody).toContain("# HELP minio_orphan_cleanup_orphans_found_total");
    expect(capturedBody).toContain("# TYPE minio_orphan_cleanup_orphans_found_total gauge");
    expect(capturedBody).toContain("# HELP minio_orphan_cleanup_preserved_total");
    expect(capturedBody).toContain("# TYPE minio_orphan_cleanup_preserved_total gauge");
    expect(capturedBody).toContain("# HELP minio_orphan_cleanup_deleted_total");
    expect(capturedBody).toContain("# TYPE minio_orphan_cleanup_deleted_total gauge");
    expect(capturedBody).toContain("# HELP minio_orphan_cleanup_bytes_freed_total");
    expect(capturedBody).toContain("# TYPE minio_orphan_cleanup_bytes_freed_total gauge");
    expect(capturedBody).toContain("# HELP minio_orphan_cleanup_last_run_timestamp_seconds");
    expect(capturedBody).toContain("# TYPE minio_orphan_cleanup_last_run_timestamp_seconds gauge");
    expect(capturedBody).toContain("# HELP minio_orphan_cleanup_success");
    expect(capturedBody).toContain("# TYPE minio_orphan_cleanup_success gauge");
  });

  // Test Case 3: When PUSHGATEWAY_URL is not set -> logs info, skips fetch, does not throw
  it("Test 3: skips metrics push when PUSHGATEWAY_URL is not set", async () => {
    delete process.env.PUSHGATEWAY_URL;

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(pushMetrics(mockReport)).resolves.not.toThrow();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("PUSHGATEWAY_URL not set, skipping metrics push"),
    );
  });

  // Test Case 4: Fetch returns HTTP 500 -> logs error, non-throwing (cron still finishes)
  it("Test 4: handles HTTP 500 response without throwing", async () => {
    process.env.PUSHGATEWAY_URL = "http://pushgateway:9091";

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    } as Response);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(pushMetrics(mockReport)).resolves.not.toThrow();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Pushgateway returned 500: Internal Server Error"),
    );
  });

  // Test Case 5: Fetch throws network error -> logs error, non-throwing
  it("Test 5: handles fetch network error (connection refused) without throwing", async () => {
    process.env.PUSHGATEWAY_URL = "http://pushgateway:9091";

    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED 127.0.0.1:9091"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(pushMetrics(mockReport)).resolves.not.toThrow();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to push metrics to Pushgateway: ECONNREFUSED 127.0.0.1:9091"),
    );
  });

  // Test Case 6: Success metric is set to 1 on successful push
  it("Test 6: pushes minio_orphan_cleanup_success 1 upon successful execution", async () => {
    process.env.PUSHGATEWAY_URL = "http://pushgateway:9091";

    let capturedBody = "";
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      capturedBody = init?.body as string;
      return {
        ok: true,
        status: 200,
        text: async () => "OK",
      } as Response;
    });

    await pushMetrics(mockReport);

    expect(capturedBody).toMatch(/minio_orphan_cleanup_success 1/);
  });

  // Test Case 7: pushFailureMetric sends minio_orphan_cleanup_success 0
  it("Test 7: pushFailureMetric sends minio_orphan_cleanup_success 0 to Pushgateway", async () => {
    process.env.PUSHGATEWAY_URL = "http://pushgateway:9091";

    let capturedBody = "";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      capturedBody = init?.body as string;
      return {
        ok: true,
        status: 200,
        text: async () => "OK",
      } as Response;
    });

    await pushFailureMetric();

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://pushgateway:9091/metrics/job/minio_orphan_cleanup",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "text/plain" },
      }),
    );
    expect(capturedBody).toContain("minio_orphan_cleanup_success 0");
  });
});
