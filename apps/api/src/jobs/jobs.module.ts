import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { CommonModule } from "../common/common.module";

import { JobsController } from "./jobs.controller";
import { JobsService } from "./jobs.service";

@Module({
  imports: [CommonModule, AiModule],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
