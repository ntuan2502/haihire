import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module";
import { AiGenerationService } from "./ai-generation.service";
import { AiSettingsController } from "./ai-settings.controller";
import { AiSettingsService } from "./ai-settings.service";

@Module({
  imports: [CommonModule],
  controllers: [AiSettingsController],
  providers: [AiSettingsService, AiGenerationService],
  exports: [AiSettingsService, AiGenerationService],
})
export class AiModule {}
