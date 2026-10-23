import { describe, it, expect, beforeEach, vi } from "vitest";
import { EventsService } from "./events.service";

describe("EventsService - SSE Streaming", () => {
  let service: EventsService;

  beforeEach(() => {
    service = new EventsService();
  });

  it("should stream events targeted directly to a specific user", async () => {
    const received: Array<{
      type?: string;
      targetUserId?: string;
      organizationId?: string;
      role?: string;
    }> = [];
    const sub = service.subscribe("usr-target").subscribe((msg) => {
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

    service.emit({
      type: "MEMBER_REMOVED",
      targetUserId: "usr-other",
    });

    service.emit({
      type: "MEMBER_REMOVED",
      targetUserId: "usr-target",
      organizationId: "org-1",
    });

    const appEvents = received.filter(
      (e) => e.type !== "CONNECTED" && e.type !== "HEARTBEAT",
    );
    expect(appEvents.length).toBe(1);
    expect(appEvents[0].targetUserId).toBe("usr-target");
    expect(appEvents[0].type).toBe("MEMBER_REMOVED");

    sub.unsubscribe();
  });

  it("should stream org broadcast events only to confirmed members of that org", async () => {
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

    // User A in Org A, User B in Org B
    const subA = service
      .subscribe("usr-admin-a", ["org-A"])
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

    const subB = service
      .subscribe("usr-admin-b", ["org-B"])
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

    // 1. Emit event for Org A
    service.emit({
      type: "MEMBER_ROLE_UPDATED",
      organizationId: "org-A",
      role: "ADMIN",
    });

    // 2. Emit event for Org B
    service.emit({
      type: "ORG_UPDATED",
      organizationId: "org-B",
    });

    // Filter out HEARTBEAT / CONNECTED
    const eventsA = receivedOrgA.filter(
      (e) => e.type !== "CONNECTED" && e.type !== "HEARTBEAT",
    );
    const eventsB = receivedOrgB.filter(
      (e) => e.type !== "CONNECTED" && e.type !== "HEARTBEAT",
    );

    // Org A receives ONLY Org A event
    expect(eventsA.length).toBe(1);
    expect(eventsA[0].type).toBe("MEMBER_ROLE_UPDATED");
    expect(eventsA[0].organizationId).toBe("org-A");

    // Org B receives ONLY Org B event
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

      const s = new EventsService(undefined, undefined, mockRedis as never);
      await s.onModuleInit();

      expect(mockRedis.duplicate).toHaveBeenCalled();
      expect(mockSubscriber.subscribe).toHaveBeenCalledWith("haihire:events");

      const received: Array<{ type?: string; organizationId?: string }> = [];
      const sub = s.subscribe("user-1", ["org-1"]).subscribe((msg) => {
        if (msg.data && typeof msg.data === "object") {
          received.push(msg.data as { type?: string; organizationId?: string });
        }
      });

      // Simulate incoming message from Redis pub/sub
      expect(messageHandler).toBeDefined();
      messageHandler!(
        "haihire:events",
        JSON.stringify({
          type: "ORG_UPDATED",
          organizationId: "org-1",
        }),
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

      const s = new EventsService(undefined, undefined, mockRedis as never);
      const received: Array<{ type?: string }> = [];
      const sub = s.subscribe("user-1", ["org-1"]).subscribe((msg) => {
        if (msg.data && typeof msg.data === "object") {
          received.push(msg.data as { type?: string });
        }
      });

      s.emit({
        type: "ORG_UPDATED",
        organizationId: "org-1",
      });

      // Allow microtask to process catch handler
      await new Promise((resolve) => setTimeout(resolve, 10));

      const events = received.filter(
        (e) => e.type !== "CONNECTED" && e.type !== "HEARTBEAT",
      );
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("ORG_UPDATED");

      sub.unsubscribe();
    });
  });
});
