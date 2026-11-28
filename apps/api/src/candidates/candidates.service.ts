import { Inject, Injectable } from "@nestjs/common";
import {
  CandidatesCrudService,
  CandidatesDocumentsService,
  CandidatesProfileService,
  CandidatesNotesService,
} from "./services";
import type { CheckCandidateDuplicateSchema } from "@haihire/shared";
import { CreateCandidateDto } from "./dto/create-candidate.dto";
import { UpdateCandidateDto } from "./dto/update-candidate.dto";
import type { CreateCandidateNoteDto } from "./dto/create-candidate-note.dto";
import type { UpdateCandidateNoteDto } from "./dto/update-candidate-note.dto";
import type { AuthenticatedUser } from "./services/candidates-notes.service";

import type { CandidateListOptions } from "./services/candidates-crud.service";

@Injectable()
export class CandidatesService {
  constructor(
    @Inject(CandidatesCrudService)
    private readonly crud: CandidatesCrudService,
    @Inject(CandidatesDocumentsService)
    private readonly documents: CandidatesDocumentsService,
    @Inject(CandidatesProfileService)
    private readonly profile: CandidatesProfileService,
    @Inject(CandidatesNotesService)
    private readonly notes: CandidatesNotesService,
  ) {}

  async listPaginated(
    organizationId?: string,
    options?: CandidateListOptions,
    tenantOrgId?: string | null,
  ) {
    return this.crud.listPaginated(organizationId, options, tenantOrgId);
  }

  async findOne(
    id: string,
    tenantOrgId?: string | null,
    currentUser?: { id?: string; name?: string } | null,
  ) {
    return this.profile.findOne(id, tenantOrgId, currentUser);
  }

  async create(
    dto: CreateCandidateDto,
    file?: Express.Multer.File,
    defaultOrgId?: string,
    actorId?: string | null,
  ) {
    return this.crud.create(dto, file, defaultOrgId, actorId);
  }

  async update(
    id: string,
    dto: UpdateCandidateDto,
    tenantOrgId?: string | null,
    actorId?: string | null,
  ) {
    return this.crud.update(id, dto, tenantOrgId, actorId);
  }

  async uploadDocument(
    id: string,
    file: Express.Multer.File,
    documentType = "Resume",
    tenantOrgId?: string | null,
  ) {
    return this.documents.uploadDocument(id, file, documentType, tenantOrgId);
  }

  async prepareDocumentDownload(
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

  async deleteDocument(
    id: string,
    opts?: { documentId?: string; url?: string },
    tenantOrgId?: string | null,
  ) {
    return this.documents.deleteDocument(id, opts, tenantOrgId);
  }

  async remove(
    id: string,
    tenantOrgId?: string | null,
    actorId?: string | null,
  ) {
    return this.crud.remove(id, tenantOrgId, actorId);
  }

  async checkDuplicates(
    query: CheckCandidateDuplicateSchema,
    tenantOrgId?: string | null,
  ) {
    return this.crud.checkDuplicates(query, tenantOrgId);
  }

  async findNotes(
    candidateId: string,
    tenantOrgOrUser?: string | AuthenticatedUser | null,
  ) {
    return this.notes.findNotes(candidateId, tenantOrgOrUser);
  }

  async createNote(
    candidateId: string,
    dto: CreateCandidateNoteDto,
    user: AuthenticatedUser,
  ) {
    return this.notes.createNote(candidateId, dto, user);
  }

  async updateNote(
    candidateId: string,
    noteId: string,
    dto: UpdateCandidateNoteDto,
    user: AuthenticatedUser,
  ) {
    return this.notes.updateNote(candidateId, noteId, dto, user);
  }

  async deleteNote(
    candidateId: string,
    noteId: string,
    user: AuthenticatedUser,
  ) {
    return this.notes.deleteNote(candidateId, noteId, user);
  }
}
