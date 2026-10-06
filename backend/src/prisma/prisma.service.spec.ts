import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrismaService } from "./prisma.service";
import * as dbModule from "./db";

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

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PrismaService();
  });

  it("should have db property defined", () => {
    expect(service.db).toBeDefined();
    expect(service.db).toBe(dbModule.db);
  });

  it("should connect database and skip seed when users already exist", async () => {
    vi.mocked(dbModule.connectDatabase).mockResolvedValueOnce(undefined as never);
    vi.mocked(dbModule.db.orm.public.User.first).mockResolvedValueOnce({ id: "existing-user" } as never);

    await service.onModuleInit();

    expect(dbModule.connectDatabase).toHaveBeenCalledTimes(1);
    expect(dbModule.db.orm.public.User.first).toHaveBeenCalledTimes(1);
    expect(dbModule.db.orm.public.Organization.upsert).not.toHaveBeenCalled();
    expect(dbModule.db.orm.public.User.upsert).not.toHaveBeenCalled();
  });

  it("should seed demo accounts when no users exist", async () => {
    vi.mocked(dbModule.connectDatabase).mockResolvedValueOnce(undefined as never);
    vi.mocked(dbModule.db.orm.public.User.first).mockResolvedValueOnce(null as never);
    vi.mocked(dbModule.db.orm.public.Organization.upsert).mockResolvedValueOnce({} as never);
    vi.mocked(dbModule.db.orm.public.User.upsert).mockResolvedValue({} as never);

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await service.onModuleInit();

    expect(dbModule.connectDatabase).toHaveBeenCalledTimes(1);
    expect(dbModule.db.orm.public.User.first).toHaveBeenCalledTimes(1);
    expect(dbModule.db.orm.public.Organization.upsert).toHaveBeenCalledTimes(1);
    expect(dbModule.db.orm.public.User.upsert).toHaveBeenCalledTimes(2);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Initialized default demo accounts"));

    consoleSpy.mockRestore();
  });

  it("should catch errors during onModuleInit without throwing", async () => {
    vi.mocked(dbModule.connectDatabase).mockRejectedValueOnce(new Error("Connection refused"));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(service.onModuleInit()).resolves.not.toThrow();

    expect(warnSpy).toHaveBeenCalledWith(
      "Database connection pending or initializing...",
      "Connection refused",
    );

    warnSpy.mockRestore();
  });
});
