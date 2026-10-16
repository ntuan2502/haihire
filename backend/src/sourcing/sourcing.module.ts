import { Module } from "@nestjs/common";
import { SourcingController } from "./sourcing.controller";
import { SourcingService } from "./sourcing.service";
import {
  SourcingLinksService,
  SourcingLockService,
  SourcingMetricsService,
} from "./services";
import { PrismaModule } from "../prisma/prisma.module";
import { ActivitiesModule } from "../activities/activities.module";
import { RedisModule } from "../redis/redis.module";

@Module({
  imports: [PrismaModule, ActivitiesModule, RedisModule],
  controllers: [SourcingController],
  providers: [
    SourcingService,
    SourcingLinksService,
    SourcingLockService,
    SourcingMetricsService,
  ],
  exports: [SourcingService],
})
export class SourcingModule {}
