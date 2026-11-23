import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module";
import { WebhookSettingsController } from "./webhook-settings.controller";
import { WebhookSettingsService } from "./webhook-settings.service";

@Module({
  imports: [CommonModule],
  controllers: [WebhookSettingsController],
  providers: [WebhookSettingsService],
  exports: [WebhookSettingsService],
})
export class WebhookSettingsModule {}
