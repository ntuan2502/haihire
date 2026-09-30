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
import { CandidatesService } from "./candidates.service";
import { CreateCandidateDto } from "./dto/create-candidate.dto";
import { UpdateCandidateDto } from "./dto/update-candidate.dto";
import { resumeFileFilter } from "../common/upload-utils";

@Controller("candidates")
@UseGuards(AuthGuard("jwt"))
export class CandidatesController {
  constructor(
    @Inject(CandidatesService)
    private readonly candidatesService: CandidatesService,
  ) {}

  @Get()
  findAll(
    @Request() req: { user?: { id?: string; organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.candidatesService.findAll(
      organizationId,
      {
        page: pageNum,
        limit: limitNum,
        search,
      },
      req?.user?.organizationId,
    );
  }

  @Get(":id")
  findOne(
    @Param("id") id: string,
    @Request()
    req: {
      user?: { id?: string; name?: string; organizationId?: string | null };
    },
  ) {
    return this.candidatesService.findOne(id, req?.user?.organizationId, req?.user);
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
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    return this.candidatesService.update(id, dto, req?.user?.organizationId);
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
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    return this.candidatesService.uploadDocument(id, file, documentType, req?.user?.organizationId);
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
    const { asciiFallback, encodedFileName, mimeType, stream } =
      await this.candidatesService.prepareDocumentDownload(
        id,
        targetUrl,
        targetName,
        req?.user?.organizationId,
        req?.user,
      );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFileName}`,
    );
    if (mimeType) {
      res.setHeader("Content-Type", mimeType);
    }

    stream.pipe(res);
  }

  @Delete(":id/documents")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  deleteDocument(
    @Param("id") id: string,
    @Query("documentId") documentId?: string,
    @Query("url") url?: string,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    return this.candidatesService.deleteDocument(id, { documentId, url }, req?.user?.organizationId);
  }

  @Delete(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  remove(
    @Param("id") id: string,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    return this.candidatesService.remove(id, req?.user?.organizationId);
  }
}

