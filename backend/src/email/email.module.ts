import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { ActivitiesModule } from "../activities/activities.module";
import { WebhookModule } from "../common/webhook/webhook.module";
import { EncryptionService } from "../common/encryption.service";
import { EmailController } from "./email.controller";
import { EmailService } from "./email.service";
import {
  EmailProcessor,
  EMAIL_QUEUE_NAME,
  EMAIL_DLQ_NAME,
} from "./email.processor";

@Module({
  imports: [
    ActivitiesModule,
    WebhookModule,
    BullModule.registerQueue(
      {
        name: EMAIL_QUEUE_NAME,
      },
      {
        name: EMAIL_DLQ_NAME,
      },
    ),
  ],
  controllers: [EmailController],
  providers: [PrismaService, EncryptionService, EmailService, EmailProcessor],
  exports: [EmailService, EncryptionService, BullModule],
})
export class EmailModule {}

