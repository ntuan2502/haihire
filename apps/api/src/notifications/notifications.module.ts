import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";

import { EmailModule } from "../email/email.module";
import { AuthModule } from "../auth/auth.module";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [AuthModule, EmailModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
