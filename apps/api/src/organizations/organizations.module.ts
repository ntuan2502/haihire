import { Module } from "@nestjs/common";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";
import {
  OrganizationsCoreService,
  OrganizationsMembersService,
  OrganizationsInvitesService,
  OrganizationsRolesService,
  OrganizationsAuditLogService,
} from "./services";

import { CommonModule } from "../common/common.module";
import { AuthModule } from "../auth/auth.module";
import { EventsModule } from "../events/events.module";
import { EmailModule } from "../email/email.module";
import { MinioModule } from "../minio/minio.module";

@Module({
  imports: [CommonModule, AuthModule, EventsModule, EmailModule, MinioModule],
  controllers: [OrganizationsController],
  providers: [
    OrganizationsService,
    OrganizationsCoreService,
    OrganizationsMembersService,
    OrganizationsInvitesService,
    OrganizationsRolesService,
  ],
  exports: [
    OrganizationsService,
    OrganizationsRolesService,
    OrganizationsAuditLogService,
  ],
})
export class OrganizationsModule {}
