import { describe, it, expect, vi } from "vitest";
import { AppService, type RedisLike } from "./app.service";
import type { PrismaService } from "./prisma/prisma.service";
import type { MinioService } from "./minio/minio.service";

describe("AppService", () => {
  const createMockPrisma = (shouldPass = true) => ({
    db: {
      orm: {
        public: {
          User: {
            select: () => ({
              first: shouldPass
                ? vi.fn().mockResolvedValue({ id: "1" })
                : vi.fn().mockRejectedValue(new Error("DB Down")),
            }),
          },
        },
      },
    },
  });

  const createMockRedis = (shouldPass = true): RedisLike => ({
    ping: shouldPass
      ? vi.fn().mockResolvedValue("PONG")
      : vi.fn().mockRejectedValue(new Error("Redis Down")),
  });

  const createMockMinio = (shouldPass = true) => ({
    checkHealth: shouldPass
      ? vi.fn().mockResolvedValue(true)
      : vi.fn().mockResolvedValue(false),
  });

  it("should return root welcome message", () => {
    const service = new AppService({} as PrismaService);
    expect(service.getRoot()).toEqual({
      message: "hello from create-prisma + nest",
    });
  });

  it("should return ok health status when postgres, redis, and minio are all up", async () => {
    const mockPrisma = createMockPrisma(true);
    const mockRedis = createMockRedis(true);
    const mockMinio = createMockMinio(true);

    const service = new AppService(
      mockPrisma as unknown as PrismaService,
      mockMinio as unknown as MinioService,
      mockRedis,
    );
    const health = await service.getHealth();

    expect(health.status).toBe("ok");
    expect(health.services.postgres).toBe("up");
    expect(health.services.redis).toBe("up");
    expect(health.services.minio).toBe("up");
    expect(health.downServices).toBeUndefined();
    expect(health.timestamp).toBeDefined();
    expect(health.uptime).toBeGreaterThanOrEqual(0);
  });

  it("should return degraded health status when database query fails", async () => {
    const mockPrisma = createMockPrisma(false);
    const mockRedis = createMockRedis(true);
    const mockMinio = createMockMinio(true);

    const service = new AppService(
      mockPrisma as unknown as PrismaService,
      mockMinio as unknown as MinioService,
      mockRedis,
    );
    const health = await service.getHealth();

    expect(health.status).toBe("degraded");
    expect(health.services.postgres).toBe("down");
    expect(health.services.redis).toBe("up");
    expect(health.services.minio).toBe("up");
    expect(health.downServices).toContain("postgres");
  });

  it("should return degraded health status when redis ping fails", async () => {
    const mockPrisma = createMockPrisma(true);
    const mockRedis = createMockRedis(false);
    const mockMinio = createMockMinio(true);

    const service = new AppService(
      mockPrisma as unknown as PrismaService,
      mockMinio as unknown as MinioService,
      mockRedis,
    );
    const health = await service.getHealth();

    expect(health.status).toBe("degraded");
    expect(health.services.postgres).toBe("up");
    expect(health.services.redis).toBe("down");
    expect(health.services.minio).toBe("up");
    expect(health.downServices).toContain("redis");
  });

  it("should return degraded health status when minio bucket check fails", async () => {
    const mockPrisma = createMockPrisma(true);
    const mockRedis = createMockRedis(true);
    const mockMinio = createMockMinio(false);

    const service = new AppService(
      mockPrisma as unknown as PrismaService,
      mockMinio as unknown as MinioService,
      mockRedis,
    );
    const health = await service.getHealth();

    expect(health.status).toBe("degraded");
    expect(health.services.postgres).toBe("up");
    expect(health.services.redis).toBe("up");
    expect(health.services.minio).toBe("down");
    expect(health.downServices).toContain("minio");
  });
});
