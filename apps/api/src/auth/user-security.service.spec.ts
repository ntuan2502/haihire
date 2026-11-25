import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { UserSecurityService } from "./user-security.service";

describe("UserSecurityService", () => {
  let service: UserSecurityService;
  let mockPrisma: {
    userSession: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    userSecurityLog: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      userSession: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      userSecurityLog: {
        create: vi.fn().mockResolvedValue({ id: "log-1" }),
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };
    service = new UserSecurityService(mockPrisma as never);
  });

  it("listActiveSessions marks matching currentSessionId with isCurrent = true", async () => {
    mockPrisma.userSession.findMany.mockResolvedValue([
      {
        id: "sess-1",
        ipAddress: "127.0.0.1",
        userAgent: "Chrome",
        lastActiveAt: new Date("2026-11-25T08:00:00Z"),
        expiresAt: new Date("2026-12-02T08:00:00Z"),
        createdAt: new Date("2026-11-25T07:00:00Z"),
      },
      {
        id: "sess-2",
        ipAddress: "10.0.0.2",
        userAgent: "Firefox",
        lastActiveAt: new Date("2026-11-24T08:00:00Z"),
        expiresAt: new Date("2026-12-01T08:00:00Z"),
        createdAt: new Date("2026-11-24T07:00:00Z"),
      },
    ]);

    const result = await service.listActiveSessions("usr-1", "sess-1");

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "sess-1", isCurrent: true });
    expect(result[1]).toMatchObject({ id: "sess-2", isCurrent: false });
  });

  it("revokeSession throws NotFoundException when session does not belong to user or is already revoked", async () => {
    mockPrisma.userSession.findUnique.mockResolvedValue(null);

    await expect(
      service.revokeSession("usr-1", "missing-sess"),
    ).rejects.toThrow(NotFoundException);
  });

  it("revokeSession marks owned session revoked and records AUTH_SESSION_REVOKED", async () => {
    mockPrisma.userSession.findUnique.mockResolvedValue({
      id: "sess-2",
      userId: "usr-1",
      ipAddress: "10.0.0.2",
      userAgent: "Safari",
      revokedAt: null,
    });
    mockPrisma.userSession.update.mockResolvedValue({ id: "sess-2" });

    const res = await service.revokeSession("usr-1", "sess-2");

    expect(res).toEqual({ success: true });
    expect(mockPrisma.userSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sess-2" },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      }),
    );
    expect(mockPrisma.userSecurityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "usr-1",
          action: "AUTH_SESSION_REVOKED",
          status: "SUCCESS",
        }),
      }),
    );
  });

  it("revokeOtherSessions excludes currentSessionId and records AUTH_ALL_SESSIONS_REVOKED", async () => {
    mockPrisma.userSession.updateMany.mockResolvedValue({ count: 3 });

    const res = await service.revokeOtherSessions("usr-1", "sess-current");

    expect(res).toEqual({ success: true, revokedCount: 3 });
    expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "usr-1",
          revokedAt: null,
          id: { not: "sess-current" },
        }),
      }),
    );
    expect(mockPrisma.userSecurityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "usr-1",
          action: "AUTH_ALL_SESSIONS_REVOKED",
        }),
      }),
    );
  });

  it("listSecurityLogs applies category filters and returns total & paginated entries", async () => {
    mockPrisma.userSecurityLog.findMany.mockResolvedValue([
      {
        id: "log-1",
        userId: "usr-1",
        action: "AUTH_LOGIN",
        status: "SUCCESS",
        ipAddress: "127.0.0.1",
        userAgent: "Chrome",
        requestId: null,
        metadata: null,
        createdAt: new Date("2026-11-25T08:00:00Z"),
      },
    ]);
    mockPrisma.userSecurityLog.count.mockResolvedValue(1);

    const res = await service.listSecurityLogs("usr-1", {
      category: "login",
      limit: 10,
      offset: 0,
    });

    expect(res.total).toBe(1);
    expect(res.data[0].action).toBe("AUTH_LOGIN");
    expect(mockPrisma.userSecurityLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "usr-1",
          action: { in: ["AUTH_LOGIN", "AUTH_LOGIN_FAILED", "AUTH_LOGOUT"] },
        }),
      }),
    );
  });

  it("logEvent fails open when database insert throws", async () => {
    mockPrisma.userSecurityLog.create.mockRejectedValueOnce(
      new Error("db temporary issue"),
    );

    await expect(
      service.logEvent("usr-1", "AUTH_LOGIN"),
    ).resolves.toBeUndefined();
  });
});
