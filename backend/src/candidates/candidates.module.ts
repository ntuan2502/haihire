import { Module } from "@nestjs/common";
import { MinioModule } from "../minio/minio.module";
import { ActivitiesModule } from "../activities/activities.module";
import { PrismaService } from "../prisma/prisma.service";
import { CandidatesController } from "./candidates.controller";
import { CandidatesService } from "./candidates.service";

@Module({
  imports: [MinioModule, ActivitiesModule],
  controllers: [CandidatesController],
  providers: [CandidatesService, PrismaService],
  exports: [CandidatesService],
})
export class CandidatesModule {}
