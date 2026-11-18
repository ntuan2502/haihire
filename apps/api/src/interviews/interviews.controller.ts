import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/roles.guard";
import { RequirePermission } from "../auth/require-permission.decorator";
import { InterviewsService } from "./interviews.service";
import { CreateInterviewDto } from "./dto/create-interview.dto";
import { UpdateInterviewDto } from "./dto/update-interview.dto";
import { DtoPipe } from "../common/dto-validation.pipe";
import { ActiveTenantGuard } from "../common/guards/active-tenant.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { SubmitScorecardDto } from "./dto/submit-scorecard.dto";

@Controller("interviews")
@UseGuards(AuthGuard("jwt"), ActiveTenantGuard, TenantGuard, RolesGuard)
export class InterviewsController {
  constructor(
    @Inject(InterviewsService)
    private readonly interviewsService: InterviewsService,
  ) {}

  @Get()
  @RequirePermission("interview:view")
  findAll(
    @Request() req: { user?: { organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
    @Query("jobId") jobId?: string,
    @Query("applicationId") applicationId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("tab") tab?: string,
    @Query("sortBy") sortBy?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.interviewsService.findAll({
      organizationId,
      jobId,
      applicationId,
      startDate,
      endDate,
      page: pageNum,
      limit: limitNum,
      search,
      tab,
      sortBy,
      tenantOrgId: req?.user?.organizationId,
    });
  }

  @Get(":id")
  @RequirePermission("interview:view")
  findOne(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Request() req: { user?: { organizationId?: string | null } },
  ) {
    return this.interviewsService.findOne(id, req?.user?.organizationId);
  }

  @Post()
  @RequirePermission("interview:create")
  create(
    @Body(DtoPipe(CreateInterviewDto)) dto: CreateInterviewDto,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    return this.interviewsService.create(dto, req?.user?.organizationId);
  }

  @Patch(":id/scorecard")
  @RequirePermission("interview:scorecard_submit")
  submitScorecard(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(DtoPipe(SubmitScorecardDto)) dto: SubmitScorecardDto,
    @Request()
    req?: {
      user?: {
        id?: string;
        name?: string;
        email?: string;
        role?: string;
        organizationId?: string | null;
      };
    },
  ) {
    const actor =
      req?.user?.id || req?.user?.name || req?.user?.role
        ? {
            id: req.user.id,
            name: req.user.name || req.user.email,
            role: req.user.role,
          }
        : undefined;
    if (actor) {
      return this.interviewsService.update(
        id,
        { scorecard: dto.scorecard },
        req?.user?.organizationId,
        actor,
      );
    }
    return this.interviewsService.update(
      id,
      { scorecard: dto.scorecard },
      req?.user?.organizationId,
    );
  }

  @Patch(":id")
  @RequirePermission("interview:update")
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(DtoPipe(UpdateInterviewDto)) dto: UpdateInterviewDto,
    @Request()
    req?: {
      user?: {
        id?: string;
        name?: string;
        email?: string;
        role?: string;
        organizationId?: string | null;
      };
    },
  ) {
    const actor =
      req?.user?.id || req?.user?.name || req?.user?.role
        ? {
            id: req.user.id,
            name: req.user.name || req.user.email,
            role: req.user.role,
          }
        : undefined;
    if (actor) {
      return this.interviewsService.update(
        id,
        dto,
        req?.user?.organizationId,
        actor,
      );
    }
    return this.interviewsService.update(id, dto, req?.user?.organizationId);
  }

  @Delete(":id")
  @RequirePermission("interview:delete")
  remove(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Request() req?: { user?: { organizationId?: string | null } },
  ) {
    return this.interviewsService.remove(id, req?.user?.organizationId);
  }
}
