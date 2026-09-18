import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { InterviewsController } from "./interviews.controller";
import { InterviewsService } from "./interviews.service";

import { ActivitiesModule } from "../activities/activities.module";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [ActivitiesModule, EmailModule],
  controllers: [InterviewsController],
  providers: [InterviewsService, PrismaService],
  exports: [InterviewsService],
})
export class InterviewsModule {}
