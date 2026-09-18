import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { ActivitiesModule } from "../activities/activities.module";
import { EncryptionService } from "../common/encryption.service";
import { EmailController } from "./email.controller";
import { EmailService } from "./email.service";

@Module({
  imports: [ActivitiesModule],
  controllers: [EmailController],
  providers: [PrismaService, EncryptionService, EmailService],
  exports: [EmailService, EncryptionService],
})
export class EmailModule {}
