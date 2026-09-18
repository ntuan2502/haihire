import { Module } from "@nestjs/common";
import { MinioModule } from "../minio/minio.module";
import { PrismaService } from "../prisma.service";
import { ApplicationsController } from "./applications.controller";
import { ApplicationsService } from "./applications.service";

import { ActivitiesModule } from "../activities/activities.module";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [MinioModule, ActivitiesModule, EmailModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, PrismaService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
