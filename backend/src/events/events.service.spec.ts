import { describe, it, expect, beforeEach } from "vitest";
import { EventsService } from "./events.service";

describe("EventsService - SSE Streaming", () => {
  let service: EventsService;

  beforeEach(() => {
    service = new EventsService();
  });

  it("should stream events targeted directly to a specific user", async () => {
    const received: Array<{ type?: string; targetUserId?: string; organizationId?: string; role?: string }> = [];
    const sub = service.subscribe("usr-target").subscribe((msg) => {
      if (msg.data && typeof msg.data === "object") {
        received.push(msg.data as { type?: string; targetUserId?: string; organizationId?: string; role?: string });
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

    const appEvents = received.filter((e) => e.type !== "CONNECTED" && e.type !== "HEARTBEAT");
    expect(appEvents.length).toBe(1);
    expect(appEvents[0].targetUserId).toBe("usr-target");
    expect(appEvents[0].type).toBe("MEMBER_REMOVED");

    sub.unsubscribe();
  });

  it("should stream org broadcast events only to confirmed members of that org", async () => {
    const receivedOrgA: Array<{ type?: string; organizationId?: string; role?: string }> = [];
    const receivedOrgB: Array<{ type?: string; organizationId?: string; role?: string }> = [];

    // User A in Org A, User B in Org B
    const subA = service.subscribe("usr-admin-a", ["org-A"]).subscribe((msg) => {
      if (msg.data && typeof msg.data === "object") {
        receivedOrgA.push(msg.data as { type?: string; organizationId?: string; role?: string });
      }
    });

    const subB = service.subscribe("usr-admin-b", ["org-B"]).subscribe((msg) => {
      if (msg.data && typeof msg.data === "object") {
        receivedOrgB.push(msg.data as { type?: string; organizationId?: string; role?: string });
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
    const eventsA = receivedOrgA.filter((e) => e.type !== "CONNECTED" && e.type !== "HEARTBEAT");
    const eventsB = receivedOrgB.filter((e) => e.type !== "CONNECTED" && e.type !== "HEARTBEAT");

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
});
