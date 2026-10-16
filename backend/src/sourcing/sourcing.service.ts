import { Inject, Injectable, Optional } from "@nestjs/common";
import type {
  SourcingStats,
  TrackingLinkItem,
  AttributionLogItem,
  TrackingLinkDetail,
  TimeRangeFilter,
  PaginatedResult,
  SourcingChannel,
} from "@haihire/shared";
import { PrismaService } from "../prisma/prisma.service";
import { ActivitiesService } from "../activities/activities.service";
import { CreateTrackingLinkDto } from "./dto/create-tracking-link.dto";
import { UpdateTrackingLinkDto } from "./dto/update-tracking-link.dto";
import {
  SourcingLinksService,
  SourcingLockService,
  SourcingMetricsService,
  type RedisLockClient,
} from "./services";

export type { RedisLockClient };
export { SourcingLinksService, SourcingLockService, SourcingMetricsService };

@Injectable()
export class SourcingService {
  private readonly links: SourcingLinksService;
  private readonly lock: SourcingLockService;
  private readonly metrics: SourcingMetricsService;

  constructor(
    @Optional() @Inject(SourcingLinksService) linksOrPrisma?: SourcingLinksService | PrismaService,
    @Optional() @Inject(SourcingLockService) lockOrActivities?: SourcingLockService | ActivitiesService,
    @Optional() @Inject(SourcingMetricsService) metricsOrRedis?: SourcingMetricsService | RedisLockClient,
    @Optional() @Inject("REDIS_CLIENT") redisClient?: RedisLockClient,
  ) {
    if (linksOrPrisma instanceof SourcingLinksService) {
      // NestJS Dependency Injection path
      this.links = linksOrPrisma;
      this.lock = lockOrActivities as SourcingLockService;
      this.metrics = metricsOrRedis as SourcingMetricsService;
    } else if (linksOrPrisma) {
      // Direct instantiation support for existing tests:
      // new SourcingService(mockPrisma as never, mockActivitiesService as never, mockRedis)
      const prisma = linksOrPrisma as PrismaService;
      const activities = lockOrActivities as ActivitiesService;
      const redis = (redisClient ?? metricsOrRedis) as RedisLockClient | undefined;
      this.links = new SourcingLinksService(prisma, activities);
      this.lock = new SourcingLockService(prisma, redis);
      this.metrics = new SourcingMetricsService(prisma, this.links);
    } else {
      throw new Error("SourcingService requires dependencies to be injected");
    }
  }

  // ==========================================
  // 1. TRACKING LINKS CRUD & DISCOVERY
  // ==========================================
  createLink(
    organizationId: string,
    userId: string,
    dto: CreateTrackingLinkDto,
  ): Promise<TrackingLinkItem> {
    return this.links.createLink(organizationId, userId, dto);
  }

  updateLink(
    organizationId: string,
    id: string,
    dto: UpdateTrackingLinkDto,
  ): Promise<void> {
    return this.links.updateLink(organizationId, id, dto);
  }

  deleteLink(organizationId: string, id: string): Promise<void> {
    return this.links.deleteLink(organizationId, id);
  }

  getLinks(
    organizationId: string,
    pagination: {
      page?: number;
      limit?: number;
      search?: string;
      jobId?: string;
      isActive?: boolean;
    },
  ): Promise<PaginatedResult<TrackingLinkItem>> {
    return this.links.getLinks(organizationId, pagination);
  }

  findLinkByToken(token: string) {
    return this.links.findLinkByToken(token);
  }

  // ==========================================
  // 2. DISTRIBUTED LOCK & CLICK RECORDING
  // ==========================================
  recordClick(
    token: string,
    referrer?: string,
    ip?: string,
    userAgent?: string,
    lockOptions?: { maxWaitMs?: number; retryIntervalMs?: number; lockTtlMs?: number },
  ): Promise<{ success: boolean; link?: { token: string; source: string; jobId?: string | null } }> {
    return this.lock.recordClick(token, referrer, ip, userAgent, lockOptions);
  }

  // ==========================================
  // 3. SOURCING METRICS & ATTRIBUTION REPORTS
  // ==========================================
  getStats(
    organizationId: string,
    timeRange: "7d" | "30d" | "90d" | "all" = "30d",
    jobId?: string,
  ): Promise<SourcingStats> {
    return this.metrics.getStats(organizationId, timeRange, jobId);
  }

  getLinkDetails(
    organizationId: string,
    id: string,
    timeRange: TimeRangeFilter = "30d",
  ): Promise<TrackingLinkDetail> {
    return this.metrics.getLinkDetails(organizationId, id, timeRange);
  }

  getAttributionLog(
    organizationId: string,
    pagination: {
      page?: number;
      limit?: number;
      search?: string;
      jobId?: string;
      source?: SourcingChannel;
    },
  ): Promise<PaginatedResult<AttributionLogItem>> {
    return this.metrics.getAttributionLog(organizationId, pagination);
  }
}
