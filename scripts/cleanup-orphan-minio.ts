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
    console.log("\n[SUCCESS] MinIO orphan cleanup finished successfully.");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\n[ERROR] MinIO orphan cleanup failed: ${msg}`);
    process.exit(1);
  }
}

// Auto-run if executed as script
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("cleanup-orphan-minio.ts")) {
  runCli();
}
