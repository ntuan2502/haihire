import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { ApplicationsModule } from "./applications/applications.module";
import { CandidatesModule } from "./candidates/candidates.module";
import { InterviewsModule } from "./interviews/interviews.module";
import { AuthModule } from "./auth/auth.module";
import { EventsModule } from "./events/events.module";
import { JobsModule } from "./jobs/jobs.module";
import { MinioModule } from "./minio/minio.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { PrismaService } from "./prisma.service";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

import { ActivitiesModule } from "./activities/activities.module";
import { EmailModule } from "./email/email.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MinioModule,
    AuthModule,
    EventsModule,
    OrganizationsModule,
    JobsModule,
    ApplicationsModule,
    CandidatesModule,
    InterviewsModule,
    ActivitiesModule,
    EmailModule,
  ],
  controllers: [AppController, UsersController],
  providers: [PrismaService, UsersService],
})
export class AppModule {}
