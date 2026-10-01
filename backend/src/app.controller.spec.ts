import { describe, it, expect, vi } from "vitest";
import { AppController } from "./app.controller";
import type { AppService, HealthCheckResult } from "./app.service";
import type { MetricsService } from "./metrics/metrics.service";
import { ServiceUnavailableException } from "@nestjs/common";

describe("AppController", () => {
  const mockMetrics = {
    getMetrics: vi.fn().mockReturnValue("# HELP metrics\n"),
  };

  it("should return root message", () => {
    const mockService = {
      getRoot: vi.fn().mockReturnValue({ message: "hello" }),
    };
    const controller = new AppController(
      mockService as unknown as AppService,
      mockMetrics as unknown as MetricsService,
    );
    expect(controller.getRoot()).toEqual({ message: "hello" });
  });

  it("should return health status 200 when all services are healthy", async () => {
    const mockHealth: HealthCheckResult = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: 100,
      services: {
        postgres: "up",
        redis: "up",
        minio: "up",
        database: "up",
      },
    };
    const mockService = {
      getHealth: vi.fn().mockResolvedValue(mockHealth),
    };

    const controller = new AppController(
      mockService as unknown as AppService,
      mockMetrics as unknown as MetricsService,
    );
    const result = await controller.getHealth();
    expect(result).toEqual(mockHealth);
  });

  it("should throw ServiceUnavailableException (HTTP 503) when any service is down", async () => {
    const mockDegraded: HealthCheckResult = {
      status: "degraded",
      timestamp: new Date().toISOString(),
      uptime: 100,
      services: {
        postgres: "up",
        redis: "down",
        minio: "up",
        database: "up",
      },
      downServices: ["redis"],
    };
    const mockService = {
      getHealth: vi.fn().mockResolvedValue(mockDegraded),
    };

    const controller = new AppController(
      mockService as unknown as AppService,
      mockMetrics as unknown as MetricsService,
    );
    await expect(controller.getHealth()).rejects.toThrow(ServiceUnavailableException);

    try {
      await controller.getHealth();
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ServiceUnavailableException);
      if (err instanceof ServiceUnavailableException) {
        expect(err.getStatus()).toBe(503);
        expect(err.getResponse()).toEqual(mockDegraded);
      }
    }
  });

  it("should return metrics string from MetricsService", () => {
    const mockService = {};
    const controller = new AppController(
      mockService as unknown as AppService,
      mockMetrics as unknown as MetricsService,
    );
    expect(controller.getMetrics()).toBe("# HELP metrics\n");
  });
});
