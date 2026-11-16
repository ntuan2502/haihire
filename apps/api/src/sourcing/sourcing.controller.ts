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
  Req,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Throttle } from "@nestjs/throttler";
import type { Request as ExpressRequest } from "express";
import { RolesGuard } from "../auth/roles.guard";
import { RequirePermission } from "../auth/require-permission.decorator";
import { SourcingService } from "./sourcing.service";
import { SourcingFilterDto } from "./dto/sourcing-filter.dto";
import { AppForbiddenException } from "../common/app-exception";
import {
  APP_ERROR_CODES,
  createTrackingLinkSchema,
  recordClickSchema,
  updateTrackingLinkSchema,
  type CreateTrackingLinkSchema,
  type RecordClickSchema,
  type TimeRangeFilter,
  type UpdateTrackingLinkSchema,
} from "@haihire/shared";
import { DtoPipe } from "../common/dto-validation.pipe";
import { ActiveTenantGuard } from "../common/guards/active-tenant.guard";

@Controller("sourcing")
export class SourcingController {
  constructor(
    @Inject(SourcingService)
    private readonly sourcingService: SourcingService,
  ) {}

  @Get("stats")
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
  @RequirePermission("sourcing:view")
  async getStats(
    @Request() req: { user?: { organizationId?: string | null } },
    @Query(DtoPipe(SourcingFilterDto)) filter: SourcingFilterDto,
  ) {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
        "Organization ID is required",
      );
    }
    return this.sourcingService.getStats(orgId, filter.timeRange, filter.jobId);
  }

  @Get("links")
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
  @RequirePermission("sourcing:view")
  async getLinks(
    @Request() req: { user?: { organizationId?: string | null } },
    @Query(DtoPipe(SourcingFilterDto)) filter: SourcingFilterDto,
    @Query("isActive") isActive?: string,
  ) {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
        "Organization ID is required",
      );
    }

    const pageNum = filter.page ? parseInt(filter.page, 10) : undefined;
    const limitNum = filter.limit ? parseInt(filter.limit, 10) : undefined;
    const activeBool = isActive !== undefined ? isActive === "true" : undefined;

    return this.sourcingService.getLinks(orgId, {
      page: pageNum,
      limit: limitNum,
      search: filter.search,
      jobId: filter.jobId,
      isActive: activeBool,
    });
  }

  @Get("links/:id")
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
  @RequirePermission("sourcing:view")
  async getLinkDetails(
    @Request() req: { user?: { organizationId?: string | null } },
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query("timeRange") timeRange?: TimeRangeFilter,
  ) {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
        "Organization ID is required",
      );
    }
    return this.sourcingService.getLinkDetails(orgId, id, timeRange);
  }

  @Post("links")
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
  @RequirePermission("sourcing:create")
  async createLink(
    @Request() req: { user?: { id: string; organizationId?: string | null } },
    @Body(DtoPipe(createTrackingLinkSchema)) dto: CreateTrackingLinkSchema,
  ) {
    const orgId = req.user?.organizationId;
    const userId = req.user?.id;
    if (!orgId || !userId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
        "User and Organization are required",
      );
    }
    return this.sourcingService.createLink(orgId, userId, dto);
  }

  @Patch("links/:id")
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
  @RequirePermission("sourcing:update")
  async updateLink(
    @Request() req: { user?: { organizationId?: string | null } },
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(DtoPipe(updateTrackingLinkSchema)) dto: UpdateTrackingLinkSchema,
  ) {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
        "Organization ID is required",
      );
    }
    await this.sourcingService.updateLink(orgId, id, dto);
    return { success: true };
  }

  @Delete("links/:id")
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
  @RequirePermission("sourcing:delete")
  async deleteLink(
    @Request() req: { user?: { organizationId?: string | null } },
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
        "Organization ID is required",
      );
    }
    await this.sourcingService.deleteLink(orgId, id);
    return { success: true };
  }

  @Get("attribution-log")
  @UseGuards(AuthGuard("jwt"), ActiveTenantGuard, RolesGuard)
  @RequirePermission("sourcing:view")
  async getAttributionLog(
    @Request() req: { user?: { organizationId?: string | null } },
    @Query(DtoPipe(SourcingFilterDto)) filter: SourcingFilterDto,
  ) {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      throw new AppForbiddenException(
        APP_ERROR_CODES.FORBIDDEN_READ_ONLY,
        "Organization ID is required",
      );
    }

    const pageNum = filter.page ? parseInt(filter.page, 10) : undefined;
    const limitNum = filter.limit ? parseInt(filter.limit, 10) : undefined;

    return this.sourcingService.getAttributionLog(orgId, {
      page: pageNum,
      limit: limitNum,
      search: filter.search,
      jobId: filter.jobId,
      source: filter.source,
    });
  }

  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Post("public/click")
  async recordClick(
    @Body(DtoPipe(recordClickSchema)) dto: RecordClickSchema,
    @Req() req: ExpressRequest,
  ) {
    const ip = req.ip || req.socket.remoteAddress || undefined;
    const userAgent = req.headers["user-agent"] || undefined;
    return this.sourcingService.recordClick(
      dto.token,
      dto.referrer,
      ip,
      userAgent,
    );
  }
}
