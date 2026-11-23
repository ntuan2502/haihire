import { Module } from "@nestjs/common";
import { MinioModule } from "../minio/minio.module";
import { ActivitiesModule } from "../activities/activities.module";

import { CandidatesController } from "./candidates.controller";
import { CandidatesService } from "./candidates.service";
import {
  CandidatesCrudService,
  CandidatesDocumentsService,
  CandidatesProfileService,
  CandidatesNotesService,
} from "./services";

@Module({
  imports: [MinioModule, ActivitiesModule],
  controllers: [CandidatesController],
  providers: [
    CandidatesService,
    CandidatesCrudService,
    CandidatesDocumentsService,
    CandidatesProfileService,
    CandidatesNotesService,
  ],
  exports: [
    CandidatesService,
    CandidatesCrudService,
    CandidatesDocumentsService,
    CandidatesProfileService,
    CandidatesNotesService,
  ],
})
export class CandidatesModule {}
