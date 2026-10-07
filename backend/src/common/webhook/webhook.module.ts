import { Module } from "@nestjs/common";
import { WebhookNotifierService } from "./webhook-notifier.service";

@Module({
  providers: [WebhookNotifierService],
  exports: [WebhookNotifierService],
})
export class WebhookModule {}
