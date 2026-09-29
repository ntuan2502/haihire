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
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { OptionalJwtAuthGuard } from "../auth/optional-jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { AppForbiddenException } from "../common/app-exception";
import { APP_ERROR_CODES } from "@haihire/shared";
import { CreateJobDto } from "./dto/create-job.dto";
import { UpdateJobDto } from "./dto/update-job.dto";
import { JobsService } from "./jobs.service";

@Controller("jobs")
export class JobsController {
  constructor(
    @Inject(JobsService)
    private readonly jobsService: JobsService,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(
    @Request() req: { user?: { id?: string; role?: string; organizationId?: string | null } },
    @Query("status") status?: string,
    @Query("department") department?: string,
    @Query("search") search?: string,
    @Query("type") type?: string,
    @Query("experienceLevel") experienceLevel?: string,
    @Query("workplace") workplace?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortOrder") sortOrder?: string,
    @Query("organizationId") organizationId?: string,
    @Query("organizationSlug") organizationSlug?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const isAuthenticated = Boolean(req?.user);
    // Security: Unauthenticated public requests must ONLY ever see PUBLISHED jobs
    const effectiveStatus = !isAuthenticated ? "PUBLISHED" : status;
    const userOrgId = req?.user?.organizationId || undefined;

    // Security: If requesting non-published jobs (draft, internal), user must belong to that organization
    if (
      isAuthenticated &&
      effectiveStatus &&
      effectiveStatus !== "PUBLISHED" &&
      organizationId &&
      userOrgId &&
      organizationId !== userOrgId
    ) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "Access denied: cannot view unpublished jobs from another organization.",
      );
    }

    const orgId = organizationId || userOrgId || undefined;
    return this.jobsService.findAll({
      status: effectiveStatus,
      department,
      search,
      type,
      experienceLevel,
      workplace,
      sortBy,
      sortOrder,
      organizationId: orgId,
      organizationSlug: organizationSlug || undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get("careers/:orgSlug/:jobSlug")
  findBySlug(
    @Param("orgSlug") orgSlug: string,
    @Param("jobSlug") jobSlug: string,
  ) {
    return this.jobsService.findBySlug(orgSlug, jobSlug);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.jobsService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  create(
    @Body() dto: CreateJobDto,
    @Request() req?: { user?: { id?: string; organizationId?: string | null } },
  ) {
    const userOrgId = req?.user?.organizationId || undefined;
    if (dto.organizationId && userOrgId && dto.organizationId !== userOrgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "Access denied: cannot create job for another organization.",
      );
    }
    const finalDto = {
      ...dto,
      organizationId: userOrgId || dto.organizationId,
      createdById: req?.user?.id || dto.createdById,
    };
    return this.jobsService.create(finalDto);
  }

  @Patch(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateJobDto,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    const job = await this.jobsService.findOne(id);
    if (req?.user?.organizationId && job.organizationId && req.user.organizationId !== job.organizationId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "Access denied: job belongs to another organization.",
      );
    }
    return this.jobsService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  async remove(
    @Param("id") id: string,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    const job = await this.jobsService.findOne(id);
    if (req?.user?.organizationId && job.organizationId && req.user.organizationId !== job.organizationId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "Access denied: job belongs to another organization.",
      );
    }
    return this.jobsService.remove(id);
  }
}

