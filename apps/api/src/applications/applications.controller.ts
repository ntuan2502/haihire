import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Optional,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Throttle } from "@nestjs/throttler";
import { RolesGuard } from "../auth/roles.guard";
import { RequirePermission } from "../auth/require-permission.decorator";
import type { Response } from "express";
import { AnyFilesInterceptor, FileInterceptor } from "@nestjs/platform-express";
import { ApplicationsService } from "./applications.service";
import { AiScoringService } from "../ai/ai-scoring.service";
import { PublicApplyDto } from "./dto/public-apply.dto";
import { QueryApplicationsDto } from "./dto/query-applications.dto";
import { UpdateStageDto } from "./dto/update-stage.dto";
import { UpdateCandidateDto } from "./dto/update-candidate.dto";
import { CreateApplicationNoteDto } from "./dto/create-application-note.dto";
import { UpdateApplicationNoteDto } from "./dto/update-application-note.dto";
import { resumeFileFilter } from "../common/upload-utils";
import { DtoPipe } from "../common/dto-validation.pipe";
import { ActiveTenantGuard } from "../common/guards/active-tenant.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { OptionalJwtAuthGuard } from "../auth/optional-jwt-auth.guard";
import { AppBadRequestException } from "../common/app-exception";
import {
  APP_ERROR_CODES,
  batchAiScoreSchema,
  hasPermission,
  Role,
  type BatchAiScoreInput,
} from "@haihire/shared";
import { PermissionResolverService } from "../auth/permission-resolver.service";

@Controller("applications")
export class ApplicationsController {
  constructor(
    @Inject(ApplicationsService)
    private readonly applicationsService: ApplicationsService,
    @Optional()
    @Inject(PermissionResolverService)
    private readonly permissionResolver?: PermissionResolverService,
    @Optional()
    @Inject(AiScoringService)
    private readonly aiScoringService?: AiScoringService,
  ) {}

  private async resolveCandidateAccess(
    req?: {
      user?: {
        id?: string;
        role?: string;
        isOwner?: boolean;
        organizationId?: string | null;
      };
    },
    fallbackOrgId?: string,
  ): Promise<boolean> {
    const user = req?.user;
    if (!user) return false;
    if (user.isOwner) return true;
    const tenantOrgId = user.organizationId || fallbackOrgId;
    if (this.permissionResolver && tenantOrgId) {
      return this.permissionResolver.resolvePermission(
        tenantOrgId,
        user.role as Role,
        "candidate:view",
      );
    }
    return hasPermission(user.role || "", "candidate:view");
  }

  @Get()
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, TenantGuard, RolesGuard)
  @RequirePermission("application:view")
  async listPaginated(
    @Request()
    req: {
      user?: {
        id?: string;
        role?: string;
        isOwner?: boolean;
        organizationId?: string | null;
      };
    },
    @Query(DtoPipe(QueryApplicationsDto)) query?: QueryApplicationsDto,
  ) {
    const fullCandidateAccess = await this.resolveCandidateAccess(
      req,
      query?.organizationId,
    );
    return this.applicationsService.listPaginated(
      query?.organizationId,
      {
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        jobId: query?.jobId,
        stage: query?.stage,
        score: query?.score,
        sortBy: query?.sortBy,
        sortOrder: query?.sortOrder,
      },
      req?.user?.organizationId,
      fullCandidateAccess,
    );
  }

  @Get("stats")
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, TenantGuard, RolesGuard)
  @RequirePermission("application:view")
  getStats(
    @Request() req: { user?: { id?: string; organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
  ) {
    return this.applicationsService.getStats(
      organizationId,
      req?.user?.organizationId,
    );
  }

  @Get("job/:jobId")
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
  @RequirePermission("application:view")
  async findByJob(
    @Param("jobId", new ParseUUIDPipe()) jobId: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Request()
    req?: {
      user?: {
        id?: string;
        role?: string;
        isOwner?: boolean;
        organizationId?: string | null;
      };
    },
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    const parsedOffset = offset ? Number.parseInt(offset, 10) : undefined;
    const fullCandidateAccess = await this.resolveCandidateAccess(req);
    return this.applicationsService.findByJob(
      jobId,
      req?.user?.organizationId || undefined,
      {
        limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
        offset: Number.isFinite(parsedOffset) ? parsedOffset : undefined,
      },
      fullCandidateAccess,
    );
  }

  @Post("job/:jobId/ai-score-batch")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
  @RequirePermission("application:update")
  async triggerJobBatchAiScore(
    @Param("jobId", new ParseUUIDPipe()) jobId: string,
    @Body(DtoPipe(batchAiScoreSchema)) dto: BatchAiScoreInput,
    @Request() req: { user?: { organizationId?: string | null } },
  ) {
    const organizationId = req?.user?.organizationId;
    if (!organizationId || !this.aiScoringService) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.AI_NOT_CONFIGURED,
        "AI scoring is not available for this organization.",
      );
    }
    return this.aiScoringService.enqueueJobPendingScores(
      organizationId,
      jobId,
      dto.limit,
    );
  }

  @Post(":id/ai-score")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
  @RequirePermission("application:update")
  async triggerApplicationAiScore(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Request() req: { user?: { organizationId?: string | null } },
  ) {
    const organizationId = req?.user?.organizationId;
    if (!organizationId || !this.aiScoringService) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.AI_NOT_CONFIGURED,
        "AI scoring is not available for this organization.",
      );
    }
    return this.aiScoringService.enqueueApplicationScore(organizationId, id);
  }

  @Get(":id")
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
  @RequirePermission("application:view")
  async findOne(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Request()
    req: {
      user?: {
        id?: string;
        role?: string;
        isOwner?: boolean;
        organizationId?: string | null;
      };
    },
  ) {
    const fullCandidateAccess = await this.resolveCandidateAccess(req);
    return this.applicationsService.findOne(
      id,
      req?.user?.organizationId,
      fullCandidateAccess,
    );
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post("apply")
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(
    AnyFilesInterceptor({
      limits: { fileSize: 10 * 1024 * 1024, files: 12 }, // 10MB per file, up to 12 attachments
      fileFilter: resumeFileFilter,
    }),
  )
  create(
    @Body(DtoPipe(PublicApplyDto)) dto: PublicApplyDto,
    @UploadedFiles()
    files: Express.Multer.File[],
    @Request()
    req?: {
      user?: {
        id?: string;
        role?: string;
        organizationId?: string | null;
        isOwner?: boolean;
      } | null;
    },
  ) {
    if (
      !req?.user &&
      (dto.candidateId || dto.resumeUrl || dto.resumeFileName)
    ) {
      throw new AppBadRequestException(
        APP_ERROR_CODES.VALIDATION_ERROR,
        "Administrative fields (candidateId, resumeUrl, resumeFileName) are not permitted for public applications.",
      );
    }
    const uploadedFiles = Array.isArray(files) ? files : [];
    const uploaded =
      uploadedFiles.find((f) => f.fieldname === "resume") ||
      uploadedFiles.find((f) => f.fieldname === "file");

    const screeningFiles = new Map<string, Express.Multer.File>();
    for (const f of uploadedFiles) {
      if (f.fieldname?.startsWith("screeningFile:")) {
        const qId = f.fieldname.slice("screeningFile:".length).trim();
        if (qId && !screeningFiles.has(qId)) {
          screeningFiles.set(qId, f);
        }
      }
    }

    return this.applicationsService.create(
      dto,
      uploaded,
      req?.user,
      screeningFiles.size > 0 ? screeningFiles : undefined,
    );
  }

  @Patch(":id/stage")
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
  @RequirePermission("application:update_stage")
  updateStage(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(DtoPipe(UpdateStageDto)) dto: UpdateStageDto,
    @Request()
    req?: {
      user?: {
        id?: string;
        name?: string;
        role?: string;
        organizationId?: string | null;
      };
    },
  ) {
    return this.applicationsService.updateStage(
      id,
      dto,
      req?.user?.organizationId,
      req?.user,
    );
  }

  @Patch(":id")
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
  @RequirePermission("application:update")
  updateCandidate(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(DtoPipe(UpdateCandidateDto)) dto: UpdateCandidateDto,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    return this.applicationsService.updateCandidate(
      id,
      dto,
      req?.user?.organizationId,
    );
  }

  @Post(":id/documents")
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
  @RequirePermission("application:document_upload")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
      fileFilter: resumeFileFilter,
    }),
  )
  uploadDocument(
    @Param("id", new ParseUUIDPipe()) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query("type") documentType?: string,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    return this.applicationsService.uploadDocument(
      id,
      file,
      documentType,
      req?.user?.organizationId,
    );
  }

  @Get(":id/documents/download")
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
  @RequirePermission("application:document_download")
  async downloadDocument(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query("url") targetUrl: string,
    @Query("name") targetName: string,
    @Res() res: Response,
    @Request()
    req: {
      user?: { id?: string; name?: string; organizationId?: string | null };
    },
    @Query("disposition") disposition?: string,
  ) {
    const { asciiFallback, encodedFileName, mimeType, stream } =
      await this.applicationsService.prepareDocumentDownload(
        id,
        targetUrl,
        targetName,
        req?.user?.organizationId,
        req?.user,
      );

    const safeAsciiFallback = asciiFallback.replace(
      /[^\x20-\x7E]|["\\;]/g,
      "_",
    );
    const dispType = disposition === "inline" ? "inline" : "attachment";
    res.setHeader(
      "Content-Disposition",
      `${dispType}; filename="${safeAsciiFallback}"; filename*=UTF-8''${encodedFileName}`,
    );
    if (mimeType) {
      res.setHeader("Content-Type", mimeType);
    }

    if (typeof stream.on === "function") {
      stream.on("error", (err) => {
        if (!res.headersSent) {
          res.status(502).end();
        } else if (typeof res.destroy === "function") {
          res.destroy(err instanceof Error ? err : undefined);
        }
      });
    }
    if (typeof res.on === "function") {
      res.on("close", () => {
        const destroyable = stream as { destroy?: () => void };
        if (!res.writableEnded && typeof destroyable.destroy === "function") {
          destroyable.destroy();
        }
      });
    }

    stream.pipe(res);
  }

  @Delete(":id/documents")
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
  @RequirePermission("application:document_delete")
  deleteDocument(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query("documentId") documentId?: string,
    @Query("url") url?: string,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    return this.applicationsService.deleteDocument(
      id,
      { documentId, url },
      req?.user?.organizationId,
    );
  }

  @Delete(":id")
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
  @RequirePermission("application:delete")
  remove(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Request() req?: { user?: { id?: string; organizationId?: string | null } },
  ) {
    return this.applicationsService.remove(
      id,
      req?.user?.organizationId,
      req?.user?.id,
    );
  }

  // ==========================================
  // NOTE ENDPOINTS (Trello-style Comments)
  // ==========================================
  @Get(":id/notes")
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
  @RequirePermission("application:view")
  findNotes(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    return this.applicationsService.findNotes(id, req?.user?.organizationId);
  }

  @Post(":id/notes")
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
  @RequirePermission("application:update")
  createNote(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(DtoPipe(CreateApplicationNoteDto)) dto: CreateApplicationNoteDto,
    @Request()
    req: {
      user: {
        id: string;
        name?: string;
        role?: string;
        organizationId?: string | null;
      };
    },
  ) {
    return this.applicationsService.createNote(id, dto, req.user);
  }

  @Patch(":id/notes/:noteId")
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
  @RequirePermission("application:update")
  updateNote(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("noteId", new ParseUUIDPipe()) noteId: string,
    @Body(DtoPipe(UpdateApplicationNoteDto)) dto: UpdateApplicationNoteDto,
    @Request()
    req: {
      user: {
        id: string;
        role?: string;
        isOwner?: boolean;
        organizationId?: string | null;
      };
    },
  ) {
    return this.applicationsService.updateNote(id, noteId, dto, req.user);
  }

  @Delete(":id/notes/:noteId")
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
  @RequirePermission("application:update")
  deleteNote(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("noteId", new ParseUUIDPipe()) noteId: string,
    @Request()
    req: {
      user: {
        id: string;
        role?: string;
        isOwner?: boolean;
        organizationId?: string | null;
      };
    },
  ) {
    return this.applicationsService.deleteNote(id, noteId, req.user);
  }
}
