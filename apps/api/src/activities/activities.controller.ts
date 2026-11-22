import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { DtoPipe } from "../common/dto-validation.pipe";
import { ActivitiesService } from "./activities.service";
import { CreateActivityRecordDto } from "./dto/create-activity-record.dto";
import { ActiveTenantGuard } from "../common/guards/active-tenant.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { RolesGuard } from "../auth/roles.guard";
import { RequirePermission } from "../auth/require-permission.decorator";

@Controller("activities")
@UseGuards(AuthGuard("jwt"), ActiveTenantGuard, TenantGuard, RolesGuard)
export class ActivitiesController {
  constructor(
    @Inject(ActivitiesService)
    private readonly activitiesService: ActivitiesService,
  ) {}

  @Get("candidate/:candidateId")
  @RequirePermission("candidate:view")
  findByCandidate(
    @Param("candidateId", new ParseUUIDPipe()) candidateId: string,
    @Request() req: { user?: { organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.activitiesService.findByCandidate(
      candidateId,
      organizationId,
      {
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      },
      req?.user?.organizationId,
    );
  }

  @Get("application/:applicationId")
  @RequirePermission("application:view")
  findByApplication(
    @Param("applicationId", new ParseUUIDPipe()) applicationId: string,
    @Request() req: { user?: { organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.activitiesService.findByApplication(
      applicationId,
      organizationId,
      {
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      },
      req?.user?.organizationId,
    );
  }

  @Post()
  @RequirePermission("candidate:update")
  create(
    @Body(DtoPipe(CreateActivityRecordDto)) dto: CreateActivityRecordDto,
    @Request()
    req: {
      user: {
        id: string;
        name: string;
        role?: string;
        organizationId?: string | null;
      };
    },
  ) {
    return this.activitiesService.createActivity(
      {
        ...dto,
        organizationId: req.user.organizationId || "",
        actorId: req.user.id,
        actorName: req.user.name || "System User",
        actorRole: req.user.role || "MEMBER",
      },
      { verifyTargets: true },
    );
  }
}
