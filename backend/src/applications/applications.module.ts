import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { MinioModule } from "../minio/minio.module";
import { PrismaService } from "../prisma/prisma.service";
import { ApplicationsController } from "./applications.controller";
import { ApplicationsService } from "./applications.service";
import {
  OrphanCleanupProcessor,
  ORPHAN_CLEANUP_QUEUE,
  ORPHAN_CLEANUP_DLQ,
} from "./orphan-cleanup.processor";

import { ActivitiesModule } from "../activities/activities.module";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [
    MinioModule,
    ActivitiesModule,
    EmailModule,
    BullModule.registerQueue(
      { name: ORPHAN_CLEANUP_QUEUE },
      { name: ORPHAN_CLEANUP_DLQ },
    ),
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, PrismaService, OrphanCleanupProcessor],
  exports: [ApplicationsService, BullModule],
})
export class ApplicationsModule {}
