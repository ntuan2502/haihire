import { Module } from "@nestjs/common";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";
import {
  OrganizationsCoreService,
  OrganizationsMembersService,
  OrganizationsInvitesService,
  OrganizationsRolesService,
} from "./services";
import { PrismaService } from "../prisma/prisma.service";
import { AuthModule } from "../auth/auth.module";
import { EventsModule } from "../events/events.module";

@Module({
  imports: [AuthModule, EventsModule],
  controllers: [OrganizationsController],
  providers: [
    OrganizationsService,
    OrganizationsCoreService,
    OrganizationsMembersService,
    OrganizationsInvitesService,
    OrganizationsRolesService,
    PrismaService,
  ],
  exports: [OrganizationsService, OrganizationsRolesService],
})
export class OrganizationsModule {}
