import { describe, it, expect, vi } from "vitest";
import { AppService } from "./app.service";
import type { PrismaService } from "./prisma/prisma.service";

describe("AppService", () => {
  it("should return root welcome message", () => {
    const service = new AppService({} as PrismaService);
    expect(service.getRoot()).toEqual({
      message: "hello from create-prisma + nest",
    });
  });

  it("should return ok health status when database query succeeds", async () => {
    const mockPrisma = {
      db: {
        orm: {
          public: {
            User: {
              select: () => ({
                first: vi.fn().mockResolvedValue({ id: "1" }),
              }),
            },
          },
        },
      },
    };

    const service = new AppService(mockPrisma as unknown as PrismaService);
    const health = await service.getHealth();

    expect(health.status).toBe("ok");
    expect(health.services.database).toBe("up");
    expect(health.timestamp).toBeDefined();
    expect(health.uptime).toBeGreaterThanOrEqual(0);
  });

  it("should return degraded health status when database query fails", async () => {
    const mockPrisma = {
      db: {
        orm: {
          public: {
            User: {
              select: () => ({
                first: vi.fn().mockRejectedValue(new Error("DB Down")),
              }),
            },
          },
        },
      },
    };

    const service = new AppService(mockPrisma as unknown as PrismaService);
    const health = await service.getHealth();

    expect(health.status).toBe("degraded");
    expect(health.services.database).toBe("down");
  });
});
