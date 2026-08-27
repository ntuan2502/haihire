import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { ApplicationsModule } from "./applications/applications.module";
import { AuthModule } from "./auth/auth.module";
import { JobsModule } from "./jobs/jobs.module";
import { MinioModule } from "./minio/minio.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { PrismaService } from "./prisma.service";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MinioModule,
    AuthModule,
    OrganizationsModule,
    JobsModule,
    ApplicationsModule,
  ],
  controllers: [AppController, UsersController],
  providers: [PrismaService, UsersService],
})
export class AppModule {}
