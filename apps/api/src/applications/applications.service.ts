import { Inject, Injectable } from "@nestjs/common";
import type { CandidateDocument } from "@haihire/shared";
import { CreateApplicationDto } from "./dto/create-application.dto";
import { UpdateStageDto } from "./dto/update-stage.dto";
import { UpdateCandidateDto } from "./dto/update-candidate.dto";
import { CreateApplicationNoteDto } from "./dto/create-application-note.dto";
import { UpdateApplicationNoteDto } from "./dto/update-application-note.dto";
import {
  ApplicationsQueryService,
  ApplicationsSagaService,
  ApplicationsStageService,
  ApplicationsDocumentsService,
  ApplicationsNotesService,
  fixUtf8String,
} from "./services";

export { fixUtf8String };
export {
  ApplicationsQueryService,
  ApplicationsSagaService,
  ApplicationsStageService,
  ApplicationsDocumentsService,
  ApplicationsNotesService,
};

@Injectable()
export class ApplicationsService {
  constructor(
    @Inject(ApplicationsQueryService)
    private readonly query: ApplicationsQueryService,
    @Inject(ApplicationsSagaService)
    private readonly saga: ApplicationsSagaService,
    @Inject(ApplicationsStageService)
    private readonly stage: ApplicationsStageService,
    @Inject(ApplicationsDocumentsService)
    private readonly documents: ApplicationsDocumentsService,
    @Inject(ApplicationsNotesService)
    private readonly notes: ApplicationsNotesService,
  ) {}

  // ==========================================
  // 1. QUERY & LIFECYCLE OPERATIONS
  // ==========================================
  findByJob(
    jobId: string,
    organizationId?: string,
    options?: { limit?: number; offset?: number },
  ) {
    return this.query.findByJob(jobId, organizationId, options);
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

  getStats(organizationId?: string, tenantOrgId?: string | null) {
    return this.query.getStats(organizationId, tenantOrgId);
  }

  findOne(id: string, tenantOrgId?: string | null) {
    return this.query.findOne(id, tenantOrgId);
  }

  updateCandidate(
    id: string,
    dto: UpdateCandidateDto,
    tenantOrgId?: string | null,
  ) {
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
  updateStage(
    id: string,
    dto: UpdateStageDto,
    tenantOrgId?: string | null,
    currentUser?: { id?: string; name?: string; role?: string } | null,
  ) {
    return this.stage.updateStage(id, dto, tenantOrgId, currentUser);
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

  // ==========================================
  // 4. NOTE OPERATIONS (Trello-style Comments)
  // ==========================================
  findNotes(applicationId: string, tenantOrgId?: string | null) {
    return this.notes.findNotes(applicationId, tenantOrgId);
  }

  createNote(
    applicationId: string,
    dto: CreateApplicationNoteDto,
    user: {
      id: string;
      name?: string;
      role?: string;
      organizationId?: string | null;
    },
  ) {
    return this.notes.createNote(applicationId, dto, user);
  }

  updateNote(
    applicationId: string,
    noteId: string,
    dto: UpdateApplicationNoteDto,
    user: {
      id: string;
      role?: string;
      isOwner?: boolean;
      organizationId?: string | null;
    },
  ) {
    return this.notes.updateNote(applicationId, noteId, dto, user);
  }

  deleteNote(
    applicationId: string,
    noteId: string,
    user: {
      id: string;
      role?: string;
      isOwner?: boolean;
      organizationId?: string | null;
    },
  ) {
    return this.notes.deleteNote(applicationId, noteId, user);
  }
}
