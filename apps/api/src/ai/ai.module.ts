import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module";
import { EventsModule } from "../events/events.module";
import { MinioModule } from "../minio/minio.module";
import { AiGatewayService } from "./ai-gateway.service";
import { AiGenerationService } from "./ai-generation.service";
import { AiScoringProcessor } from "./ai-scoring.processor";
import { AI_SCORING_QUEUE, AiScoringService } from "./ai-scoring.service";
import { AiSettingsController } from "./ai-settings.controller";
import { AiSettingsService } from "./ai-settings.service";

@Module({
  imports: [
    CommonModule,
    MinioModule,
    EventsModule,
    BullModule.registerQueue({ name: AI_SCORING_QUEUE }),
  ],
  controllers: [AiSettingsController],
  providers: [
    AiGatewayService,
    AiSettingsService,
    AiGenerationService,
    AiScoringService,
    AiScoringProcessor,
  ],
  exports: [
    AiGatewayService,
    AiSettingsService,
    AiGenerationService,
    AiScoringService,
    BullModule,
  ],
})
export class AiModule {}
