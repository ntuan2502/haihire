import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { InterviewsController } from "./interviews.controller";
import { InterviewsService } from "./interviews.service";

@Module({
  controllers: [InterviewsController],
  providers: [InterviewsService, PrismaService],
  exports: [InterviewsService],
})
export class InterviewsModule {}
