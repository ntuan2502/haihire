import { Module } from "@nestjs/common";
import { WebhookModule } from "./webhook/webhook.module";

@Module({
  imports: [WebhookModule],
  exports: [WebhookModule],
})
export class CommonModule {}
