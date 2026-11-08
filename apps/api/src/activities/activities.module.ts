import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ActivitiesController } from "./activities.controller";
import { ActivitiesService } from "./activities.service";

@Module({
  controllers: [ActivitiesController],
  providers: [PrismaService, ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
