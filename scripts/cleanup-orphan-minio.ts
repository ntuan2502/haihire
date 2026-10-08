import * as Minio from "minio";
import dotenv from "dotenv";
import path from "node:path";
import {
  cleanupOrphans,
  extractObjectNameFromUrl,
  type CleanupOptions,
  type CleanupReport,
} from "../backend/src/common/orphan-cleanup";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });
dotenv.config();

export { cleanupOrphans, extractObjectNameFromUrl, type CleanupOptions, type CleanupReport };

/**
 * Pushes MinIO orphan cleanup metrics to Prometheus Pushgateway.
 * Non-throwing: network issues or missing Pushgateway will NOT fail the cron.
 */
export async function pushMetrics(report: CleanupReport): Promise<void> {
  const url = process.env.PUSHGATEWAY_URL;
  if (!url) {
    console.log("[INFO] PUSHGATEWAY_URL not set, skipping metrics push");
    return;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const isSuccess = 1;

  const metrics = [
    "# HELP minio_orphan_cleanup_scanned_total Total MinIO objects scanned",
    "# TYPE minio_orphan_cleanup_scanned_total gauge",
    `minio_orphan_cleanup_scanned_total ${report.scannedCount}`,
    "",
    "# HELP minio_orphan_cleanup_orphans_found_total Total orphan objects found",
    "# TYPE minio_orphan_cleanup_orphans_found_total gauge",
    `minio_orphan_cleanup_orphans_found_total ${report.orphanCount}`,
    "",
    "# HELP minio_orphan_cleanup_preserved_total Orphan objects preserved (in grace period)",
    "# TYPE minio_orphan_cleanup_preserved_total gauge",
    `minio_orphan_cleanup_preserved_total ${report.preservedGraceCount}`,
    "",
    "# HELP minio_orphan_cleanup_deleted_total Orphan objects deleted",
    "# TYPE minio_orphan_cleanup_deleted_total gauge",
    `minio_orphan_cleanup_deleted_total ${report.deletedCount}`,
    "",
    "# HELP minio_orphan_cleanup_bytes_freed_total Bytes freed by cleanup",
    "# TYPE minio_orphan_cleanup_bytes_freed_total gauge",
    `minio_orphan_cleanup_bytes_freed_total ${report.bytesFreed}`,
    "",
    "# HELP minio_orphan_cleanup_last_run_timestamp_seconds Last run timestamp",
    "# TYPE minio_orphan_cleanup_last_run_timestamp_seconds gauge",
    `minio_orphan_cleanup_last_run_timestamp_seconds ${timestamp}`,
    "",
    "# HELP minio_orphan_cleanup_success Run status (1=success, 0=failure)",
    "# TYPE minio_orphan_cleanup_success gauge",
    `minio_orphan_cleanup_success ${isSuccess}`,
    "",
  ].join("\n");

  const pushUrl = `${url.replace(/\/+$/, "")}/metrics/job/minio_orphan_cleanup`;

  try {
    const response = await fetch(pushUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: metrics,
    });

    if (!response.ok) {
      console.error(
        `[ERROR] Pushgateway returned ${response.status}: ${await response.text()}`,
      );
      // Non-throwing: cron still completes normally
    } else {
      console.log(`[SUCCESS] Metrics pushed to ${pushUrl}`);
    }
  } catch (err) {
    // Non-throwing: if Pushgateway is down, cron still exits 0
    console.error(
      `[ERROR] Failed to push metrics to Pushgateway: ${(err as Error).message}`,
    );
  }
}

/**
 * Pushes failure status (minio_orphan_cleanup_success 0) to Pushgateway when script fails.
 */
export async function pushFailureMetric(): Promise<void> {
  const url = process.env.PUSHGATEWAY_URL;
  if (!url) return;

  const failUrl = `${url.replace(/\/+$/, "")}/metrics/job/minio_orphan_cleanup`;
  try {
    await fetch(failUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: [
        "# HELP minio_orphan_cleanup_success Run status (1=success, 0=failure)",
        "# TYPE minio_orphan_cleanup_success gauge",
        "minio_orphan_cleanup_success 0",
        "",
      ].join("\n"),
    });
  } catch {
    // ignore
  }
}

export async function runCli(): Promise<void> {
  const isDryRun = process.argv.includes("--dry-run");
  const thresholdArg = process.argv.find((arg) => arg.startsWith("--threshold-days="));
  const thresholdDays = thresholdArg ? parseInt(thresholdArg.split("=")[1], 10) : 30;

  console.log("==================================================================");
  console.log("       HAIHIRE ENTERPRISE ATS: MINIO ORPHAN CLEANUP CRON          ");
  console.log("==================================================================");
  console.log(`Execution Mode:       ${isDryRun ? "DRY-RUN (Safe Simulation - No Deletions)" : "LIVE DELETION"}`);
  console.log(`Age Threshold:        ${thresholdDays} days`);
  console.log(`Target Bucket:        ${process.env.MINIO_BUCKET_NAME || "haihire-resumes"}`);
  console.log("------------------------------------------------------------------");

  const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT ?? "localhost",
    port: parseInt(process.env.MINIO_PORT ?? "9000", 10),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY ?? "haihire_minio_admin",
    secretKey: process.env.MINIO_SECRET_KEY ?? "HaiHireMinioPass2026Secure",
  });

  try {
    const report = await cleanupOrphans({
      dryRun: isDryRun,
      thresholdDays,
      minioClient,
    });

    console.log(`Total Objects Scanned:     ${report.scannedCount}`);
    console.log(`Active DB References:      ${report.dbRefCount}`);
    console.log(`Orphan Objects Found:      ${report.orphanCount}`);
    console.log(`  - Preserved (< ${thresholdDays}d):     ${report.preservedGraceCount}`);
    console.log(`  - ${isDryRun ? "Eligible for Deletion" : "Deleted"}:      ${report.deletedCount}`);
    console.log(`Storage Space Freed:       ${(report.bytesFreed / (1024 * 1024)).toFixed(2)} MB (${report.bytesFreed} bytes)`);
    console.log("==================================================================");

    if (report.deletedFiles.length > 0) {
      console.log(`\nFiles ${isDryRun ? "identified for deletion" : "deleted"}:`);
      report.deletedFiles.slice(0, 20).forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
      if (report.deletedFiles.length > 20) {
        console.log(`  ... and ${report.deletedFiles.length - 20} more files.`);
      }
    }

    await pushMetrics(report);
    console.log("\n[SUCCESS] MinIO orphan cleanup finished successfully.");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\n[ERROR] MinIO orphan cleanup failed: ${msg}`);
    await pushFailureMetric();
    process.exit(1);
  }
}

// Auto-run if executed as script
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("cleanup-orphan-minio.ts")) {
  runCli();
}
