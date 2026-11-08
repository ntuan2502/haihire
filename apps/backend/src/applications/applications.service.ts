import {
  Inject,
  Injectable,
  Optional,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import type { CandidateDocument } from "@haihire/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MinioService } from "../minio/minio.service";
import { ActivitiesService } from "../activities/activities.service";
import { EmailService } from "../email/email.service";
import { CreateApplicationDto } from "./dto/create-application.dto";
import { UpdateStageDto } from "./dto/update-stage.dto";
import { UpdateCandidateDto } from "./dto/update-candidate.dto";
import {
  ApplicationsQueryService,
  ApplicationsSagaService,
  ApplicationsStageService,
  ApplicationsDocumentsService,
  fixUtf8String,
} from "./services";

export { fixUtf8String };
export {
  ApplicationsQueryService,
  ApplicationsSagaService,
  ApplicationsStageService,
  ApplicationsDocumentsService,
};

@Injectable()
export class ApplicationsService {
  private readonly query: ApplicationsQueryService;
  private readonly saga: ApplicationsSagaService;
  private readonly stage: ApplicationsStageService;
  private readonly documents: ApplicationsDocumentsService;

  constructor(
    @Optional() @Inject(ApplicationsQueryService) queryOrPrisma?: ApplicationsQueryService | PrismaService,
    @Optional() @Inject(ApplicationsSagaService) sagaOrMinio?: ApplicationsSagaService | MinioService,
    @Optional() @Inject(ApplicationsStageService) stageOrActivities?: ApplicationsStageService | ActivitiesService,
    @Optional() @Inject(ApplicationsDocumentsService) docsOrEmail?: ApplicationsDocumentsService | EmailService,
    @Optional() @InjectQueue("orphan-cleanup-queue") queueOrDocs?: Queue | ApplicationsDocumentsService,
    @Optional() @Inject(MinioService) minioService?: MinioService,
    @Optional() @Inject(ActivitiesService) activitiesService?: ActivitiesService,
    @Optional() @Inject(EmailService) emailService?: EmailService,
  ) {
    if (queryOrPrisma instanceof ApplicationsQueryService) {
      // NestJS Dependency Injection path
      this.query = queryOrPrisma;
      this.saga = sagaOrMinio as ApplicationsSagaService;
      this.stage = stageOrActivities as ApplicationsStageService;
      this.documents = (docsOrEmail as ApplicationsDocumentsService) || (queueOrDocs as ApplicationsDocumentsService);
    } else if (queryOrPrisma) {
      // Direct instantiation support for existing unit & integration tests:
      // new ApplicationsService(mockPrisma, mockMinio, mockActivities, mockEmail, mockQueue?)
      const prisma = queryOrPrisma as PrismaService;
      const minio = (sagaOrMinio ?? minioService) as MinioService;
      const activities = (stageOrActivities ?? activitiesService) as ActivitiesService;
      const email = (docsOrEmail ?? emailService) as EmailService;
      const queue = (queueOrDocs && typeof (queueOrDocs as Queue).add === "function")
        ? (queueOrDocs as Queue)
        : undefined;

      this.query = new ApplicationsQueryService(prisma, activities);
      this.saga = new ApplicationsSagaService(prisma, minio, activities, email, queue, this.query);
      this.stage = new ApplicationsStageService(prisma, activities, email, this.query);
      this.documents = new ApplicationsDocumentsService(prisma, minio, activities, this.query);
    } else {
      throw new Error("ApplicationsService requires dependencies to be injected");
    }
  }

  // ==========================================
  // 1. QUERY & LIFECYCLE OPERATIONS
  // ==========================================
  findByJob(jobId: string, organizationId?: string) {
    return this.query.findByJob(jobId, organizationId);
  }

  findAll(
    organizationId?: string,
    options?: {
      page?: number;
      limit?: number;
      search?: string;
      jobId?: string;
      stage?: string;
    },
    tenantOrgId?: string | null,
  ) {
    return this.query.findAll(organizationId, options, tenantOrgId);
  }

  findOne(id: string, tenantOrgId?: string | null) {
    return this.query.findOne(id, tenantOrgId);
  }

  updateCandidate(id: string, dto: UpdateCandidateDto, tenantOrgId?: string | null) {
    return this.query.updateCandidate(id, dto, tenantOrgId);
  }

  remove(id: string, tenantOrgId?: string | null) {
    return this.query.remove(id, tenantOrgId);
  }

  // ==========================================
  // 2. APPLICATION CREATION SAGA
  // ==========================================
  create(
    dto: CreateApplicationDto,
    file?: Express.Multer.File,
    currentUser?: { role?: string; organizationId?: string | null } | null,
  ) {
    return this.saga.create(dto, file, currentUser);
  }

  // ==========================================
  // 3. STATE MACHINE & STAGE TRANSITIONS
  // ==========================================
  updateStage(id: string, dto: UpdateStageDto, tenantOrgId?: string | null) {
    return this.stage.updateStage(id, dto, tenantOrgId);
  }

  // ==========================================
  // 4. DOCUMENT STORAGE & ATTACHMENTS
  // ==========================================
  uploadDocument(
    id: string,
    file: Express.Multer.File,
    documentType = "Resume",
    tenantOrgId?: string | null,
  ) {
    return this.documents.uploadDocument(id, file, documentType, tenantOrgId);
  }

  prepareDocumentDownload(
    id: string,
    targetUrl?: string,
    targetName?: string,
    tenantOrgId?: string | null,
    currentUser?: { id?: string; name?: string } | null,
  ) {
    return this.documents.prepareDocumentDownload(
      id,
      targetUrl,
      targetName,
      tenantOrgId,
      currentUser,
    );
  }

  deleteDocument(
    id: string,
    opts?: { documentId?: string; url?: string },
    tenantOrgId?: string | null,
  ) {
    return this.documents.deleteDocument(id, opts, tenantOrgId);
  }

  getCandidateDocuments(candidateId: string): Promise<CandidateDocument[]> {
    return this.documents.getCandidateDocuments(candidateId);
  }
}
