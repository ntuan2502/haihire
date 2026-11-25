import { Module } from "@nestjs/common";
import { WebhookModule } from "./webhook/webhook.module";

import { EncryptionService } from "./encryption.service";
import { OrganizationsAuditLogService } from "../organizations/services/organizations-audit-log.service";

@Module({
  imports: [WebhookModule],
  providers: [EncryptionService, OrganizationsAuditLogService],
  exports: [WebhookModule, EncryptionService, OrganizationsAuditLogService],
})
export class CommonModule {}
