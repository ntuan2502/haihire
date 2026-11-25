import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";
import {
  AUDIT_LOG_RETENTION_QUEUE,
  AuditLogRetentionProcessor,
} from "./audit-log-retention.processor";
import {
  OrganizationsCoreService,
  OrganizationsMembersService,
  OrganizationsInvitesService,
  OrganizationsRolesService,
} from "./services";

import { CommonModule } from "../common/common.module";
import { AuthModule } from "../auth/auth.module";
import { EventsModule } from "../events/events.module";
import { EmailModule } from "../email/email.module";
import { MinioModule } from "../minio/minio.module";

@Module({
  imports: [
    CommonModule,
    AuthModule,
    EventsModule,
    EmailModule,
    MinioModule,
    BullModule.registerQueue({ name: AUDIT_LOG_RETENTION_QUEUE }),
  ],
  controllers: [OrganizationsController],
  providers: [
    OrganizationsService,
    OrganizationsCoreService,
    OrganizationsMembersService,
    OrganizationsInvitesService,
    OrganizationsRolesService,
    AuditLogRetentionProcessor,
  ],
  exports: [OrganizationsService, OrganizationsRolesService],
})
export class OrganizationsModule {}
