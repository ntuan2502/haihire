import { Global, Module, Inject, type OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

export const REDIS_CLIENT = "REDIS_CLIENT";

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        const host = config.get<string>("REDIS_HOST", "localhost");
        const port = Number(config.get<number>("REDIS_PORT", 6379));
        const password = config.get<string>("REDIS_PASSWORD") || undefined;

        return new Redis({
          host,
          port,
          password,
          connectTimeout: 2000,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          enableOfflineQueue: true,
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    try {
      await this.redis.quit();
    } catch {
      this.redis.disconnect();
    }
  }
}
