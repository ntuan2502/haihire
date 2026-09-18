import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { PrismaService } from "../prisma.service";
import { ActivitiesModule } from "../activities/activities.module";
import { EncryptionService } from "../common/encryption.service";
import { EmailController } from "./email.controller";
import { EmailService } from "./email.service";
import { EmailProcessor } from "./email.processor";

@Module({
  imports: [
    ActivitiesModule,
    BullModule.registerQueue({
      name: "email-queue",
    }),
  ],
  controllers: [EmailController],
  providers: [PrismaService, EncryptionService, EmailService, EmailProcessor],
  exports: [EmailService, EncryptionService, BullModule],
})
export class EmailModule {}
