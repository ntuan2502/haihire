import {
  Module,
  type MiddlewareConsumer,
  type NestModule,
} from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import path from "node:path";
import { BullModule } from "@nestjs/bullmq";
import { CorrelationIdMiddleware } from "./common/middleware/correlation-id.middleware";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ApplicationsModule } from "./applications/applications.module";
import { CandidatesModule } from "./candidates/candidates.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { InterviewsModule } from "./interviews/interviews.module";
import { AuthModule } from "./auth/auth.module";
import { EventsModule } from "./events/events.module";
import { JobsModule } from "./jobs/jobs.module";
import { MinioModule } from "./minio/minio.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { ActivitiesModule } from "./activities/activities.module";
import { EmailModule } from "./email/email.module";
import { SourcingModule } from "./sourcing/sourcing.module";
import { WebhookSettingsModule } from "./webhook-settings/webhook-settings.module";
import { AiModule } from "./ai/ai.module";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module";
import { TenantRlsInterceptor } from "./common/interceptors/tenant-rls.interceptor";
import { createThrottlerReflectorProviders } from "./common/providers/throttler-reflector.provider";
import { RedisModule, REDIS_CLIENT } from "./redis/redis.module";
import { ThrottlerStorageRedisService } from "./redis/throttler-storage-redis.service";
import type Redis from "ioredis";

import { MetricsModule } from "./metrics/metrics.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(process.cwd(), "..", "..", ".env"),
        path.resolve(process.cwd(), "..", ".env"),
        path.resolve(process.cwd(), ".env"),
        ".env",
      ],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule, RedisModule],
      inject: [ConfigService, REDIS_CLIENT],
      useFactory: (_config: ConfigService, redis: Redis) => ({
        throttlers: [{ ttl: 60000, limit: 100 }],
        storage: new ThrottlerStorageRedisService(redis),
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>("REDIS_HOST", "localhost"),
          port: configService.get<number>("REDIS_PORT", 6379),
          password: configService.get<string>("REDIS_PASSWORD") || undefined,
        },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    RedisModule,
    MinioModule,
    AuthModule,
    EventsModule,
    OrganizationsModule,
    JobsModule,
    ApplicationsModule,
    CandidatesModule,
    InterviewsModule,
    NotificationsModule,
    ActivitiesModule,
    EmailModule,
    SourcingModule,
    WebhookSettingsModule,
    AiModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ...createThrottlerReflectorProviders(),
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantRlsInterceptor,
    },
  ],
  exports: [MetricsModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes("*");
  }
}
