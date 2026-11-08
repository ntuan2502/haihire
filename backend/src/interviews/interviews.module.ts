import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { InterviewsController } from "./interviews.controller";
import { InterviewsService } from "./interviews.service";
import {
  InterviewsQueryService,
  InterviewsScheduleService,
  InterviewsScorecardService,
} from "./services";
import { ActivitiesModule } from "../activities/activities.module";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [ActivitiesModule, EmailModule],
  controllers: [InterviewsController],
  providers: [
    InterviewsService,
    InterviewsQueryService,
    InterviewsScheduleService,
    InterviewsScorecardService,
    PrismaService,
  ],
  exports: [
    InterviewsService,
    InterviewsQueryService,
    InterviewsScheduleService,
    InterviewsScorecardService,
  ],
})
export class InterviewsModule {}
