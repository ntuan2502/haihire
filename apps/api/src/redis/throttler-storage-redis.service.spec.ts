import { describe, it, expect, vi, beforeEach } from "vitest";
import { ThrottlerStorageRedisService } from "./throttler-storage-redis.service";
import type Redis from "ioredis";

interface MockRedisClient {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  incr: ReturnType<typeof vi.fn>;
  pexpire: ReturnType<typeof vi.fn>;
  pttl: ReturnType<typeof vi.fn>;
}

describe("ThrottlerStorageRedisService", () => {
  let mockRedis: MockRedisClient;
  let service: ThrottlerStorageRedisService;

  beforeEach(() => {
    mockRedis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue("OK"),
      incr: vi.fn().mockResolvedValue(1),
      pexpire: vi.fn().mockResolvedValue(1),
      pttl: vi.fn().mockResolvedValue(60000),
    };
    service = new ThrottlerStorageRedisService(mockRedis as unknown as Redis);
  });

  it("increments hits on redis and sets pexpire on first hit", async () => {
    const res = await service.increment("user_1", 60000, 10, 0, "default");
    expect(mockRedis.incr).toHaveBeenCalledWith(
      "haihire:throttler:user_1:default",
    );
    expect(mockRedis.pexpire).toHaveBeenCalledWith(
      "haihire:throttler:user_1:default",
      60000,
    );
    expect(res).toEqual({
      totalHits: 1,
      timeToExpire: 60,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
  });

  it("handles blocked requests when hits exceed limit and blockDuration > 0", async () => {
    mockRedis.incr.mockResolvedValue(11);
    const res = await service.increment("user_2", 60000, 10, 15000, "default");

    expect(mockRedis.set).toHaveBeenCalledWith(
      "haihire:throttler:block:user_2:default",
      "1",
      "PX",
      15000,
    );
    expect(res.isBlocked).toBe(true);
    expect(res.totalHits).toBe(11);
    expect(res.timeToBlockExpire).toBe(15);
  });

  it("returns blocked record immediately if already blocked", async () => {
    mockRedis.get.mockResolvedValue("1");
    mockRedis.pttl.mockResolvedValue(8000);

    const res = await service.increment(
      "user_blocked",
      60000,
      10,
      15000,
      "default",
    );

    expect(mockRedis.incr).not.toHaveBeenCalled();
    expect(res.isBlocked).toBe(true);
    expect(res.timeToBlockExpire).toBe(8);
  });

  it("gracefully falls back to in-memory storage when redis throws", async () => {
    mockRedis.incr.mockRejectedValue(new Error("Redis connection lost"));

    const res = await service.increment(
      "user_fallback",
      60000,
      10,
      0,
      "default",
    );
    expect(res.totalHits).toBe(1);
    expect(res.isBlocked).toBe(false);
  });

  it("uses fallback memory storage when redis client is undefined", async () => {
    const fallbackOnlyService = new ThrottlerStorageRedisService(undefined);
    const res = await fallbackOnlyService.increment(
      "user_no_redis",
      60000,
      5,
      0,
      "default",
    );
    expect(res.totalHits).toBe(1);
    expect(res.isBlocked).toBe(false);
  });
});
