import type { PrismaService } from "../../prisma/prisma.service";
import Redis from "ioredis";

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

const SNAPSHOT_SCHEMA = "_haihire_test_snapshot";

const ALL_TABLES_CHILD_TO_PARENT = [
  "notification",
  "notification_preference",
  "activity_log",
  "application_note",
  "candidate_note",
  "candidate_document",
  "interview",
  "email_log",
  "email_flow_config",
  "email_template",
  "email_setting",
  "tracking_click",
  "application",
  "pipeline_stage",
  "tracking_link",
  "candidate",
  "job",
  "stored_file",
  "organization_role_permission",
  "organization_webhook_setting",
  "organization_audit_log",
  "platform_audit_log",
  "invite_link",
  "outbox_event",
  "organization_member",
  "organization",
  "user",
] as const;

async function hasSnapshot(prisma: PrismaService): Promise<boolean> {
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT to_regclass('"${SNAPSHOT_SCHEMA}"."user"')::text AS reg;`,
    )) as Array<{ reg: string | null }>;
    return Boolean(rows?.[0]?.reg);
  } catch {
    return false;
  }
}

/**
 * Snapshots all public tables into a temporary backup schema before tests wipe
 * the database so development seed data can be restored automatically on close.
 */
export async function ensureDatabaseSnapshot(
  prisma: PrismaService,
): Promise<void> {
  if (await hasSnapshot(prisma)) {
    return;
  }

  let hasExistingData = false;
  try {
    const userCount = await prisma.user.count();
    hasExistingData = userCount > 0;
  } catch {
    return;
  }

  if (!hasExistingData) {
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.bypass_rls', 'on', true);`,
      );
      await tx.$executeRawUnsafe(
        `CREATE SCHEMA IF NOT EXISTS "${SNAPSHOT_SCHEMA}";`,
      );
      for (const table of ALL_TABLES_CHILD_TO_PARENT) {
        await tx.$executeRawUnsafe(
          `DROP TABLE IF EXISTS "${SNAPSHOT_SCHEMA}"."${table}";`,
        );
        await tx.$executeRawUnsafe(
          `CREATE TABLE "${SNAPSHOT_SCHEMA}"."${table}" AS TABLE public."${table}";`,
        );
      }
    },
    { timeout: 30000 },
  );
}

/**
 * Restores all tables from the temporary snapshot schema created before tests
 * and drops the backup schema afterwards.
 */
export async function restoreDatabaseSnapshot(
  prisma: PrismaService,
): Promise<void> {
  if (!(await hasSnapshot(prisma))) {
    return;
  }

  const parentToChild = [...ALL_TABLES_CHILD_TO_PARENT].reverse();

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.bypass_rls', 'on', true);`,
      );
      for (const table of ALL_TABLES_CHILD_TO_PARENT) {
        await tx.$executeRawUnsafe(`DELETE FROM public."${table}";`);
      }
      for (const table of parentToChild) {
        await tx.$executeRawUnsafe(
          `INSERT INTO public."${table}" SELECT * FROM "${SNAPSHOT_SCHEMA}"."${table}";`,
        );
      }
      await tx.$executeRawUnsafe(
        `DROP SCHEMA IF EXISTS "${SNAPSHOT_SCHEMA}" CASCADE;`,
      );
    },
    { timeout: 30000 },
  );
}

/**
 * Cleans database tables in cascade-safe order for test cleanup using DELETE FROM
 * to avoid table-level ACCESS EXCLUSIVE locks and concurrency deadlocks,
 * and clears Redis throttler keys so rate limits do not leak across test cases.
 */
export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  await ensureDatabaseSnapshot(prisma);

  for (const table of ALL_TABLES_CHILD_TO_PARENT) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "${table}";`);
    } catch {
      // Safe ignore if table doesn't exist
    }
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
