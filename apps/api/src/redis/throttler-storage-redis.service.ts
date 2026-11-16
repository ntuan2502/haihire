import { Injectable, Inject, Optional, Logger } from "@nestjs/common";
import type { ThrottlerStorage } from "@nestjs/throttler";
import type { ThrottlerStorageRecord } from "@nestjs/throttler/dist/throttler-storage-record.interface";
import { ThrottlerStorageService } from "@nestjs/throttler";
import type Redis from "ioredis";
import { REDIS_CLIENT } from "./redis.constants";

@Injectable()
export class ThrottlerStorageRedisService implements ThrottlerStorage {
  private readonly logger = new Logger(ThrottlerStorageRedisService.name);
  private readonly fallbackStorage = new ThrottlerStorageService();

  constructor(
    @Optional()
    @Inject(REDIS_CLIENT)
    private readonly redis?: Redis,
  ) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    if (!this.redis) {
      return this.fallbackStorage.increment(
        key,
        ttl,
        limit,
        blockDuration,
        throttlerName,
      );
    }

    try {
      const redisKey = `haihire:throttler:${key}:${throttlerName}`;
      const blockKey = `haihire:throttler:block:${key}:${throttlerName}`;

      if (blockDuration > 0) {
        const isBlocked = await this.redis.get(blockKey);
        if (isBlocked) {
          const pttl = await this.redis.pttl(blockKey);
          return {
            totalHits: limit + 1,
            timeToExpire: Math.max(0, Math.ceil(pttl / 1000)),
            isBlocked: true,
            timeToBlockExpire: Math.max(0, Math.ceil(pttl / 1000)),
          };
        }
      }

      const hits = await this.redis.incr(redisKey);
      if (hits === 1) {
        await this.redis.pexpire(redisKey, ttl);
      }
      let pttl = await this.redis.pttl(redisKey);
      if (pttl < 0) {
        await this.redis.pexpire(redisKey, ttl);
        pttl = ttl;
      }
      const timeToExpire = Math.max(0, Math.ceil(pttl / 1000));
      const isBlocked = hits > limit;

      let timeToBlockExpire = 0;
      if (isBlocked && blockDuration > 0) {
        await this.redis.set(blockKey, "1", "PX", blockDuration);
        timeToBlockExpire = Math.ceil(blockDuration / 1000);
      }

      return {
        totalHits: hits,
        timeToExpire,
        isBlocked,
        timeToBlockExpire,
      };
    } catch (err) {
      this.logger.warn(`Redis throttler failed, using fallback: ${err}`);
      return this.fallbackStorage.increment(
        key,
        ttl,
        limit,
        blockDuration,
        throttlerName,
      );
    }
  }
}
