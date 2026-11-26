import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module";
import { EventsModule } from "../events/events.module";
import { MinioModule } from "../minio/minio.module";
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
    AiSettingsService,
    AiGenerationService,
    AiScoringService,
    AiScoringProcessor,
  ],
  exports: [
    AiSettingsService,
    AiGenerationService,
    AiScoringService,
    BullModule,
  ],
})
export class AiModule {}
