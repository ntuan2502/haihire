import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
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
import { ApplicationsService, fixUtf8String } from "./applications.service";
import { CreateApplicationDto } from "./dto/create-application.dto";
import { UpdateStageDto } from "./dto/update-stage.dto";
import { UpdateCandidateDto } from "./dto/update-candidate.dto";

@Controller("applications")
export class ApplicationsController {
  constructor(
    @Inject(ApplicationsService)
    private readonly applicationsService: ApplicationsService,
  ) {}

  @Get()
  findAll(
    @Request() req: { user?: { id?: string; organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("jobId") jobId?: string,
    @Query("stage") stage?: string,
  ) {
    const orgId = organizationId || req?.user?.organizationId || undefined;
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
  findByJob(@Param("jobId") jobId: string) {
    return this.applicationsService.findByJob(jobId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.applicationsService.findOne(id);
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
      throw new ForbiddenException(
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
  async downloadDocument(
    @Param("id") id: string,
    @Query("url") targetUrl: string,
    @Query("name") targetName: string,
    @Res() res: Response,
  ) {
    const app = await this.applicationsService.findOne(id);
    if (!app) {
      throw new NotFoundException("Application not found");
    }

    const downloadUrl = targetUrl || app.resumeUrl;
    if (!downloadUrl) {
      throw new NotFoundException("Document not found");
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

    if (
      downloadUrl.startsWith("http://") ||
      downloadUrl.startsWith("https://")
    ) {
      const upstream = await fetch(downloadUrl);
      if (!upstream.ok) {
        throw new NotFoundException("Document file could not be retrieved");
      }
      const buffer = Buffer.from(await upstream.arrayBuffer());
      return res.send(buffer);
    }

    return res.redirect(downloadUrl);
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
