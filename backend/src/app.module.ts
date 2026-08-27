import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { ApplicationsModule } from "./applications/applications.module";
import { JobsModule } from "./jobs/jobs.module";
import { MinioModule } from "./minio/minio.module";
import { PrismaService } from "./prisma.service";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MinioModule,
    JobsModule,
    ApplicationsModule,
  ],
  controllers: [AppController, UsersController],
  providers: [PrismaService, UsersService],
})
export class AppModule {}
