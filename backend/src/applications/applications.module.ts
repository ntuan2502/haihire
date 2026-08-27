import { Module } from "@nestjs/common";
import { MinioModule } from "../minio/minio.module";
import { PrismaService } from "../prisma.service";
import { ApplicationsController } from "./applications.controller";
import { ApplicationsService } from "./applications.service";

@Module({
  imports: [MinioModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, PrismaService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
