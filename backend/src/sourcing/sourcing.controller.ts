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
  Req,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Throttle } from "@nestjs/throttler";
import type { Request as ExpressRequest } from "express";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { SourcingService } from "./sourcing.service";
import { CreateTrackingLinkDto } from "./dto/create-tracking-link.dto";
import { UpdateTrackingLinkDto } from "./dto/update-tracking-link.dto";
import { RecordClickDto } from "./dto/record-click.dto";
import { SourcingFilterDto } from "./dto/sourcing-filter.dto";
import { AppForbiddenException } from "../common/app-exception";
import { APP_ERROR_CODES } from "@haihire/shared";

@Controller("sourcing")
export class SourcingController {
  constructor(
    @Inject(SourcingService)
    private readonly sourcingService: SourcingService,
  ) {}

  @Get("stats")
  @UseGuards(AuthGuard("jwt"))
  async getStats(
    @Request() req: { user?: { organizationId?: string | null } },
    @Query() filter: SourcingFilterDto,
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
  @UseGuards(AuthGuard("jwt"))
  async getLinks(
    @Request() req: { user?: { organizationId?: string | null } },
    @Query() filter: SourcingFilterDto,
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

  @Post("links")
  @UseGuards(AuthGuard("jwt"))
  async createLink(
    @Request() req: { user?: { id: string; organizationId?: string | null } },
    @Body() dto: CreateTrackingLinkDto,
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
  @UseGuards(AuthGuard("jwt"))
  async updateLink(
    @Request() req: { user?: { organizationId?: string | null } },
    @Param("id") id: string,
    @Body() dto: UpdateTrackingLinkDto,
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
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("ADMIN")
  async deleteLink(
    @Request() req: { user?: { organizationId?: string | null } },
    @Param("id") id: string,
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
  @UseGuards(AuthGuard("jwt"))
  async getAttributionLog(
    @Request() req: { user?: { organizationId?: string | null } },
    @Query() filter: SourcingFilterDto,
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
    @Body() dto: RecordClickDto,
    @Req() req: ExpressRequest,
  ) {
    const ip = req.ip || req.socket.remoteAddress || undefined;
    const userAgent = req.headers["user-agent"] || undefined;
    return this.sourcingService.recordClick(dto.token, dto.referrer, ip, userAgent);
  }
}
