import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Optional,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Throttle } from "@nestjs/throttler";
import { AiGenerationService } from "../ai/ai-generation.service";
import { AppForbiddenException } from "../common/app-exception";
import { OptionalJwtAuthGuard } from "../auth/optional-jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { RequirePermission } from "../auth/require-permission.decorator";
import { JobsService } from "./jobs.service";
import { DtoPipe } from "../common/dto-validation.pipe";
import { ActiveTenantGuard } from "../common/guards/active-tenant.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import {
  APP_ERROR_CODES,
  hasPermission,
  Role,
  createJobSchema,
  generateScoringCriteriaSchema,
  generateScreeningQuestionsSchema,
  updateJobSchema,
  upsertPipelineStagesSchema,
  type CreateJobSchema,
  type GenerateScoringCriteriaInput,
  type GenerateScreeningQuestionsInput,
  type UpdateJobSchema,
  type UpsertPipelineStagesSchema,
} from "@haihire/shared";
import { PermissionResolverService } from "../auth/permission-resolver.service";

@Controller("jobs")
@UseGuards(TenantGuard)
export class JobsController {
  constructor(
    @Inject(JobsService)
    private readonly jobsService: JobsService,
    @Optional()
    @Inject(PermissionResolverService)
    private readonly permissionResolver?: PermissionResolverService,
    @Optional()
    @Inject(AiGenerationService)
    private readonly aiGenerationService?: AiGenerationService,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard, TenantGuard)
  listPaginated(
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
    return this.jobsService.listPaginated({
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
    });
  }

  @Get("public")
  findPublic(@Query("limit") limit?: string) {
    return this.jobsService.listPaginated({
      status: "PUBLISHED",
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
  @UseGuards(OptionalJwtAuthGuard)
  async findOne(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Request()
    req?: {
      user?: {
        role?: string;
        isOwner?: boolean;
        organizationId?: string | null;
      };
    },
  ) {
    const tenantOrgId = req?.user?.organizationId;
    const user = req?.user;
    const fullAccess =
      user?.isOwner ||
      (this.permissionResolver
        ? await this.permissionResolver.resolvePermission(
            tenantOrgId,
            user?.role as Role,
            "candidate:view",
          )
        : hasPermission(user?.role || "", "candidate:view"));
    return this.jobsService.findOne(
      id,
      tenantOrgId,
      !tenantOrgId,
      Boolean(fullAccess),
    );
  }

  @Post("screening-questions/generate")
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @RequirePermission("job:create")
  generateScreeningQuestions(
    @Body(DtoPipe(generateScreeningQuestionsSchema))
    dto: GenerateScreeningQuestionsInput,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    const orgId = req?.user?.organizationId;
    if (!orgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "Active organization context is required.",
      );
    }
    if (!this.aiGenerationService) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.AI_NOT_CONFIGURED,
        "AI generation service is unavailable.",
      );
    }
    return this.aiGenerationService.generateScreeningQuestions(orgId, dto);
  }

  @Post("generate-scoring-criteria")
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @RequirePermission("job:create")
  generateScoringCriteria(
    @Body(DtoPipe(generateScoringCriteriaSchema))
    dto: GenerateScoringCriteriaInput,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    const orgId = req?.user?.organizationId;
    if (!orgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN,
        "Active organization context is required.",
      );
    }
    if (!this.aiGenerationService) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.AI_NOT_CONFIGURED,
        "AI generation service is unavailable.",
      );
    }
    return this.aiGenerationService.generateScoringCriteria(orgId, dto);
  }

  @Post()
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
  @RequirePermission("job:create")
  create(
    @Body(DtoPipe(createJobSchema)) dto: CreateJobSchema,
    @Request() req?: { user?: { id?: string; organizationId?: string | null } },
  ) {
    return this.jobsService.create(
      dto,
      req?.user?.organizationId,
      req?.user?.id,
    );
  }

  @Patch(":id")
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
  @RequirePermission("job:update")
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(DtoPipe(updateJobSchema)) dto: UpdateJobSchema,
    @Request() req?: { user?: { id?: string; organizationId?: string | null } },
  ) {
    return this.jobsService.update(
      id,
      dto,
      req?.user?.organizationId,
      req?.user?.id,
    );
  }

  @Delete(":id")
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
  @RequirePermission("job:delete")
  remove(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Request() req?: { user?: { id?: string; organizationId?: string | null } },
  ) {
    return this.jobsService.remove(
      id,
      req?.user?.organizationId,
      req?.user?.id,
    );
  }

  @Get(":id/stages")
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
  @RequirePermission("job:view")
  getPipelineStages(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    return this.jobsService.getPipelineStages(id, req?.user?.organizationId);
  }

  @Patch(":id/stages")
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
  @RequirePermission("job:update")
  updatePipelineStages(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(DtoPipe(upsertPipelineStagesSchema)) dto: UpsertPipelineStagesSchema,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    return this.jobsService.updatePipelineStages(
      id,
      dto,
      req?.user?.organizationId,
    );
  }
}
