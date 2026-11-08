import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PrismaService } from "./prisma.service";
import { backendEnv } from "../config/env";

describe("PrismaService", () => {
  let service: PrismaService;
  const originalEnvValues = {
    NODE_ENV: backendEnv.NODE_ENV,
    SEED_DEMO_ON_BOOT: backendEnv.SEED_DEMO_ON_BOOT,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (backendEnv as { NODE_ENV: string }).NODE_ENV = "test";
    (backendEnv as { SEED_DEMO_ON_BOOT: boolean }).SEED_DEMO_ON_BOOT = false;
    service = new PrismaService();
    // Mock PrismaClient methods
    service.$connect = vi.fn().mockResolvedValue(undefined as never);
    service.$disconnect = vi.fn().mockResolvedValue(undefined as never);
    Object.assign(service, {
      user: {
        findFirst: vi.fn(),
        upsert: vi.fn(),
      },
      organization: {
        upsert: vi.fn(),
      },
    });
  });

  afterEach(() => {
    (backendEnv as { NODE_ENV: string }).NODE_ENV = originalEnvValues.NODE_ENV;
    (backendEnv as { SEED_DEMO_ON_BOOT: boolean }).SEED_DEMO_ON_BOOT =
      originalEnvValues.SEED_DEMO_ON_BOOT;
  });

  it("should connect database and NOT call user upsert by default (no auto seed)", async () => {
    await service.onModuleInit();

    expect(service.$connect).toHaveBeenCalledTimes(1);
    expect(service.user.upsert).not.toHaveBeenCalled();
    expect(service.organization.upsert).not.toHaveBeenCalled();
  });

  it("should not seed demo accounts when NODE_ENV is production even if SEED_DEMO_ON_BOOT is true", async () => {
    (backendEnv as { NODE_ENV: string }).NODE_ENV = "production";
    (backendEnv as { SEED_DEMO_ON_BOOT: boolean }).SEED_DEMO_ON_BOOT = true;

    await service.onModuleInit();

    expect(service.$connect).toHaveBeenCalledTimes(1);
    expect(service.user.findFirst).not.toHaveBeenCalled();
    expect(service.user.upsert).not.toHaveBeenCalled();
    expect(service.organization.upsert).not.toHaveBeenCalled();
  });

  it("should seed demo accounts when SEED_DEMO_ON_BOOT=true in non-production", async () => {
    (backendEnv as { NODE_ENV: string }).NODE_ENV = "development";
    (backendEnv as { SEED_DEMO_ON_BOOT: boolean }).SEED_DEMO_ON_BOOT = true;

    vi.mocked(service.user.findFirst).mockResolvedValueOnce(null as never);
    vi.mocked(service.organization.upsert).mockResolvedValueOnce({} as never);
    vi.mocked(service.user.upsert).mockResolvedValue({} as never);

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await service.onModuleInit();

    expect(service.$connect).toHaveBeenCalledTimes(1);
    expect(service.user.findFirst).toHaveBeenCalledTimes(1);
    expect(service.organization.upsert).toHaveBeenCalledTimes(1);
    expect(service.user.upsert).toHaveBeenCalledTimes(2);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Initialized default demo accounts"),
    );

    consoleSpy.mockRestore();
  });

  it("should skip seed when SEED_DEMO_ON_BOOT=true but users already exist", async () => {
    (backendEnv as { NODE_ENV: string }).NODE_ENV = "development";
    (backendEnv as { SEED_DEMO_ON_BOOT: boolean }).SEED_DEMO_ON_BOOT = true;

    vi.mocked(service.user.findFirst).mockResolvedValueOnce({
      id: "existing-user",
    } as never);

    await service.onModuleInit();

    expect(service.$connect).toHaveBeenCalledTimes(1);
    expect(service.user.findFirst).toHaveBeenCalledTimes(1);
    expect(service.organization.upsert).not.toHaveBeenCalled();
    expect(service.user.upsert).not.toHaveBeenCalled();
  });

  it("should catch errors during onModuleInit without throwing (non-fatal)", async () => {
    vi.mocked(service.$connect).mockRejectedValueOnce(
      new Error("Connection refused") as never,
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(service.onModuleInit()).resolves.not.toThrow();

    expect(warnSpy).toHaveBeenCalledWith(
      "Database connection pending or initializing...",
      "Connection refused",
    );

    warnSpy.mockRestore();
  });

  it("should disconnect on onModuleDestroy", async () => {
    await service.onModuleDestroy();
    expect(service.$disconnect).toHaveBeenCalledTimes(1);
  });
});
