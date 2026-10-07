import { Module } from "@nestjs/common";
import { ApplicationsModule } from "../applications/applications.module";
import { EmailModule } from "../email/email.module";
import { MetricsService } from "./metrics.service";

@Module({
  imports: [ApplicationsModule, EmailModule],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
