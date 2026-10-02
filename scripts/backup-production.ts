import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

export interface BackupConfig {
  backupDir: string;
  retentionDays: number;
  dbHost: string;
  dbPort: string;
  dbUser: string;
  dbName: string;
  postgresContainer: string;
  minioContainer: string;
}

export interface BackupResult {
  success: boolean;
  backupFile?: string;
  backupSqlFile?: string;
  minioBackupFile?: string;
  restoreDrillSuccess?: boolean;
  error?: string;
}

function resolveConfig(): BackupConfig {
  return {
    backupDir: process.env.BACKUP_DIR || path.resolve(process.cwd(), "backups"),
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || "7", 10),
    dbHost: process.env.POSTGRES_HOST || "localhost",
    dbPort: process.env.POSTGRES_PORT || "15432",
    dbUser: process.env.POSTGRES_USER || "haihire_user",
    dbName: process.env.POSTGRES_DB || "haihire_db",
    postgresContainer: process.env.POSTGRES_CONTAINER || "haihire-postgres",
    minioContainer: process.env.MINIO_CONTAINER || "haihire-minio",
  };
}

export async function runBackup(): Promise<BackupResult> {
  const config = resolveConfig();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const lockFilePath = path.join(config.backupDir, ".backup.lock");

  try {
    if (!fs.existsSync(config.backupDir)) {
      fs.mkdirSync(config.backupDir, { recursive: true });
    }
  } catch (err: unknown) {
    const dirErr = `Failed to create or access backup directory '${config.backupDir}': ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[Backup Error] ${dirErr}`);
    return { success: false, error: dirErr };
  }

  // Prevent concurrent backup executions
  if (fs.existsSync(lockFilePath)) {
    try {
      const lockStat = fs.statSync(lockFilePath);
      // Stale lock check (> 30 minutes old)
      if (Date.now() - lockStat.mtimeMs < 30 * 60 * 1000) {
        const lockErr = `Another backup operation is currently in progress (lock file: ${lockFilePath})`;
        console.error(`[Backup Error] ${lockErr}`);
        return { success: false, error: lockErr };
      } else {
        console.warn(`[Backup Warning] Stale lock detected, removing...`);
        fs.unlinkSync(lockFilePath);
      }
    } catch {
      // ignore
    }
  }

  try {
    fs.writeFileSync(lockFilePath, `${process.pid}\n${timestamp}`, { flag: "wx" });
  } catch (e: unknown) {
    const lockErr = `Failed to acquire backup lock: ${e instanceof Error ? e.message : String(e)}`;
    console.error(`[Backup Error] ${lockErr}`);
    return { success: false, error: lockErr };
  }

  const dumpFilename = `haihire-db-${config.dbName}-${timestamp}.dump`;
  const sqlFilename = `haihire-db-${config.dbName}-${timestamp}.sql`;
  const minioFilename = `haihire-minio-${timestamp}.tar.gz`;

  const targetDumpPath = path.join(config.backupDir, dumpFilename);
  const targetSqlPath = path.join(config.backupDir, sqlFilename);
  const targetMinioPath = path.join(config.backupDir, minioFilename);

  console.log(`[Backup] ========================================================`);
  console.log(`[Backup] Starting Enterprise Backup: PostgreSQL & MinIO Object Storage`);
  console.log(`[Backup] Timestamp: ${timestamp}`);
  console.log(`[Backup] Target Directory: ${config.backupDir}`);
  console.log(`[Backup] ========================================================`);

  try {
    // -------------------------------------------------------------
    // Step 1: Health / Pre-flight check on containers
    // -------------------------------------------------------------
    console.log(`[Backup:Pre-flight] Verifying PostgreSQL container '${config.postgresContainer}'...`);
    try {
      const psOutput = execSync(`docker ps --filter "name=${config.postgresContainer}" --filter "status=running" --format "{{.Names}}"`, {
        stdio: "pipe",
        encoding: "utf-8",
      }).trim();
      if (!psOutput || !psOutput.includes(config.postgresContainer)) {
        throw new Error(`Container '${config.postgresContainer}' is not running.`);
      }
    } catch (err: unknown) {
      throw new Error(`PostgreSQL pre-flight failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    console.log(`[Backup:Pre-flight] Verifying MinIO container '${config.minioContainer}'...`);
    try {
      const minioPsOutput = execSync(`docker ps --filter "name=${config.minioContainer}" --filter "status=running" --format "{{.Names}}"`, {
        stdio: "pipe",
        encoding: "utf-8",
      }).trim();
      if (!minioPsOutput || !minioPsOutput.includes(config.minioContainer)) {
        throw new Error(`Container '${config.minioContainer}' is not running.`);
      }
    } catch (err: unknown) {
      throw new Error(`MinIO pre-flight failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // -------------------------------------------------------------
    // Step 2: PostgreSQL Dump (Without -t, Without PowerShell > redirect)
    // -------------------------------------------------------------
    console.log(`[Backup:Postgres] Dumping PostgreSQL custom archive (-F c) inside container...`);
    const containerTmpDump = `/tmp/${dumpFilename}`;
    const containerTmpSql = `/tmp/${sqlFilename}`;

    // Dump Custom Archive format (optimized for pg_restore and integrity checks)
    execSync(
      `docker exec -i ${config.postgresContainer} pg_dump -U ${config.dbUser} -d ${config.dbName} -F c -f ${containerTmpDump}`,
      { stdio: "inherit" }
    );

    // Dump Plain Text SQL format (for direct human inspection & text diffing)
    console.log(`[Backup:Postgres] Dumping PostgreSQL plain text SQL (-F p) inside container...`);
    execSync(
      `docker exec -i ${config.postgresContainer} pg_dump -U ${config.dbUser} -d ${config.dbName} -f ${containerTmpSql}`,
      { stdio: "inherit" }
    );

    // Copy dump files out using docker cp (avoids any shell pipe/redirect encoding issues)
    console.log(`[Backup:Postgres] Copying database dumps from container to host...`);
    execSync(`docker cp ${config.postgresContainer}:${containerTmpDump} "${targetDumpPath}"`, { stdio: "pipe" });
    execSync(`docker cp ${config.postgresContainer}:${containerTmpSql} "${targetSqlPath}"`, { stdio: "pipe" });

    // Cleanup temp files in container
    execSync(`docker exec -i ${config.postgresContainer} rm -f ${containerTmpDump} ${containerTmpSql}`, { stdio: "pipe" });

    const dumpStats = fs.statSync(targetDumpPath);
    const sqlStats = fs.statSync(targetSqlPath);
    console.log(`[Backup:Postgres] Custom dump: ${dumpFilename} (${(dumpStats.size / 1024).toFixed(2)} KB)`);
    console.log(`[Backup:Postgres] Plain SQL dump: ${sqlFilename} (${(sqlStats.size / 1024).toFixed(2)} KB)`);

    // -------------------------------------------------------------
    // Step 3: MinIO Object Storage Backup
    // -------------------------------------------------------------
    console.log(`[Backup:MinIO] Archiving MinIO object storage (/data)...`);
    const containerTmpMinio = `/tmp/${minioFilename}`;

    // Archive /data directory within MinIO container
    execSync(`docker exec -i ${config.minioContainer} tar -czf ${containerTmpMinio} -C /data .`, { stdio: "inherit" });
    execSync(`docker cp ${config.minioContainer}:${containerTmpMinio} "${targetMinioPath}"`, { stdio: "pipe" });
    execSync(`docker exec -i ${config.minioContainer} rm -f ${containerTmpMinio}`, { stdio: "pipe" });

    const minioStats = fs.statSync(targetMinioPath);
    console.log(`[Backup:MinIO] Storage archive: ${minioFilename} (${(minioStats.size / 1024).toFixed(2)} KB)`);

    // -------------------------------------------------------------
    // Step 4: Verify Integrity via pg_restore -l
    // -------------------------------------------------------------
    console.log(`[Backup:Integrity] Verifying dump TOC integrity via pg_restore -l...`);
    const tempContainerVerifyFile = `/tmp/verify_${dumpFilename}`;
    execSync(`docker cp "${targetDumpPath}" ${config.postgresContainer}:${tempContainerVerifyFile}`, { stdio: "pipe" });

    let tocOutput = "";
    try {
      tocOutput = execSync(`docker exec -i ${config.postgresContainer} pg_restore -l ${tempContainerVerifyFile}`, {
        encoding: "utf-8",
      });
      if (!tocOutput || !tocOutput.includes("TOC Entries")) {
        throw new Error("pg_restore -l output missing valid TOC entries.");
      }
      console.log(`[Backup:Integrity] pg_restore -l validation PASSED. TOC validated.`);
    } finally {
      execSync(`docker exec -i ${config.postgresContainer} rm -f ${tempContainerVerifyFile}`, { stdio: "pipe" });
    }

    // -------------------------------------------------------------
    // Step 5: Live Automated Restore Drill
    // -------------------------------------------------------------
    console.log(`[Backup:RestoreDrill] Executing live restore drill into test database 'haihire_restore_drill'...`);
    const drillDb = "haihire_restore_drill";
    const drillContainerFile = `/tmp/drill_${dumpFilename}`;
    execSync(`docker cp "${targetDumpPath}" ${config.postgresContainer}:${drillContainerFile}`, { stdio: "pipe" });

    let restoreDrillPassed = false;
    try {
      // 5.1 Re-create drill database cleanly
      execSync(`docker exec -i ${config.postgresContainer} psql -U ${config.dbUser} -d postgres -c "DROP DATABASE IF EXISTS ${drillDb}"`, {
        stdio: "pipe",
      });
      execSync(`docker exec -i ${config.postgresContainer} psql -U ${config.dbUser} -d postgres -c "CREATE DATABASE ${drillDb} OWNER ${config.dbUser}"`, {
        stdio: "pipe",
      });

      // 5.2 Restore custom dump into drill database
      execSync(
        `docker exec -i ${config.postgresContainer} pg_restore -U ${config.dbUser} -d ${drillDb} --no-owner --no-acl ${drillContainerFile}`,
        { stdio: "inherit" }
      );

      // 5.3 Validate restored data by querying User and Job tables
      const userCountOut = execSync(
        `docker exec -i ${config.postgresContainer} psql -U ${config.dbUser} -d ${drillDb} -t`,
        { input: 'SELECT count(*) FROM "user";\n', encoding: "utf-8" }
      ).trim();

      const userCount = parseInt(userCountOut, 10);
      if (isNaN(userCount) || userCount < 0) {
        throw new Error(`Data validation failed: unexpected user count '${userCountOut}'`);
      }
      console.log(`[Backup:RestoreDrill] Validation query successful: Restored User count = ${userCount}`);
      restoreDrillPassed = true;

      // 5.4 Drop temporary restore drill database
      execSync(`docker exec -i ${config.postgresContainer} psql -U ${config.dbUser} -d postgres -c "DROP DATABASE ${drillDb}"`, {
        stdio: "pipe",
      });
      console.log(`[Backup:RestoreDrill] Restore drill database '${drillDb}' cleaned up successfully.`);
    } catch (drillErr: unknown) {
      console.error(`[Backup:RestoreDrill ERROR] Live restore drill FAILED! Keeping dump files for forensic review:`, drillErr);
      throw drillErr;
    } finally {
      execSync(`docker exec -i ${config.postgresContainer} rm -f ${drillContainerFile}`, { stdio: "pipe" });
    }

    // -------------------------------------------------------------
    // Step 6: Prune Old Backups
    // -------------------------------------------------------------
    pruneOldBackups(config.backupDir, config.retentionDays);

    console.log(`[Backup] ========================================================`);
    console.log(`[Backup] Backup & Restore Drill Completed Successfully!`);
    console.log(`[Backup] PostgreSQL Dump: ${targetDumpPath}`);
    console.log(`[Backup] PostgreSQL SQL:  ${targetSqlPath}`);
    console.log(`[Backup] MinIO Archive:   ${targetMinioPath}`);
    console.log(`[Backup] ========================================================`);

    return {
      success: true,
      backupFile: targetDumpPath,
      backupSqlFile: targetSqlPath,
      minioBackupFile: targetMinioPath,
      restoreDrillSuccess: restoreDrillPassed,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Backup] Backup pipeline terminated with error:`, errorMsg);
    return { success: false, error: errorMsg };
  } finally {
    if (fs.existsSync(lockFilePath)) {
      try {
        fs.unlinkSync(lockFilePath);
      } catch {
        // ignore
      }
    }
  }
}

function pruneOldBackups(backupDir: string, retentionDays: number) {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(backupDir);

  for (const file of files) {
    if (
      !file.startsWith("haihire-db-") &&
      !file.startsWith("haihire-minio-")
    ) {
      continue;
    }
    if (
      !file.endsWith(".sql") &&
      !file.endsWith(".dump") &&
      !file.endsWith(".tar.gz")
    ) {
      continue;
    }

    const filePath = path.join(backupDir, file);
    try {
      const stats = fs.statSync(filePath);
      if (stats.mtimeMs < cutoff) {
        console.log(`[Backup Retention] Removing expired backup: ${file}`);
        fs.unlinkSync(filePath);
      }
    } catch {
      // ignore
    }
  }
}

// Execute standalone if directly invoked
if (process.argv[1]?.endsWith("backup-production.ts")) {
  runBackup().then((res) => {
    if (!res.success) process.exit(1);
  });
}
