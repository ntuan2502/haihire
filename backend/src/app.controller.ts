import { Controller, Get, Header, Inject, ServiceUnavailableException } from "@nestjs/common";
import { AppService } from "./app.service";
import { MetricsService } from "./metrics/metrics.service";

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
  getMetrics() {
    return this.metricsService.getMetrics();
  }
}
