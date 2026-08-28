import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
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
  findAll() {
    return this.applicationsService.findAll();
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
  ) {
    return this.applicationsService.create(dto, file);
  }

  @Patch(":id/stage")
  updateStage(
    @Param("id") id: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.applicationsService.updateStage(id, dto);
  }

  @Patch(":id")
  updateCandidate(
    @Param("id") id: string,
    @Body() dto: UpdateCandidateDto,
  ) {
    return this.applicationsService.updateCandidate(id, dto);
  }

  @Post(":id/documents")
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
  deleteDocument(
    @Param("id") id: string,
    @Query("documentId") documentId?: string,
    @Query("url") url?: string,
  ) {
    return this.applicationsService.deleteDocument(id, { documentId, url });
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.applicationsService.remove(id);
  }
}
