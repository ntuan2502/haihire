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

  it("should stream org broadcast events to listeners", async () => {
    const received: Array<{ type?: string; targetUserId?: string; organizationId?: string; role?: string }> = [];
    const sub = service.subscribe("usr-admin").subscribe((msg) => {
      if (msg.data && typeof msg.data === "object") {
        received.push(msg.data as { type?: string; targetUserId?: string; organizationId?: string; role?: string });
      }
    });

    service.emit({
      type: "MEMBER_ROLE_UPDATED",
      targetUserId: "usr-member",
      role: "ADMIN",
      organizationId: "org-1",
    });

    const appEvents = received.filter((e) => e.type !== "CONNECTED" && e.type !== "HEARTBEAT");
    expect(appEvents.length).toBe(1);
    expect(appEvents[0].role).toBe("ADMIN");

    sub.unsubscribe();
  });
});
