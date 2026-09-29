import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AppForbiddenException } from "../common/app-exception";
import { APP_ERROR_CODES } from "@haihire/shared";
import { ActivitiesService, type CreateActivityDto } from "./activities.service";

@Controller("activities")
@UseGuards(AuthGuard("jwt"))
export class ActivitiesController {
  constructor(
    @Inject(ActivitiesService)
    private readonly activitiesService: ActivitiesService,
  ) {}

  @Get("candidate/:candidateId")
  findByCandidate(
    @Param("candidateId") candidateId: string,
    @Request() req: { user?: { organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const userOrgId = req?.user?.organizationId || undefined;
    if (organizationId && userOrgId && organizationId !== userOrgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
        "Access denied: cannot access activities from another organization.",
        { candidateId, organizationId },
      );
    }
    const orgId = userOrgId || organizationId || undefined;
    return this.activitiesService.findByCandidate(candidateId, orgId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get("application/:applicationId")
  findByApplication(
    @Param("applicationId") applicationId: string,
    @Request() req: { user?: { organizationId?: string | null } },
    @Query("organizationId") organizationId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const userOrgId = req?.user?.organizationId || undefined;
    if (organizationId && userOrgId && organizationId !== userOrgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.ORG_FORBIDDEN_ACTION,
        "Access denied: cannot access activities from another organization.",
        { applicationId, organizationId },
      );
    }
    const orgId = userOrgId || organizationId || undefined;
    return this.activitiesService.findByApplication(applicationId, orgId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post()
  create(
    @Body() dto: Omit<CreateActivityDto, "organizationId" | "actorId" | "actorName">,
    @Request() req: { user: { id: string; name: string; role?: string; organizationId?: string | null } },
  ) {
    const orgId = req.user.organizationId;
    if (!orgId) {
      throw new Error("User must belong to an organization to record an activity.");
    }

    return this.activitiesService.createActivity({
      ...dto,
      organizationId: orgId,
      actorId: req.user.id,
      actorName: req.user.name || "System User",
      actorRole: req.user.role || "MEMBER",
    });
  }
}
