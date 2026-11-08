import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import crypto from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { toInstant } from "../../common/date.util";
import { parseDomain } from "./sourcing-links.service";

export interface RedisLockClient {
  set(key: string, value: string, mode: "PX", duration: number, flag: "NX"): Promise<string | null>;
  eval(script: string, numKeys: number, key: string, arg: string): Promise<unknown>;
}

@Injectable()
export class SourcingLockService {
  private readonly logger = new Logger(SourcingLockService.name);

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Optional()
    @Inject("REDIS_CLIENT")
    private readonly redis?: RedisLockClient,
  ) {}

  private async withClickLock<T>(
    token: string,
    fn: () => Promise<T>,
    options?: { maxWaitMs?: number; retryIntervalMs?: number; lockTtlMs?: number },
  ): Promise<T> {
    if (!this.redis) {
      this.logger.warn(`Redis client not configured for token ${token}, proceeding without distributed lock`);
      return fn();
    }

    const lockKey = `click:lock:${token}`;
    const lockValue = crypto.randomUUID();
    const LOCK_TTL_MS = options?.lockTtlMs ?? 5000;
    const MAX_WAIT_MS = options?.maxWaitMs ?? 3000;
    const RETRY_INTERVAL_MS = options?.retryIntervalMs ?? 50;

    const start = Date.now();

    while (true) {
      let acquired: string | null = null;
      try {
        acquired = await this.redis.set(
          lockKey,
          lockValue,
          "PX",
          LOCK_TTL_MS,
          "NX",
        );
      } catch (err: unknown) {
        this.logger.warn(
          `Failed to acquire Redis click lock for token ${token}, proceeding without lock: ${err instanceof Error ? err.message : String(err)}`,
        );
        return await fn();
      }

      if (acquired === "OK") {
        try {
          return await fn();
        } finally {
          const releaseScript = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
              return redis.call("del", KEYS[1])
            else
              return 0
            end
          `;
          try {
            await this.redis.eval(releaseScript, 1, lockKey, lockValue);
          } catch (err: unknown) {
            this.logger.error(
              `Failed to release click lock for token ${token}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      }

      if (Date.now() - start > MAX_WAIT_MS) {
        this.logger.warn(
          `Click lock timeout after ${MAX_WAIT_MS}ms for token ${token}, proceeding without lock`,
        );
        return await fn();
      }

      await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL_MS));
    }
  }

  async recordClick(
    token: string,
    referrer?: string,
    ip?: string,
    userAgent?: string,
    lockOptions?: { maxWaitMs?: number; retryIntervalMs?: number; lockTtlMs?: number },
  ): Promise<{ success: boolean; link?: { token: string; source: string; jobId?: string | null } }> {
    if (!token) return { success: false };

    return this.withClickLock(
      token,
      async () => {
        let recordedLink: { token: string; source: string; jobId?: string | null } | null = null;

        await this.prisma.executeTx(async (tx) => {
          const link = await tx.orm.public.TrackingLink.select(
            "id",
            "token",
            "source",
            "jobId",
            "clicksCount",
            "isActive",
            "deletedAt",
          )
            .where((l) => l.token.eq(token))
            .first();

          if (!link || link.deletedAt || !link.isActive) {
            return;
          }

          const domain = parseDomain(referrer);
          const ipHash = ip ? crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16) : null;

          // Atomic update of click counter inside transaction
          await tx.orm.public.TrackingLink.where((l) => l.id.eq(link.id)).update({
            clicksCount: (link.clicksCount || 0) + 1,
            updatedAt: toInstant(),
          });

          // Record click audit log in same atomic transaction
          await tx.orm.public.TrackingClick.create({
            id: crypto.randomUUID(),
            trackingLinkId: link.id,
            referrer: referrer || null,
            referrerDomain: domain,
            ipHash,
            userAgent: userAgent ? userAgent.slice(0, 255) : null,
          });

          recordedLink = {
            token: link.token,
            source: link.source,
            jobId: link.jobId,
          };
        });

        if (!recordedLink) {
          return { success: false };
        }

        return {
          success: true,
          link: recordedLink,
        };
      },
      lockOptions,
    );
  }
}
