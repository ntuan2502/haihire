import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Optional,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { APP_ERROR_CODES } from "@haihire/shared";
import {
  AppForbiddenException,
  AppNotFoundException,
} from "../common/app-exception";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import type { Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { CandidatesService } from "./candidates.service";
import { CreateCandidateDto } from "./dto/create-candidate.dto";
import { UpdateCandidateDto } from "./dto/update-candidate.dto";
import { fixUtf8String } from "../common/doc-utils";
import { resumeFileFilter } from "../common/upload-utils";
import { MinioService } from "../minio/minio.service";
import { ActivitiesService } from "../activities/activities.service";

@Controller("candidates")
@UseGuards(AuthGuard("jwt"))
export class CandidatesController {
  constructor(
    @Inject(CandidatesService)
    private readonly candidatesService: CandidatesService,
    @Inject(MinioService)
    private readonly minioService: MinioService,
    @Optional()
    @Inject(ActivitiesService)
    private readonly activitiesService?: ActivitiesService,
  ) {}

  @Get()
  findAll(
    @Request() req: { user?: { id?: string; organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
  ) {
    const userOrgId = req?.user?.organizationId || undefined;
    if (organizationId && userOrgId && organizationId !== userOrgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "Access denied: cannot access candidates from another organization.",
      );
    }
    const orgId = userOrgId || organizationId || undefined;
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.candidatesService.findAll(orgId, {
      page: pageNum,
      limit: limitNum,
      search,
    });
  }

  @Get(":id")
  async findOne(
    @Param("id") id: string,
    @Request()
    req: {
      user?: { id?: string; name?: string; organizationId?: string | null };
    },
  ) {
    const candidate = await this.candidatesService.findOne(id);
    const userOrgId = req?.user?.organizationId || undefined;
    if (
      userOrgId &&
      candidate.organizationId &&
      userOrgId !== candidate.organizationId
    ) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "Access denied: candidate belongs to another organization.",
      );
    }

    if (req?.user?.id && this.activitiesService) {
      this.activitiesService
        .createActivity({
          organizationId: candidate.organizationId,
          candidateId: candidate.id,
          type: "NOTE_ADDED",
          title: "PII Access Audit",
          description: `Candidate profile was accessed by ${req.user.name || "recruiter"}`,
          actorId: req.user.id,
          actorName: req.user.name || "Recruiter",
          metadata: { action: "VIEW_PROFILE", accessType: "PII_READ" },
        })
        .catch(() => {});
    }

    return candidate;
  }

  @Post()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @UseInterceptors(
    FileInterceptor("resume", {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
      fileFilter: resumeFileFilter,
    }),
  )
  create(
    @Body() dto: CreateCandidateDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: { user?: { organizationId?: string | null } },
  ) {
    return this.candidatesService.create(
      dto,
      file,
      req?.user?.organizationId || undefined,
    );
  }

  @Patch(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateCandidateDto,
  ) {
    return this.candidatesService.update(id, dto);
  }

  @Post(":id/documents")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
      fileFilter: resumeFileFilter,
    }),
  )
  uploadDocument(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query("type") documentType?: string,
  ) {
    return this.candidatesService.uploadDocument(id, file, documentType);
  }

  @Get(":id/documents/download")
  async downloadDocument(
    @Param("id") id: string,
    @Query("url") targetUrl: string,
    @Query("name") targetName: string,
    @Res() res: Response,
    @Request()
    req: {
      user?: { id?: string; name?: string; organizationId?: string | null };
    },
  ) {
    const candidate = await this.candidatesService.findOne(id);
    if (!candidate) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.CANDIDATE_NOT_FOUND,
        "Candidate not found",
      );
    }

    if (
      req?.user?.organizationId &&
      candidate.organizationId &&
      req.user.organizationId !== candidate.organizationId
    ) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "Access denied: candidate belongs to another organization.",
      );
    }

    const downloadUrl = targetUrl || candidate.resumeUrl;
    if (!downloadUrl) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.DOCUMENT_NOT_FOUND,
        "Document not found",
      );
    }

    // SSRF prevention: Verify that targetUrl belongs to this candidate
    if (targetUrl) {
      const allowedUrls: string[] = [];
      if (candidate.resumeUrl) allowedUrls.push(candidate.resumeUrl);
      if (Array.isArray(candidate.allDocuments)) {
        for (const doc of candidate.allDocuments) {
          if (doc && typeof doc.url === "string") {
            allowedUrls.push(doc.url);
          }
        }
      }

      const targetObj = this.minioService.extractObjectName(targetUrl);
      const isAllowed = allowedUrls.some(
        (u) => u === targetUrl || this.minioService.extractObjectName(u) === targetObj,
      );
      if (!isAllowed) {
        throw new AppForbiddenException(
          APP_ERROR_CODES.FORBIDDEN,
          "Access denied: specified document does not belong to this candidate.",
        );
      }
    }

    const rawName = targetName || candidate.resumeFileName || "document.pdf";
    const cleanFileName = fixUtf8String(rawName);
    const asciiFallback = cleanFileName.replace(/[^\x20-\x7E]/g, "_");
    const encodedFileName = encodeURIComponent(cleanFileName);

    if (req?.user?.id && this.activitiesService) {
      this.activitiesService
        .createActivity({
          organizationId: candidate.organizationId,
          candidateId: candidate.id,
          type: "NOTE_ADDED",
          title: "Document Download Audit",
          description: `Document "${cleanFileName}" was downloaded by ${req.user.name || "recruiter"}`,
          actorId: req.user.id,
          actorName: req.user.name || "Recruiter",
          metadata: {
            action: "DOWNLOAD_DOCUMENT",
            fileName: cleanFileName,
            documentUrl: downloadUrl,
          },
        })
        .catch(() => {});
    }

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFileName}`,
    );
    if (candidate.resumeMimeType) {
      res.setHeader("Content-Type", candidate.resumeMimeType);
    }

    try {
      const stream = await this.minioService.getObjectStream(downloadUrl);
      stream.pipe(res);
    } catch {
      throw new AppNotFoundException(
        APP_ERROR_CODES.DOCUMENT_RETRIEVE_FAILED,
        "Document file could not be retrieved from storage",
      );
    }
  }

  @Delete(":id/documents")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  deleteDocument(
    @Param("id") id: string,
    @Query("documentId") documentId?: string,
    @Query("url") url?: string,
  ) {
    return this.candidatesService.deleteDocument(id, { documentId, url });
  }

  @Delete(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  remove(@Param("id") id: string) {
    return this.candidatesService.remove(id);
  }
}
