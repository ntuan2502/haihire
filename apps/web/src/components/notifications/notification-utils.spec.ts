import { describe, it, expect } from "vitest";
import type { WebsiteNotification } from "@haihire/shared";
import {
  formatNotificationContextLine,
  getNotificationHref,
  groupNotificationsByDate,
} from "./notification-utils";

describe("notification-utils", () => {
  describe("getNotificationHref", () => {
    it("routes applicationReceived when caller has application:view", () => {
      const item: WebsiteNotification = {
        id: "n-1",
        kind: "applicationReceived",
        resourceId: "app/42",
        createdAt: "2026-11-20T10:00:00.000Z",
        readAt: null,
      };
      expect(
        getNotificationHref(item, {
          canViewApplications: true,
          canViewInterviews: true,
        }),
      ).toBe("/applications/app%2F42");
      expect(
        getNotificationHref(item, {
          canViewApplications: false,
          canViewInterviews: true,
        }),
      ).toBeNull();
    });

    it("routes scheduled/changed interviews when permitted and blocks cancelled interviews", () => {
      const scheduled: WebsiteNotification = {
        id: "n-2",
        kind: "interviewScheduled",
        resourceId: "int-7",
        createdAt: "2026-11-20T10:00:00.000Z",
        readAt: null,
      };
      const changed: WebsiteNotification = {
        id: "n-3",
        kind: "interviewChanged",
        resourceId: "int-8",
        createdAt: "2026-11-20T10:00:00.000Z",
        readAt: null,
      };
      const cancelled: WebsiteNotification = {
        id: "n-4",
        kind: "interviewCancelled",
        resourceId: "int-9",
        createdAt: "2026-11-20T10:00:00.000Z",
        readAt: null,
      };

      expect(
        getNotificationHref(scheduled, {
          canViewApplications: true,
          canViewInterviews: true,
        }),
      ).toBe("/interviews?interviewId=int-7");
      expect(
        getNotificationHref(changed, {
          canViewApplications: true,
          canViewInterviews: true,
        }),
      ).toBe("/interviews?interviewId=int-8");
      expect(
        getNotificationHref(changed, {
          canViewApplications: true,
          canViewInterviews: false,
        }),
      ).toBeNull();
      expect(
        getNotificationHref(cancelled, {
          canViewApplications: true,
          canViewInterviews: true,
        }),
      ).toBeNull();
    });
  });

  describe("groupNotificationsByDate", () => {
    it("groups notifications into today, yesterday, and earlier in the effective timezone and skips empty buckets", () => {
      // 2026-11-20T18:00:00.000Z = 2026-11-21 01:00 in Asia/Ho_Chi_Minh (UTC+7)
      const now = new Date("2026-11-20T18:00:00.000Z");
      const items: WebsiteNotification[] = [
        {
          id: "today-1",
          kind: "applicationReceived",
          resourceId: "app-1",
          createdAt: "2026-11-20T17:30:00.000Z", // 2026-11-21 00:30 VN -> today
          readAt: null,
        },
        {
          id: "yesterday-1",
          kind: "interviewScheduled",
          resourceId: "int-1",
          createdAt: "2026-11-20T16:30:00.000Z", // 2026-11-20 23:30 VN -> yesterday
          readAt: null,
        },
        {
          id: "earlier-1",
          kind: "interviewCancelled",
          resourceId: "int-2",
          createdAt: "2026-11-19T16:30:00.000Z", // 2026-11-19 23:30 VN -> earlier
          readAt: "2026-11-19T16:35:00.000Z",
        },
      ];

      const groups = groupNotificationsByDate(items, "Asia/Ho_Chi_Minh", now);
      expect(groups.map((g) => g.key)).toEqual([
        "today",
        "yesterday",
        "earlier",
      ]);
      expect(groups[0].items.map((i) => i.id)).toEqual(["today-1"]);
      expect(groups[1].items.map((i) => i.id)).toEqual(["yesterday-1"]);
      expect(groups[2].items.map((i) => i.id)).toEqual(["earlier-1"]);

      // In UTC (2026-11-20), 2026-11-20T17:30Z and 16:30Z are BOTH today and 2026-11-19T16:30Z is yesterday -> "earlier" omitted
      const utcGroups = groupNotificationsByDate(items, "UTC", now);
      expect(utcGroups.map((g) => g.key)).toEqual(["today", "yesterday"]);
      expect(utcGroups[0].items.map((i) => i.id)).toEqual([
        "today-1",
        "yesterday-1",
      ]);
      expect(utcGroups[1].items.map((i) => i.id)).toEqual(["earlier-1"]);

      expect(groupNotificationsByDate([], "UTC", now)).toEqual([]);
    });
  });

  describe("formatNotificationContextLine", () => {
    it("formats applicationReceived via appliedForJob and other kinds with bullet separator", () => {
      const t = (key: string, params?: Record<string, string | number>) =>
        key === "notificationInbox.appliedForJob"
          ? `${params?.candidate} -> ${params?.job}`
          : key;

      expect(
        formatNotificationContextLine(
          {
            id: "1",
            kind: "applicationReceived",
            resourceId: "app-1",
            createdAt: "2026-11-20T10:00:00.000Z",
            readAt: null,
            candidateName: "Nguyen An",
            jobTitle: "Backend Engineer",
          },
          t,
        ),
      ).toBe("Nguyen An -> Backend Engineer");

      expect(
        formatNotificationContextLine(
          {
            id: "2",
            kind: "interviewScheduled",
            resourceId: "int-1",
            createdAt: "2026-11-20T10:00:00.000Z",
            readAt: null,
            candidateName: "Tran Binh",
            jobTitle: "Designer",
          },
          t,
        ),
      ).toBe("Tran Binh • Designer");
    });
  });
});
