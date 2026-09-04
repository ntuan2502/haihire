import { Module } from "@nestjs/common";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";
import { PrismaService } from "../prisma.service";
import { AuthModule } from "../auth/auth.module";
import { EventsModule } from "../events/events.module";

@Module({
  imports: [AuthModule, EventsModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, PrismaService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
