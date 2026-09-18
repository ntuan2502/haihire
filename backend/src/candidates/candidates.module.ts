import { Module } from "@nestjs/common";
import { MinioModule } from "../minio/minio.module";
import { PrismaService } from "../prisma/prisma.service";
import { CandidatesController } from "./candidates.controller";
import { CandidatesService } from "./candidates.service";

@Module({
  imports: [MinioModule],
  controllers: [CandidatesController],
  providers: [CandidatesService, PrismaService],
  exports: [CandidatesService],
})
export class CandidatesModule {}
