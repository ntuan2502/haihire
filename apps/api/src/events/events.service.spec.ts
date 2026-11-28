import { describe, it, expect, beforeEach, vi } from "vitest";
import { EventsService } from "./events.service";
import type { JwtService } from "@nestjs/jwt";
import type { PrismaService } from "../prisma/prisma.service";

describe("EventsService - SSE Streaming", () => {
  let service: EventsService;

  beforeEach(() => {
    service = new EventsService();
  });

  const createAuthenticatedService = (
    userId: string,
    orgIds: string[] = [],
    redisClient?: unknown,
  ) => {
    const mockJwt = {
      verify: vi
        .fn()
        .mockReturnValue({ sub: userId, type: "access", tokenVersion: 0 }),
    };
    const mockPrisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: userId, tokenVersion: 0 }),
      },
      organizationMember: {
        findMany: vi
          .fn()
          .mockResolvedValue(
            orgIds.map((organizationId) => ({ organizationId })),
          ),
      },
    };
    return new EventsService(
      mockJwt as unknown as JwtService,
      mockPrisma as unknown as PrismaService,
      redisClient as never,
    );
  };

  it("should stream events targeted directly to a specific user", async () => {
    const authService = createAuthenticatedService("usr-target");
    const received: Array<{
      type?: string;
      targetUserId?: string;
      organizationId?: string;
      role?: string;
    }> = [];
    const sub = authService
      .subscribeWithToken("token-target")
      .subscribe((msg) => {
        if (msg.data && typeof msg.data === "object") {
          received.push(
            msg.data as {
              type?: string;
              targetUserId?: string;
              organizationId?: string;
              role?: string;
            },
          );
        }
      });

    await vi.waitFor(() =>
      expect(received.some((e) => e.type === "CONNECTED")).toBe(true),
    );

    authService.emit({
      type: "MEMBER_REMOVED",
      targetUserId: "usr-other",
    });

    authService.emit({
      type: "MEMBER_REMOVED",
      targetUserId: "usr-target",
      organizationId: "org-1",
    });

    await vi.waitFor(() =>
      expect(
        received.filter(
          (e) => e.type !== "CONNECTED" && e.type !== "HEARTBEAT",
        ),
      ).toHaveLength(1),
    );

    const appEvents = received.filter(
      (e) => e.type !== "CONNECTED" && e.type !== "HEARTBEAT",
    );
    expect(appEvents.length).toBe(1);
    expect(appEvents[0].targetUserId).toBe("usr-target");
    expect(appEvents[0].type).toBe("MEMBER_REMOVED");

    sub.unsubscribe();
  });

  it("should stream org broadcast events only to confirmed members of that org", async () => {
    const serviceA = createAuthenticatedService("usr-admin-a", ["org-A"]);
    const serviceB = createAuthenticatedService("usr-admin-b", ["org-B"]);
    const receivedOrgA: Array<{
      type?: string;
      organizationId?: string;
      role?: string;
    }> = [];
    const receivedOrgB: Array<{
      type?: string;
      organizationId?: string;
      role?: string;
    }> = [];

    const subA = serviceA
      .subscribeWithToken("token-admin-a")
      .subscribe((msg) => {
        if (msg.data && typeof msg.data === "object") {
          receivedOrgA.push(
            msg.data as {
              type?: string;
              organizationId?: string;
              role?: string;
            },
          );
        }
      });

    const subB = serviceB
      .subscribeWithToken("token-admin-b")
      .subscribe((msg) => {
        if (msg.data && typeof msg.data === "object") {
          receivedOrgB.push(
            msg.data as {
              type?: string;
              organizationId?: string;
              role?: string;
            },
          );
        }
      });

    await vi.waitFor(() => {
      expect(receivedOrgA.some((e) => e.type === "CONNECTED")).toBe(true);
      expect(receivedOrgB.some((e) => e.type === "CONNECTED")).toBe(true);
    });

    serviceA.emit({
      type: "MEMBER_ROLE_UPDATED",
      organizationId: "org-A",
      role: "ADMIN",
    });
    serviceB.emit({
      type: "MEMBER_ROLE_UPDATED",
      organizationId: "org-A",
      role: "ADMIN",
    });

    serviceA.emit({
      type: "ORG_UPDATED",
      organizationId: "org-B",
    });
    serviceB.emit({
      type: "ORG_UPDATED",
      organizationId: "org-B",
    });

    await vi.waitFor(() => {
      expect(
        receivedOrgA.filter(
          (e) => e.type !== "CONNECTED" && e.type !== "HEARTBEAT",
        ),
      ).toHaveLength(1);
      expect(
        receivedOrgB.filter(
          (e) => e.type !== "CONNECTED" && e.type !== "HEARTBEAT",
        ),
      ).toHaveLength(1);
    });

    const eventsA = receivedOrgA.filter(
      (e) => e.type !== "CONNECTED" && e.type !== "HEARTBEAT",
    );
    const eventsB = receivedOrgB.filter(
      (e) => e.type !== "CONNECTED" && e.type !== "HEARTBEAT",
    );

    expect(eventsA.length).toBe(1);
    expect(eventsA[0].type).toBe("MEMBER_ROLE_UPDATED");
    expect(eventsA[0].organizationId).toBe("org-A");

    expect(eventsB.length).toBe(1);
    expect(eventsB[0].type).toBe("ORG_UPDATED");
    expect(eventsB[0].organizationId).toBe("org-B");

    subA.unsubscribe();
    subB.unsubscribe();
  });

  it("should throw AppUnauthorizedException when no token is provided to subscribeWithToken", () => {
    expect(() => service.subscribeWithToken()).toThrow();
  });

  it("should throw AppUnauthorizedException when token verification fails", () => {
    const mockJwt = {
      verify: () => {
        throw new Error("Invalid token");
      },
    };
    const s = new EventsService(mockJwt as never);
    expect(() => s.subscribeWithToken("bad-token")).toThrow();
  });

  it("should subscribe successfully when token is valid", () => {
    const mockJwt = {
      verify: () => ({ sub: "user-123" }),
    };
    const s = new EventsService(mockJwt as never);
    const obs = s.subscribeWithToken("valid-token");
    expect(obs).toBeDefined();
  });

  describe("Live session authorization", () => {
    const setup = () => {
      const verify = vi.fn().mockReturnValue({
        sub: "user-1",
        tokenVersion: 1,
        organizationId: "org-stale",
      });
      const findUnique = vi
        .fn()
        .mockResolvedValue({ id: "user-1", tokenVersion: 1 });
      const findMany = vi
        .fn()
        .mockResolvedValue([{ organizationId: "org-current" }]);
      const events = new EventsService(
        { verify } as unknown as JwtService,
        {
          user: { findUnique },
          organizationMember: { findMany },
        } as unknown as PrismaService,
      );
      return { events, verify, findUnique, findMany };
    };

    it("rejects refresh tokens", () => {
      const { events, verify } = setup();
      verify.mockReturnValue({ sub: "user-1", type: "refresh" });
      expect(() => events.subscribeWithToken("refresh")).toThrow();
    });

    it("uses current membership instead of the token's stale organization", async () => {
      const { events } = setup();
      const received: unknown[] = [];
      const subscription = events
        .subscribeWithToken("access")
        .subscribe((message) => received.push(message.data));
      await vi.waitFor(() => expect(received).toHaveLength(1));
      events.emit({ type: "ORG_UPDATED", organizationId: "org-stale" });
      events.emit({ type: "ORG_UPDATED", organizationId: "org-current" });
      await vi.waitFor(() => expect(received).toHaveLength(2));
      expect(received[1]).toEqual({
        type: "ORG_UPDATED",
        organizationId: "org-current",
      });
      subscription.unsubscribe();
    });

    it("rechecks memberships before forwarding the next event", async () => {
      const { events, findMany } = setup();
      const received: unknown[] = [];
      const subscription = events
        .subscribeWithToken("access")
        .subscribe((message) => received.push(message.data));
      await vi.waitFor(() => expect(received).toHaveLength(1));
      findMany.mockResolvedValue([]);
      events.emit({ type: "ORG_UPDATED", organizationId: "org-current" });
      events.emit({ type: "PERMISSIONS_CHANGED", targetUserId: "user-1" });
      await vi.waitFor(() => expect(received).toHaveLength(2));
      expect(received[1]).toEqual({
        type: "PERMISSIONS_CHANGED",
        targetUserId: "user-1",
      });
      subscription.unsubscribe();
    });

    it.each(["revoked", "deleted", "database failure", "expired"])(
      "closes the stream before forwarding data when session is %s",
      async (condition) => {
        const { events, findUnique, findMany, verify } = setup();
        const received: unknown[] = [];
        const onError = vi.fn();
        const subscription = events.subscribeWithToken("access").subscribe({
          next: (message) => received.push(message.data),
          error: onError,
        });
        await vi.waitFor(() => expect(received).toHaveLength(1));
        if (condition === "revoked")
          findUnique.mockResolvedValue({ id: "user-1", tokenVersion: 2 });
        if (condition === "deleted") findUnique.mockResolvedValue(null);
        if (condition === "database failure")
          findMany.mockRejectedValue(new Error("offline"));
        if (condition === "expired")
          verify.mockImplementation(() => {
            throw new Error("expired");
          });
        events.emit({ type: "ORG_UPDATED", organizationId: "org-current" });
        await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce());
        expect(received).toHaveLength(1);
        expect(subscription.closed).toBe(true);
      },
    );

    it("does not query database on heartbeat", async () => {
      vi.useFakeTimers();
      try {
        const { events, findUnique } = setup();
        const received: unknown[] = [];
        const subscription = events
          .subscribeWithToken("access")
          .subscribe((message) => received.push(message.data));
        await vi.advanceTimersByTimeAsync(0);
        expect(received).toHaveLength(1);
        expect(findUnique).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(15000);
        expect(received).toHaveLength(2);
        expect(findUnique).toHaveBeenCalledTimes(1);
        subscription.unsubscribe();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("Valkey / Redis Pub/Sub Multi-Replica Streaming (F-008)", () => {
    it("publishes events to Valkey/Redis channel when redisClient is available", async () => {
      const mockPublish = vi.fn().mockResolvedValue(1);
      const mockRedis = {
        publish: mockPublish,
        duplicate: vi.fn(),
      };

      const s = new EventsService(undefined, undefined, mockRedis as never);
      s.emit({
        type: "ORG_UPDATED",
        organizationId: "org-1",
      });

      expect(mockPublish).toHaveBeenCalledWith(
        "haihire:events",
        JSON.stringify({
          type: "ORG_UPDATED",
          organizationId: "org-1",
        }),
      );
    });

    it("subscribes to channel on module init and forwards incoming messages to local observers", async () => {
      let messageHandler: ((channel: string, message: string) => void) | null =
        null;
      const mockSubscriber = {
        connect: vi.fn().mockResolvedValue(undefined),
        subscribe: vi.fn().mockResolvedValue(undefined),
        on: vi
          .fn()
          .mockImplementation(
            (event: string, cb: (channel: string, msg: string) => void) => {
              if (event === "message") {
                messageHandler = cb;
              }
            },
          ),
        unsubscribe: vi.fn().mockResolvedValue(undefined),
        quit: vi.fn().mockResolvedValue("OK"),
        disconnect: vi.fn(),
      };

      const mockRedis = {
        publish: vi.fn().mockResolvedValue(1),
        duplicate: vi.fn().mockReturnValue(mockSubscriber),
      };

      const s = createAuthenticatedService("user-1", ["org-1"], mockRedis);
      await s.onModuleInit();

      expect(mockRedis.duplicate).toHaveBeenCalled();
      expect(mockSubscriber.subscribe).toHaveBeenCalledWith("haihire:events");

      const received: Array<{ type?: string; organizationId?: string }> = [];
      const sub = s.subscribeWithToken("token-1").subscribe((msg) => {
        if (msg.data && typeof msg.data === "object") {
          received.push(msg.data as { type?: string; organizationId?: string });
        }
      });

      await vi.waitFor(() =>
        expect(received.some((e) => e.type === "CONNECTED")).toBe(true),
      );

      // Simulate incoming message from Redis pub/sub
      expect(messageHandler).toBeDefined();
      messageHandler!(
        "haihire:events",
        JSON.stringify({
          type: "ORG_UPDATED",
          organizationId: "org-1",
        }),
      );

      await vi.waitFor(() =>
        expect(
          received.filter(
            (e) => e.type !== "CONNECTED" && e.type !== "HEARTBEAT",
          ),
        ).toHaveLength(1),
      );

      const events = received.filter(
        (e) => e.type !== "CONNECTED" && e.type !== "HEARTBEAT",
      );
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("ORG_UPDATED");
      expect(events[0].organizationId).toBe("org-1");

      await s.onModuleDestroy();
      expect(mockSubscriber.unsubscribe).toHaveBeenCalledWith("haihire:events");
      sub.unsubscribe();
    });

    it("falls back to in-memory broadcast if redisClient publish rejects", async () => {
      const mockPublish = vi
        .fn()
        .mockRejectedValue(new Error("Connection lost"));
      const mockRedis = {
        publish: mockPublish,
        duplicate: vi.fn(),
      };

      const s = createAuthenticatedService("user-1", ["org-1"], mockRedis);
      const received: Array<{ type?: string }> = [];
      const sub = s.subscribeWithToken("token-1").subscribe((msg) => {
        if (msg.data && typeof msg.data === "object") {
          received.push(msg.data as { type?: string });
        }
      });

      await vi.waitFor(() =>
        expect(received.some((e) => e.type === "CONNECTED")).toBe(true),
      );

      s.emit({
        type: "ORG_UPDATED",
        organizationId: "org-1",
      });

      await vi.waitFor(() =>
        expect(
          received.filter(
            (e) => e.type !== "CONNECTED" && e.type !== "HEARTBEAT",
          ),
        ).toHaveLength(1),
      );

      const events = received.filter(
        (e) => e.type !== "CONNECTED" && e.type !== "HEARTBEAT",
      );
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("ORG_UPDATED");

      sub.unsubscribe();
    });

    it("broadcasts domain change events to all connected members in the organization", async () => {
      const s = createAuthenticatedService("user-1", ["org-1"]);
      const receivedUser1: Array<{
        type?: string;
        organizationId?: string | null;
      }> = [];
      const receivedUser2: Array<{
        type?: string;
        organizationId?: string | null;
      }> = [];

      const sub1 = s.subscribeWithToken("token-user-1").subscribe((msg) => {
        if (msg.data && typeof msg.data === "object") {
          receivedUser1.push(
            msg.data as { type?: string; organizationId?: string | null },
          );
        }
      });
      const sub2 = s.subscribeWithToken("token-user-2").subscribe((msg) => {
        if (msg.data && typeof msg.data === "object") {
          receivedUser2.push(
            msg.data as { type?: string; organizationId?: string | null },
          );
        }
      });

      await vi.waitFor(() => {
        expect(receivedUser1.some((e) => e.type === "CONNECTED")).toBe(true);
        expect(receivedUser2.some((e) => e.type === "CONNECTED")).toBe(true);
      });

      s.emit({
        type: "APPLICATIONS_CHANGED",
        organizationId: "org-1",
        data: { applicationId: "app-1" },
      });
      s.emit({
        type: "MEMBERS_CHANGED",
        organizationId: "org-1",
        data: { memberId: "mem-1" },
      });

      await vi.waitFor(() => {
        expect(
          receivedUser1.filter(
            (e) => e.type !== "CONNECTED" && e.type !== "HEARTBEAT",
          ),
        ).toHaveLength(2);
        expect(
          receivedUser2.filter(
            (e) => e.type !== "CONNECTED" && e.type !== "HEARTBEAT",
          ),
        ).toHaveLength(2);
      });

      const user1Events = receivedUser1.filter(
        (e) => e.type !== "CONNECTED" && e.type !== "HEARTBEAT",
      );
      const user2Events = receivedUser2.filter(
        (e) => e.type !== "CONNECTED" && e.type !== "HEARTBEAT",
      );

      expect(user1Events.map((e) => e.type)).toEqual([
        "APPLICATIONS_CHANGED",
        "MEMBERS_CHANGED",
      ]);
      expect(user2Events.map((e) => e.type)).toEqual([
        "APPLICATIONS_CHANGED",
        "MEMBERS_CHANGED",
      ]);

      sub1.unsubscribe();
      sub2.unsubscribe();
    });

    it("caches user tokenVersion & org memberships briefly across rapid SSE event bursts and evicts cache on MEMBERS_CHANGED", async () => {
      const findUnique = vi
        .fn()
        .mockResolvedValue({ id: "user-1", tokenVersion: 0 });
      const findMany = vi.fn().mockResolvedValue([{ organizationId: "org-1" }]);
      const mockJwt = {
        verify: vi
          .fn()
          .mockReturnValue({ sub: "user-1", type: "access", tokenVersion: 0 }),
      };
      const mockPrisma = {
        user: { findUnique },
        organizationMember: { findMany },
      };

      const s = new EventsService(mockJwt as never, mockPrisma as never);
      const received: unknown[] = [];
      const sub = s.subscribeWithToken("jwt-1").subscribe((msg) => {
        received.push(msg.data);
      });

      await new Promise((r) => setTimeout(r, 10));
      const initialFindUniqueCalls = findUnique.mock.calls.length;

      s.emit({ type: "APPLICATIONS_CHANGED", organizationId: "org-1" });
      s.emit({ type: "JOBS_CHANGED", organizationId: "org-1" });
      s.emit({ type: "CANDIDATES_CHANGED", organizationId: "org-1" });

      await new Promise((r) => setTimeout(r, 20));
      // 3 rapid domain events should reuse cached validation (at most 1 fresh check, not 3 additional queries)
      expect(
        findUnique.mock.calls.length - initialFindUniqueCalls,
      ).toBeLessThanOrEqual(1);

      // Emitting MEMBERS_CHANGED must evict validation cache so DB is queried fresh
      const beforeEvictCalls = findUnique.mock.calls.length;
      s.emit({ type: "MEMBERS_CHANGED", organizationId: "org-1" });
      await new Promise((r) => setTimeout(r, 15));
      expect(findUnique.mock.calls.length).toBeGreaterThan(beforeEvictCalls);

      sub.unsubscribe();
    });

    it("rejects SSE connection when UserSession referenced by sid is revoked", async () => {
      const mockJwt = {
        verify: vi.fn().mockReturnValue({
          sub: "user-1",
          type: "access",
          tokenVersion: 0,
          sid: "session-revoked",
        }),
      };
      const mockPrisma = {
        user: {
          findUnique: vi
            .fn()
            .mockResolvedValue({ id: "user-1", tokenVersion: 0 }),
        },
        userSession: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
        organizationMember: {
          findMany: vi.fn().mockResolvedValue([{ organizationId: "org-1" }]),
        },
      };

      const s = new EventsService(mockJwt as never, mockPrisma as never);
      await expect(
        new Promise((resolve, reject) => {
          s.subscribeWithToken("jwt-revoked").subscribe({
            next: resolve,
            error: reject,
          });
        }),
      ).rejects.toThrow("User session revoked");
    });
  });
});
