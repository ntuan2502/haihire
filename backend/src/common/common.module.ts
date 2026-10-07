import { Module } from "@nestjs/common";
import { WebhookModule } from "./webhook/webhook.module";

import { EncryptionService } from "./encryption.service";

@Module({
  imports: [WebhookModule],
  providers: [EncryptionService],
  exports: [WebhookModule, EncryptionService],
})
export class CommonModule {}
