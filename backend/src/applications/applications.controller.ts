import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
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
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import type { Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { APP_ERROR_CODES } from "@haihire/shared";
import {
  AppForbiddenException,
  AppNotFoundException,
} from "../common/app-exception";
import {
  ApplicationsService,
  extractDocsFromNotes,
  fixUtf8String,
} from "./applications.service";
import { CreateApplicationDto } from "./dto/create-application.dto";
import { UpdateStageDto } from "./dto/update-stage.dto";
import { UpdateCandidateDto } from "./dto/update-candidate.dto";
import { MinioService } from "../minio/minio.service";

@Controller("applications")
export class ApplicationsController {
  constructor(
    @Inject(ApplicationsService)
    private readonly applicationsService: ApplicationsService,
    @Inject(MinioService)
    private readonly minioService: MinioService,
  ) {}

  @Get()
  @UseGuards(AuthGuard("jwt"))
  findAll(
    @Request() req: { user?: { id?: string; organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("jobId") jobId?: string,
    @Query("stage") stage?: string,
  ) {
    const userOrgId = req?.user?.organizationId || undefined;
    if (organizationId && userOrgId && organizationId !== userOrgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "Access denied: cannot access applications from another organization.",
      );
    }
    const orgId = userOrgId || organizationId || undefined;
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.applicationsService.findAll(orgId, {
      page: pageNum,
      limit: limitNum,
      search,
      jobId,
      stage,
    });
  }

  @Get("job/:jobId")
  @UseGuards(AuthGuard("jwt"))
  findByJob(@Param("jobId") jobId: string) {
    return this.applicationsService.findByJob(jobId);
  }

  @Get(":id")
  @UseGuards(AuthGuard("jwt"))
  async findOne(
    @Param("id") id: string,
    @Request() req: { user?: { organizationId?: string | null } },
  ) {
    const app = await this.applicationsService.findOne(id);
    const appOrgId =
      app?.job?.organizationId ||
      (app as unknown as { organizationId?: string })?.organizationId;
    if (
      req?.user?.organizationId &&
      appOrgId &&
      req.user.organizationId !== appOrgId
    ) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "Access denied: application belongs to another organization.",
      );
    }
    return app;
  }

  @Post("apply")
  @UseInterceptors(
    FileInterceptor("resume", {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    }),
  )
  create(
    @Body() dto: CreateApplicationDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req?: { user?: { id?: string; role?: string; organizationId?: string | null } },
  ) {
    if (req?.user?.role === "MEMBER") {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
        "Members have read-only access. Only Admins can perform this action.",
      );
    }
    return this.applicationsService.create(dto, file);
  }

  @Patch(":id/stage")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  updateStage(
    @Param("id") id: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.applicationsService.updateStage(id, dto);
  }

  @Patch(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  updateCandidate(
    @Param("id") id: string,
    @Body() dto: UpdateCandidateDto,
  ) {
    return this.applicationsService.updateCandidate(id, dto);
  }

  @Post(":id/documents")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    }),
  )
  uploadDocument(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query("type") documentType?: string,
  ) {
    return this.applicationsService.uploadDocument(id, file, documentType);
  }

  @Get(":id/documents/download")
  @UseGuards(AuthGuard("jwt"))
  async downloadDocument(
    @Param("id") id: string,
    @Query("url") targetUrl: string,
    @Query("name") targetName: string,
    @Res() res: Response,
    @Request() req: { user?: { organizationId?: string | null } },
  ) {
    const app = await this.applicationsService.findOne(id);
    if (!app) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.APPLICATION_NOT_FOUND,
        "Application not found",
      );
    }

    const appOrgId =
      app?.job?.organizationId ||
      (app as unknown as { organizationId?: string })?.organizationId;
    if (
      req?.user?.organizationId &&
      appOrgId &&
      req.user.organizationId !== appOrgId
    ) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "Access denied: application belongs to another organization.",
      );
    }

    const downloadUrl = targetUrl || app.resumeUrl;
    if (!downloadUrl) {
      throw new AppNotFoundException(
        APP_ERROR_CODES.DOCUMENT_NOT_FOUND,
        "Document not found",
      );
    }

    // SSRF prevention: Verify that targetUrl belongs to this application
    if (targetUrl) {
      const allowedUrls: string[] = [];
      if (app.resumeUrl) allowedUrls.push(app.resumeUrl);
      if (app.candidate?.resumeUrl) allowedUrls.push(app.candidate.resumeUrl);
      const docs = extractDocsFromNotes(app.notes);
      for (const doc of docs) {
        if (doc && typeof doc.url === "string") {
          allowedUrls.push(doc.url);
        }
      }

      const targetObj = this.minioService.extractObjectName(targetUrl);
      const isAllowed = allowedUrls.some(
        (u) => u === targetUrl || this.minioService.extractObjectName(u) === targetObj,
      );
      if (!isAllowed) {
        throw new AppForbiddenException(
          APP_ERROR_CODES.FORBIDDEN,
          "Access denied: specified document does not belong to this application.",
        );
      }
    }

    const rawName = targetName || app.resumeFileName || "document.pdf";
    const cleanFileName = fixUtf8String(rawName);
    const asciiFallback = cleanFileName.replace(/[^\x20-\x7E]/g, "_");
    const encodedFileName = encodeURIComponent(cleanFileName);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFileName}`,
    );
    if (app.resumeMimeType) {
      res.setHeader("Content-Type", app.resumeMimeType);
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
    return this.applicationsService.deleteDocument(id, { documentId, url });
  }

  @Delete(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  remove(@Param("id") id: string) {
    return this.applicationsService.remove(id);
  }
}
