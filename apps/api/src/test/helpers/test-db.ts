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

/**
 * Cleans database tables in cascade-safe order for test cleanup using DELETE FROM
 * to avoid table-level ACCESS EXCLUSIVE locks and concurrency deadlocks,
 * and clears Redis throttler keys so rate limits do not leak across test cases.
 */
export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  const tables = [
    "activity_log",
    "application_note",
    "candidate_note",
    "candidate_document",
    "interview",
    "application",
    "candidate",
    "job",
    "tracking_click",
    "tracking_link",
    "organization_role_permission",
    "organization_webhook_setting",
    "organization_audit_log",
    "platform_audit_log",
    "email_log",
    "email_flow_config",
    "email_setting",
    "email_template",
    "invite_link",
    "organization_member",
    "organization",
    "user",
  ];

  for (const table of tables) {
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
