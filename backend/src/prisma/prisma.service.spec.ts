import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PrismaService } from "./prisma.service";
import * as dbModule from "./db";
import { backendEnv } from "../config/env";

vi.mock("./db", () => ({
  connectDatabase: vi.fn(),
  db: {
    orm: {
      public: {
        User: {
          select: vi.fn().mockReturnThis(),
          first: vi.fn(),
          upsert: vi.fn(),
        },
        Organization: {
          upsert: vi.fn(),
        },
      },
    },
  },
}));

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
  });

  afterEach(() => {
    (backendEnv as { NODE_ENV: string }).NODE_ENV = originalEnvValues.NODE_ENV;
    (backendEnv as { SEED_DEMO_ON_BOOT: boolean }).SEED_DEMO_ON_BOOT =
      originalEnvValues.SEED_DEMO_ON_BOOT;
  });

  it("should have db property defined", () => {
    expect(service.db).toBeDefined();
    expect(service.db).toBe(dbModule.db);
  });

  it("should connect database and NOT call user upsert by default (no auto seed)", async () => {
    vi.mocked(dbModule.connectDatabase).mockResolvedValueOnce(
      undefined as never,
    );

    await service.onModuleInit();

    expect(dbModule.connectDatabase).toHaveBeenCalledTimes(1);
    expect(dbModule.db.orm.public.User.upsert).not.toHaveBeenCalled();
    expect(dbModule.db.orm.public.Organization.upsert).not.toHaveBeenCalled();
  });

  it("should not seed demo accounts when NODE_ENV is production even if SEED_DEMO_ON_BOOT is true", async () => {
    (backendEnv as { NODE_ENV: string }).NODE_ENV = "production";
    (backendEnv as { SEED_DEMO_ON_BOOT: boolean }).SEED_DEMO_ON_BOOT = true;
    vi.mocked(dbModule.connectDatabase).mockResolvedValueOnce(
      undefined as never,
    );

    await service.onModuleInit();

    expect(dbModule.connectDatabase).toHaveBeenCalledTimes(1);
    expect(dbModule.db.orm.public.User.first).not.toHaveBeenCalled();
    expect(dbModule.db.orm.public.User.upsert).not.toHaveBeenCalled();
    expect(dbModule.db.orm.public.Organization.upsert).not.toHaveBeenCalled();
  });

  it("should seed demo accounts when SEED_DEMO_ON_BOOT=true in non-production", async () => {
    (backendEnv as { NODE_ENV: string }).NODE_ENV = "development";
    (backendEnv as { SEED_DEMO_ON_BOOT: boolean }).SEED_DEMO_ON_BOOT = true;

    vi.mocked(dbModule.connectDatabase).mockResolvedValueOnce(
      undefined as never,
    );
    vi.mocked(dbModule.db.orm.public.User.first).mockResolvedValueOnce(
      null as never,
    );
    vi.mocked(dbModule.db.orm.public.Organization.upsert).mockResolvedValueOnce(
      {} as never,
    );
    vi.mocked(dbModule.db.orm.public.User.upsert).mockResolvedValue(
      {} as never,
    );

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await service.onModuleInit();

    expect(dbModule.connectDatabase).toHaveBeenCalledTimes(1);
    expect(dbModule.db.orm.public.User.first).toHaveBeenCalledTimes(1);
    expect(dbModule.db.orm.public.Organization.upsert).toHaveBeenCalledTimes(1);
    expect(dbModule.db.orm.public.User.upsert).toHaveBeenCalledTimes(2);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Initialized default demo accounts"),
    );

    consoleSpy.mockRestore();
  });

  it("should skip seed when SEED_DEMO_ON_BOOT=true but users already exist", async () => {
    (backendEnv as { NODE_ENV: string }).NODE_ENV = "development";
    (backendEnv as { SEED_DEMO_ON_BOOT: boolean }).SEED_DEMO_ON_BOOT = true;

    vi.mocked(dbModule.connectDatabase).mockResolvedValueOnce(
      undefined as never,
    );
    vi.mocked(dbModule.db.orm.public.User.first).mockResolvedValueOnce({
      id: "existing-user",
    } as never);

    await service.onModuleInit();

    expect(dbModule.connectDatabase).toHaveBeenCalledTimes(1);
    expect(dbModule.db.orm.public.User.first).toHaveBeenCalledTimes(1);
    expect(dbModule.db.orm.public.Organization.upsert).not.toHaveBeenCalled();
    expect(dbModule.db.orm.public.User.upsert).not.toHaveBeenCalled();
  });

  it("should catch errors during onModuleInit without throwing (non-fatal)", async () => {
    vi.mocked(dbModule.connectDatabase).mockRejectedValueOnce(
      new Error("Connection refused"),
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(service.onModuleInit()).resolves.not.toThrow();

    expect(warnSpy).toHaveBeenCalledWith(
      "Database connection pending or initializing...",
      "Connection refused",
    );

    warnSpy.mockRestore();
  });
});
