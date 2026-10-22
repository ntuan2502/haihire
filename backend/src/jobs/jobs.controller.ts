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
import { RequirePermission } from "../auth/require-permission.decorator";
import { CreateJobDto } from "./dto/create-job.dto";
import { UpdateJobDto } from "./dto/update-job.dto";
import { JobsService } from "./jobs.service";
import { DtoPipe } from "../common/dto-validation.pipe";

@Controller("jobs")
export class JobsController {
  constructor(
    @Inject(JobsService)
    private readonly jobsService: JobsService,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(
    @Request()
    req: {
      user?: { id?: string; role?: string; organizationId?: string | null };
    },
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
    return this.jobsService.findAll({
      status,
      department,
      search,
      type,
      experienceLevel,
      workplace,
      sortBy,
      sortOrder,
      organizationId,
      organizationSlug: organizationSlug || undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      tenantOrgId: req?.user?.organizationId,
      isAuthenticated: Boolean(req?.user),
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
  @UseGuards(OptionalJwtAuthGuard)
  findOne(
    @Param("id") id: string,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    return this.jobsService.findOne(id, req?.user?.organizationId, !req?.user);
  }

  @Post()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @RequirePermission("job:create")
  create(
    @Body(DtoPipe(CreateJobDto)) dto: CreateJobDto,
    @Request() req?: { user?: { id?: string; organizationId?: string | null } },
  ) {
    return this.jobsService.create(
      dto,
      req?.user?.organizationId,
      req?.user?.id,
    );
  }

  @Patch(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @RequirePermission("job:update")
  update(
    @Param("id") id: string,
    @Body(DtoPipe(UpdateJobDto)) dto: UpdateJobDto,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    return this.jobsService.update(id, dto, req?.user?.organizationId);
  }

  @Delete(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @RequirePermission("job:delete")
  remove(
    @Param("id") id: string,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    return this.jobsService.remove(id, req?.user?.organizationId);
  }
}
