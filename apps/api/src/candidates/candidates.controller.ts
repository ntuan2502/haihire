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
import { RolesGuard } from "../auth/roles.guard";
import { RequirePermission } from "../auth/require-permission.decorator";
import type { Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { CandidatesService } from "./candidates.service";
import { CreateCandidateDto } from "./dto/create-candidate.dto";
import { UpdateCandidateDto } from "./dto/update-candidate.dto";
import { resumeFileFilter } from "../common/upload-utils";
import { DtoPipe } from "../common/dto-validation.pipe";
import { ActiveTenantGuard } from "../common/guards/active-tenant.guard";
import { hasPermission, Role } from "@haihire/shared";
import { PermissionResolverService } from "../auth/permission-resolver.service";

@Controller("candidates")
@UseGuards(AuthGuard("jwt"), ActiveTenantGuard)
export class CandidatesController {
  constructor(
    @Inject(CandidatesService)
    private readonly candidatesService: CandidatesService,
    @Optional() @Inject(PermissionResolverService)
    private readonly permissionResolver?: PermissionResolverService,
  ) {}

  @Get()
  @UseGuards(RolesGuard)
  @RequirePermission("candidate:view_basic")
  async findAll(
    @Request() req: { user?: { id?: string; role?: string; isOwner?: boolean; organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    const result = await this.candidatesService.findAll(
      organizationId,
      {
        page: pageNum,
        limit: limitNum,
        search,
      },
      req?.user?.organizationId,
    );
    const user = req.user;
    const fullAccess = user?.isOwner || (this.permissionResolver
      ? await this.permissionResolver.resolvePermission(user?.organizationId, user?.role as Role, "candidate:view")
      : hasPermission(user?.role || "", "candidate:view"));
    if (fullAccess) return result;
    return {
      ...result,
      data: result.data.map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
        phone: candidate.phone,
        organizationId: candidate.organizationId,
        createdAt: candidate.createdAt,
        applicationsCount: candidate.applicationsCount,
        applications: candidate.applications,
      })),
    };
  }

  @Get(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @RequirePermission("candidate:view")
  findOne(
    @Param("id") id: string,
    @Request()
    req: {
      user?: { id?: string; name?: string; organizationId?: string | null };
    },
  ) {
    return this.candidatesService.findOne(
      id,
      req?.user?.organizationId,
      req?.user,
    );
  }

  @Post()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @RequirePermission("candidate:create")
  @UseInterceptors(
    FileInterceptor("resume", {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
      fileFilter: resumeFileFilter,
    }),
  )
  create(
    @Body(DtoPipe(CreateCandidateDto)) dto: CreateCandidateDto,
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
  @RequirePermission("candidate:update")
  update(
    @Param("id") id: string,
    @Body(DtoPipe(UpdateCandidateDto)) dto: UpdateCandidateDto,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    return this.candidatesService.update(id, dto, req?.user?.organizationId);
  }

  @Post(":id/documents")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @RequirePermission("candidate:document_upload")
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
    return this.candidatesService.uploadDocument(
      id,
      file,
      documentType,
      req?.user?.organizationId,
    );
  }

  @Get(":id/documents/download")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @RequirePermission("candidate:document_download")
  async downloadDocument(
    @Param("id") id: string,
    @Query("url") targetUrl: string,
    @Query("name") targetName: string,
    @Query("disposition") disposition: string,
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

    const dispType = disposition === "inline" ? "inline" : "attachment";
    res.setHeader(
      "Content-Disposition",
      `${dispType}; filename="${asciiFallback}"; filename*=UTF-8''${encodedFileName}`,
    );
    if (mimeType) {
      res.setHeader("Content-Type", mimeType);
    }

    stream.pipe(res);
  }

  @Delete(":id/documents")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @RequirePermission("candidate:document_delete")
  deleteDocument(
    @Param("id") id: string,
    @Query("documentId") documentId?: string,
    @Query("url") url?: string,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    return this.candidatesService.deleteDocument(
      id,
      { documentId, url },
      req?.user?.organizationId,
    );
  }

  @Delete(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @RequirePermission("candidate:delete")
  remove(
    @Param("id") id: string,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    return this.candidatesService.remove(id, req?.user?.organizationId);
  }
}
