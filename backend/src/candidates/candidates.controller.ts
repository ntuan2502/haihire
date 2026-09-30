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
import { AppForbiddenException } from "../common/app-exception";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import type { Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { CandidatesService } from "./candidates.service";
import { CreateCandidateDto } from "./dto/create-candidate.dto";
import { UpdateCandidateDto } from "./dto/update-candidate.dto";
import { resumeFileFilter } from "../common/upload-utils";
import { ActivitiesService } from "../activities/activities.service";

@Controller("candidates")
@UseGuards(AuthGuard("jwt"))
export class CandidatesController {
  constructor(
    @Inject(CandidatesService)
    private readonly candidatesService: CandidatesService,
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
        APP_ERROR_CODES.CANDIDATE_ORG_MISMATCH,
        "Access denied: cannot access candidates from another organization.",
        { organizationId },
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
    const candidate = await this.candidatesService.findOne(id, req?.user?.organizationId);

    if (req?.user?.id && this.activitiesService) {
      this.activitiesService
        .createActivity({
          organizationId: candidate.organizationId,
          candidateId: candidate.id,
          type: "NOTE_ADDED",
          title: "Candidate Profile Accessed",
          description: `Candidate profile was accessed by ${req.user.name || "recruiter"}`,
          actorId: req.user.id,
          actorName: req.user.name || "Recruiter",
          metadata: {
            action: "VIEW_PROFILE",
            accessType: "PII_READ",
            subType: "PII_READ",
            userName: req.user.name || "Recruiter",
          },
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
    const { candidate, cleanFileName, asciiFallback, encodedFileName, mimeType, stream, downloadUrl } =
      await this.candidatesService.prepareDocumentDownload(
        id,
        targetUrl,
        targetName,
        req?.user?.organizationId,
      );

    if (req?.user?.id && this.activitiesService) {
      this.activitiesService
        .createActivity({
          organizationId: candidate.organizationId,
          candidateId: candidate.id,
          type: "NOTE_ADDED",
          title: "Document Downloaded",
          description: `Document "${cleanFileName}" was downloaded by ${req.user.name || "recruiter"}`,
          actorId: req.user.id,
          actorName: req.user.name || "Recruiter",
          metadata: {
            action: "DOWNLOAD_DOCUMENT",
            subType: "DOCUMENT_DOWNLOADED",
            fileName: cleanFileName,
            userName: req.user.name || "Recruiter",
            documentUrl: downloadUrl,
          },
        })
        .catch(() => {});
    }

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

