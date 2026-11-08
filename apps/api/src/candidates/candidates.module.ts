import { Module } from "@nestjs/common";
import { MinioModule } from "../minio/minio.module";
import { ActivitiesModule } from "../activities/activities.module";
import { PrismaService } from "../prisma/prisma.service";
import { CandidatesController } from "./candidates.controller";
import { CandidatesService } from "./candidates.service";
import {
  CandidatesCrudService,
  CandidatesDocumentsService,
  CandidatesProfileService,
} from "./services";

@Module({
  imports: [MinioModule, ActivitiesModule],
  controllers: [CandidatesController],
  providers: [
    CandidatesService,
    CandidatesCrudService,
    CandidatesDocumentsService,
    CandidatesProfileService,
    PrismaService,
  ],
  exports: [
    CandidatesService,
    CandidatesCrudService,
    CandidatesDocumentsService,
    CandidatesProfileService,
  ],
})
export class CandidatesModule {}
