import { NotificationsModule } from "../notifications/notifications.module";
import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module";

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
  imports: [CommonModule, NotificationsModule, ActivitiesModule, EmailModule],
  controllers: [InterviewsController],
  providers: [
    InterviewsService,
    InterviewsQueryService,
    InterviewsScheduleService,
    InterviewsScorecardService,
  ],
  exports: [
    InterviewsService,
    InterviewsQueryService,
    InterviewsScheduleService,
    InterviewsScorecardService,
  ],
})
export class InterviewsModule {}
