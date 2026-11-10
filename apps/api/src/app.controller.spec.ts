import { describe, it, expect, vi } from "vitest";
import { AppController } from "./app.controller";
import type { AppService, HealthCheckResult } from "./app.service";
import type { MetricsService } from "./metrics/metrics.service";
import { ServiceUnavailableException } from "@nestjs/common";
import { env } from "./config/env";

describe("AppController", () => {
  const mockMetrics = {
    getMetrics: vi.fn().mockResolvedValue("# HELP metrics\n"),
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
    await expect(controller.getHealth()).rejects.toThrow(
      ServiceUnavailableException,
    );

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

  it("should return metrics string from MetricsService", async () => {
    const mockService = {};
    const controller = new AppController(
      mockService as unknown as AppService,
      mockMetrics as unknown as MetricsService,
    );
    expect(await controller.getMetrics()).toBe("# HELP metrics\n");
  });

  it("hides production metrics when the scrape token is absent", async () => {
    const previousMode = env.NODE_ENV;
    const previousToken = env.METRICS_TOKEN;
    env.NODE_ENV = "production";
    env.METRICS_TOKEN = undefined;
    const controller = new AppController(
      {} as AppService,
      mockMetrics as unknown as MetricsService,
    );
    try {
      await expect(controller.getMetrics()).rejects.toMatchObject({
        status: 404,
      });
    } finally {
      env.NODE_ENV = previousMode;
      env.METRICS_TOKEN = previousToken;
    }
  });

  it("requires the configured metrics bearer token", async () => {
    const previousToken = env.METRICS_TOKEN;
    const token = "a".repeat(32);
    env.METRICS_TOKEN = token;
    const controller = new AppController(
      {} as AppService,
      mockMetrics as unknown as MetricsService,
    );
    try {
      await expect(controller.getMetrics()).rejects.toMatchObject({
        status: 401,
      });
      await expect(
        controller.getMetrics(`Bearer ${"b".repeat(32)}`),
      ).rejects.toMatchObject({ status: 401 });
      await expect(controller.getMetrics(`Bearer ${token}`)).resolves.toBe(
        "# HELP metrics\n",
      );
    } finally {
      env.METRICS_TOKEN = previousToken;
    }
  });
});
