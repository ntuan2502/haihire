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
import { CandidatesService } from "./candidates.service";
import { CreateCandidateDto } from "./dto/create-candidate.dto";
import { UpdateCandidateDto } from "./dto/update-candidate.dto";
import { fixUtf8String } from "../applications/applications.service";

@Controller("candidates")
export class CandidatesController {
  constructor(
    @Inject(CandidatesService)
    private readonly candidatesService: CandidatesService,
  ) {}

  @Get()
  findAll(
    @Request() req: { user?: { id?: string; organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
  ) {
    const orgId = organizationId || req?.user?.organizationId || undefined;
    return this.candidatesService.findAll(orgId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.candidatesService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  @UseInterceptors(
    FileInterceptor("resume", {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
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
  ) {
    const candidate = await this.candidatesService.findOne(id);
    if (!candidate) {
      throw new NotFoundException("Candidate not found");
    }

    const downloadUrl = targetUrl || candidate.resumeUrl;
    if (!downloadUrl) {
      throw new NotFoundException("Document not found");
    }

    const rawName = targetName || candidate.resumeFileName || "document.pdf";
    const cleanFileName = fixUtf8String(rawName);
    const asciiFallback = cleanFileName.replace(/[^\x20-\x7E]/g, "_");
    const encodedFileName = encodeURIComponent(cleanFileName);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFileName}`,
    );
    if (candidate.resumeMimeType) {
      res.setHeader("Content-Type", candidate.resumeMimeType);
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
    return this.candidatesService.deleteDocument(id, { documentId, url });
  }

  @Delete(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  remove(@Param("id") id: string) {
    return this.candidatesService.remove(id);
  }
}
