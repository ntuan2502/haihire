import Redis from "ioredis";
import type { PrismaService } from "../../prisma/prisma.service";
import { assertValidPgIdentifier, isSafeTestDatabaseName } from "./test-db-url";

let redisClient: Redis | null = null;
function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 500,
    });
  }
  return redisClient;
}

/**
 * Hard safety guard: verifies the connected PostgreSQL database name contains "test"
 * so integration test cleanup can never wipe the development or production database.
 */
export async function assertSafeTestDatabase(
  prisma: PrismaService,
): Promise<string> {
  const rows = (await prisma.$queryRawUnsafe(
    "SELECT current_database() AS db;",
  )) as Array<{ db?: string }>;
  const dbName = rows?.[0]?.db ?? "";

  if (!dbName || !isSafeTestDatabaseName(dbName)) {
    throw new Error(
      `REFUSING TO CLEAN NON-TEST DATABASE "${dbName}". Integration tests must run against a dedicated test database (e.g. haihire_test_db), never the development database.`,
    );
  }
  return dbName;
}

export async function ensureDatabaseSnapshot(
  _prisma: PrismaService,
): Promise<void> {
  // No-op: integration tests now run in an isolated haihire_test_db database.
}

export async function restoreDatabaseSnapshot(
  _prisma: PrismaService,
): Promise<void> {
  // No-op: integration tests now run in an isolated haihire_test_db database.
}

/**
 * Truncates all tables in public schema (except _prisma_migrations) inside the verified
 * isolated test database and clears Redis throttler keys between integration tests.
 */
export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  await assertSafeTestDatabase(prisma);

  const tableRows = (await prisma.$queryRawUnsafe(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations' ORDER BY tablename;`,
  )) as Array<{ tablename: string }>;

  const quotedTables = tableRows
    .map((row) => `"public"."${assertValidPgIdentifier(row.tablename)}"`)
    .join(", ");

  if (quotedTables) {
    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(
          `SELECT set_config('app.bypass_rls', 'on', true);`,
        );
        await tx.$executeRawUnsafe(
          `TRUNCATE TABLE ${quotedTables} RESTART IDENTITY CASCADE;`,
        );
      },
      { timeout: 30000 },
    );
  }

  try {
    const redis = getRedisClient();
    if (redis.status === "wait" || redis.status === "close") {
      await redis.connect().catch(() => {});
    }
    const keys = await redis.keys("haihire:throttler:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Safe ignore if Redis is offline or not configured in unit environment
  }
}
