import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import {
  assertValidPgIdentifier,
  extractDatabaseName,
  isSafeTestDatabaseName,
} from "./helpers/test-db-url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_ROOT = path.resolve(__dirname, "..", "..");
const require = createRequire(import.meta.url);

export default async function globalSetup() {
  const testDbUrl = process.env.DATABASE_URL?.trim();
  if (!testDbUrl) {
    return;
  }

  const testDbName = assertValidPgIdentifier(extractDatabaseName(testDbUrl));
  if (!isSafeTestDatabaseName(testDbName)) {
    throw new Error(
      `REFUSING vitest globalSetup against non-test database "${testDbName}".`,
    );
  }

  const adminUrl = new URL(testDbUrl);
  adminUrl.pathname = "/postgres";
  adminUrl.search = "";

  const pool = new pg.Pool({
    connectionString: adminUrl.toString(),
    max: 1,
    connectionTimeoutMillis: 2500,
  });

  let reachable = true;
  try {
    const existing = await pool.query<{ exists: number }>(
      "SELECT 1 AS exists FROM pg_database WHERE datname = $1",
      [testDbName],
    );
    if (existing.rowCount === 0) {
      await pool.query(`CREATE DATABASE "${testDbName}"`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[vitest-global-setup] PostgreSQL unreachable at ${adminUrl.host} (${msg}); skipping test DB bootstrap.`,
    );
    reachable = false;
  } finally {
    await pool.end().catch(() => {});
  }

  if (!reachable) {
    return;
  }

  const prismaCliPath = require.resolve("prisma/build/index.js", {
    paths: [API_ROOT],
  });
  execFileSync(
    process.execPath,
    [
      prismaCliPath,
      "migrate",
      "deploy",
      "--schema",
      "src/prisma/schema.prisma",
    ],
    {
      cwd: API_ROOT,
      env: {
        ...process.env,
        DATABASE_URL: testDbUrl,
      },
      stdio: "pipe",
    },
  );
}
