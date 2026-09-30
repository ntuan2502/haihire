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
import { Throttle } from "@nestjs/throttler";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import type { Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApplicationsService } from "./applications.service";
import { CreateApplicationDto } from "./dto/create-application.dto";
import { UpdateStageDto } from "./dto/update-stage.dto";
import { UpdateCandidateDto } from "./dto/update-candidate.dto";
import { resumeFileFilter } from "../common/upload-utils";

@Controller("applications")
export class ApplicationsController {
  constructor(
    @Inject(ApplicationsService)
    private readonly applicationsService: ApplicationsService,
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
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.applicationsService.findAll(
      organizationId,
      {
        page: pageNum,
        limit: limitNum,
        search,
        jobId,
        stage,
      },
      req?.user?.organizationId,
    );
  }

  @Get("job/:jobId")
  @UseGuards(AuthGuard("jwt"))
  findByJob(
    @Param("jobId") jobId: string,
    @Request() req?: { user?: { id?: string; organizationId?: string | null } },
  ) {
    return this.applicationsService.findByJob(jobId, req?.user?.organizationId || undefined);
  }

  @Get(":id")
  @UseGuards(AuthGuard("jwt"))
  findOne(
    @Param("id") id: string,
    @Request() req: { user?: { organizationId?: string | null } },
  ) {
    return this.applicationsService.findOne(id, req?.user?.organizationId);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post("apply")
  @UseInterceptors(
    FileInterceptor("resume", {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
      fileFilter: resumeFileFilter,
    }),
  )
  create(
    @Body() dto: CreateApplicationDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req?: { user?: { id?: string; role?: string; organizationId?: string | null } },
  ) {
    return this.applicationsService.create(dto, file, req?.user);
  }

  @Patch(":id/stage")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  updateStage(
    @Param("id") id: string,
    @Body() dto: UpdateStageDto,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    return this.applicationsService.updateStage(id, dto, req?.user?.organizationId);
  }

  @Patch(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  updateCandidate(
    @Param("id") id: string,
    @Body() dto: UpdateCandidateDto,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    return this.applicationsService.updateCandidate(id, dto, req?.user?.organizationId);
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
    return this.applicationsService.uploadDocument(id, file, documentType, req?.user?.organizationId);
  }

  @Get(":id/documents/download")
  @UseGuards(AuthGuard("jwt"))
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
      await this.applicationsService.prepareDocumentDownload(
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
    return this.applicationsService.deleteDocument(id, { documentId, url }, req?.user?.organizationId);
  }

  @Delete(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  remove(
    @Param("id") id: string,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    return this.applicationsService.remove(id, req?.user?.organizationId);
  }
}

