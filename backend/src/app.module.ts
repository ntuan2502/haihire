import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ApplicationsModule } from "./applications/applications.module";
import { CandidatesModule } from "./candidates/candidates.module";
import { InterviewsModule } from "./interviews/interviews.module";
import { AuthModule } from "./auth/auth.module";
import { EventsModule } from "./events/events.module";
import { JobsModule } from "./jobs/jobs.module";
import { MinioModule } from "./minio/minio.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { ActivitiesModule } from "./activities/activities.module";
import { EmailModule } from "./email/email.module";
import { UsersModule } from "./users/users.module";
import { SourcingModule } from "./sourcing/sourcing.module";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module";

// Resolve ThrottlerGuard parameter token to bridge CJS/ESM dual package hazard under tsx in dev
const throttlerParamTypes = (Reflect.getMetadata("design:paramtypes", ThrottlerGuard) as (new (...args: unknown[]) => unknown)[]) || [];
const throttlerReflectorToken = throttlerParamTypes[2] || Reflector;

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
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
    MinioModule,
    AuthModule,
    EventsModule,
    OrganizationsModule,
    JobsModule,
    ApplicationsModule,
    CandidatesModule,
    InterviewsModule,
    ActivitiesModule,
    EmailModule,
    UsersModule,
    SourcingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ...(throttlerReflectorToken !== Reflector
      ? [{ provide: throttlerReflectorToken, useExisting: Reflector }]
      : []),
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

