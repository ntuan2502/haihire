import { Inject, Injectable, Optional } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MinioService } from "../minio/minio.service";
import { ActivitiesService } from "../activities/activities.service";
import {
  CandidatesCrudService,
  CandidatesDocumentsService,
  CandidatesProfileService,
  CandidatesNotesService,
} from "./services";
import { CreateCandidateDto } from "./dto/create-candidate.dto";
import { UpdateCandidateDto } from "./dto/update-candidate.dto";
import type { CreateCandidateNoteDto } from "./dto/create-candidate-note.dto";
import type { UpdateCandidateNoteDto } from "./dto/update-candidate-note.dto";
import type { AuthenticatedUser } from "./services/candidates-notes.service";

@Injectable()
export class CandidatesService {
  private readonly crud: CandidatesCrudService;
  private readonly documents: CandidatesDocumentsService;
  private readonly profile: CandidatesProfileService;
  private readonly notes: CandidatesNotesService;

  constructor(
    @Optional()
    @Inject(CandidatesCrudService)
    crudOrPrisma?: CandidatesCrudService | PrismaService,
    @Optional()
    @Inject(CandidatesDocumentsService)
    docsOrMinio?: CandidatesDocumentsService | MinioService,
    @Optional()
    @Inject(CandidatesProfileService)
    profileOrActivities?: CandidatesProfileService | ActivitiesService,
    @Optional()
    @Inject(ActivitiesService)
    legacyActivities?: ActivitiesService,
    @Optional()
    @Inject(CandidatesNotesService)
    notesService?: CandidatesNotesService,
  ) {
    if (
      crudOrPrisma &&
      "findAll" in crudOrPrisma &&
      typeof (crudOrPrisma as CandidatesCrudService).findAll === "function"
    ) {
      // NestJS DI path
      this.crud = crudOrPrisma as CandidatesCrudService;
      this.documents = docsOrMinio as CandidatesDocumentsService;
      this.profile = profileOrActivities as CandidatesProfileService;
      this.notes = notesService as CandidatesNotesService;
    } else {
      // Direct instantiation path (legacy tests & standalone usage)
      const prisma = crudOrPrisma as PrismaService;
      const minio = docsOrMinio as MinioService;
      const activities =
        (profileOrActivities as ActivitiesService) || legacyActivities;

      this.profile = new CandidatesProfileService(prisma, activities);
      this.documents = new CandidatesDocumentsService(
        prisma,
        minio,
        this.profile,
        activities,
      );
      this.crud = new CandidatesCrudService(prisma, minio, this.profile);
      this.notes = new CandidatesNotesService(prisma, activities);
    }
  }

  async findAll(
    organizationId?: string,
    options?: { page?: number; limit?: number; search?: string },
    tenantOrgId?: string | null,
  ) {
    return this.crud.findAll(organizationId, options, tenantOrgId);
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
  ) {
    return this.crud.create(dto, file, defaultOrgId);
  }

  async update(
    id: string,
    dto: UpdateCandidateDto,
    tenantOrgId?: string | null,
  ) {
    return this.crud.update(id, dto, tenantOrgId);
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

  async remove(id: string, tenantOrgId?: string | null) {
    return this.crud.remove(id, tenantOrgId);
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
