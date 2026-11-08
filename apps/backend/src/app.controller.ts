import {
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { createHash, timingSafeEqual } from "node:crypto";
import { AppService } from "./app.service";
import { env } from "./config/env";
import { MetricsService } from "./metrics/metrics.service";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

@SkipThrottle()
@Controller()
export class AppController {
  constructor(
    @Inject(AppService)
    private readonly appService: AppService,
    @Inject(MetricsService)
    private readonly metricsService: MetricsService,
  ) {}

  @Get()
  getRoot() {
    return this.appService.getRoot();
  }

  @Get("health")
  async getHealth() {
    const health = await this.appService.getHealth();
    if (health.status !== "ok") {
      throw new ServiceUnavailableException(health);
    }
    return health;
  }

  @Get("metrics")
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  async getMetrics(
    @Headers("authorization") authorization?: string,
  ): Promise<string> {
    this.assertMetricsAccess(authorization);
    return this.metricsService.getMetrics();
  }

  private assertMetricsAccess(authorization?: string): void {
    const token = env.METRICS_TOKEN;
    if (!token) {
      // Production requires a scrape token; without one the endpoint is hidden.
      if (env.NODE_ENV === "production") throw new NotFoundException();
      return;
    }
    // Compare fixed-length digests so the check does not leak token length or content.
    if (
      !timingSafeEqual(digest(authorization ?? ""), digest(`Bearer ${token}`))
    ) {
      throw new UnauthorizedException();
    }
  }
}
