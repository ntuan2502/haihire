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

import { AuthModule } from "../auth/auth.module";
import { EventsModule } from "../events/events.module";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [AuthModule, EventsModule, EmailModule],
  controllers: [OrganizationsController],
  providers: [
    OrganizationsService,
    OrganizationsCoreService,
    OrganizationsMembersService,
    OrganizationsInvitesService,
    OrganizationsRolesService,
    OrganizationsAuditLogService,
  ],
  exports: [
    OrganizationsService,
    OrganizationsRolesService,
    OrganizationsAuditLogService,
  ],
})
export class OrganizationsModule {}
