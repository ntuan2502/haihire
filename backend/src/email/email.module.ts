import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { ActivitiesModule } from "../activities/activities.module";
import { EmailController } from "./email.controller";
import { EmailService } from "./email.service";

@Module({
  imports: [ActivitiesModule],
  controllers: [EmailController],
  providers: [PrismaService, EmailService],
  exports: [EmailService],
})
export class EmailModule {}
