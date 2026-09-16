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
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
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
  findAll(
    @Query("status") status?: string,
    @Query("department") department?: string,
    @Query("search") search?: string,
    @Query("organizationId") organizationId?: string,
    @Query("organizationSlug") organizationSlug?: string,
  ) {
    return this.jobsService.findAll({
      status,
      department,
      search,
      organizationId: organizationId || undefined,
      organizationSlug: organizationSlug || undefined,
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
  create(@Body() dto: CreateJobDto) {
    return this.jobsService.create(dto);
  }

  @Patch(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  update(@Param("id") id: string, @Body() dto: UpdateJobDto) {
    return this.jobsService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  remove(@Param("id") id: string) {
    return this.jobsService.remove(id);
  }
}
