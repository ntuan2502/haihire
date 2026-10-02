import { Injectable, Inject, Optional } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";
import { MinioService } from "./minio/minio.service";
import Redis from "ioredis";

export interface RedisLike {
  ping(): Promise<string>;
}

export interface HealthCheckResult {
  status: "ok" | "degraded";
  timestamp: string;
  uptime: number;
  services: {
    postgres: "up" | "down";
    redis: "up" | "down";
    minio: "up" | "down";
  };
  downServices?: string[];
}

@Injectable()
export class AppService {
  private defaultRedis?: Redis;

  constructor(
    @Inject(PrismaService)
    private readonly prismaService: PrismaService,
    @Optional()
    @Inject(MinioService)
    private readonly minioService?: MinioService,
    @Optional()
    @Inject("REDIS_CLIENT")
    private readonly customRedis?: RedisLike,
  ) {}

  private getRedis(): RedisLike {
    if (this.customRedis) {
      return this.customRedis;
    }
    if (!this.defaultRedis) {
      const host = process.env.REDIS_HOST || "localhost";
      const port = Number(process.env.REDIS_PORT || 16379);
      const password = process.env.REDIS_PASSWORD || undefined;
      this.defaultRedis = new Redis({
        host,
        port,
        password,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });
    }
    return this.defaultRedis;
  }

  getRoot() {
    return {
      message: "hello from create-prisma + nest",
    };
  }

  async getHealth(): Promise<HealthCheckResult> {
    let postgresStatus: "up" | "down" = "up";
    let redisStatus: "up" | "down" = "up";
    let minioStatus: "up" | "down" = "up";
    const downServices: string[] = [];

    // 1. PostgreSQL check
    try {
      await this.prismaService.db.orm.public.User.select("id").first();
    } catch {
      postgresStatus = "down";
      downServices.push("postgres");
    }

    // 2. Redis ping
    try {
      const redis = this.getRedis();
      const pong = await redis.ping();
      if (pong !== "PONG") {
        redisStatus = "down";
        downServices.push("redis");
      }
    } catch {
      redisStatus = "down";
      downServices.push("redis");
    }

    // 3. MinIO bucket check
    try {
      if (this.minioService) {
        const isMinioUp = await this.minioService.checkHealth();
        if (!isMinioUp) {
          minioStatus = "down";
          downServices.push("minio");
        }
      }
    } catch {
      minioStatus = "down";
      downServices.push("minio");
    }

    const isAllOk = postgresStatus === "up" && redisStatus === "up" && minioStatus === "up";

    return {
      status: isAllOk ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        postgres: postgresStatus,
        redis: redisStatus,
        minio: minioStatus,
      },
      ...(downServices.length > 0 ? { downServices } : {}),
    };
  }
}

