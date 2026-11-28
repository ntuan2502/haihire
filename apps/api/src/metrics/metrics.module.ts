import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ApplicationsModule } from "../applications/applications.module";
import { EmailModule } from "../email/email.module";
import { AI_SCORING_QUEUE } from "../ai/ai-scoring.service";
import { AUDIT_LOG_RETENTION_QUEUE } from "../organizations/audit-log-retention.processor";
import { MetricsService } from "./metrics.service";

@Module({
  imports: [
    ApplicationsModule,
    EmailModule,
    BullModule.registerQueue(
      { name: AI_SCORING_QUEUE },
      { name: AUDIT_LOG_RETENTION_QUEUE },
    ),
  ],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
