import { Module } from "@nestjs/common";
import { WebhookNotifierService } from "./webhook-notifier.service";

import { EncryptionService } from "../encryption.service";

@Module({
  providers: [WebhookNotifierService, EncryptionService],
  exports: [WebhookNotifierService],
})
export class WebhookModule {}
