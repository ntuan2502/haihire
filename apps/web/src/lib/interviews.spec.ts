import { describe, it, expect } from "vitest";
import {
  combineDateTimeInTimezone,
  extractDateTimeInTimezone,
  formatInterviewDateTimeInTimezone,
} from "@haihire/shared";
import {
  getInterviewsFromApplication,
  normalizeInterviewType,
} from "./interviews";

describe("Frontend interview helpers", () => {
  describe("normalizeInterviewType", () => {
    it("normalizes known interview types", () => {
      expect(normalizeInterviewType("HR_SCREENING")).toBe("HR_SCREENING");
      expect(normalizeInterviewType("TECHNICAL")).toBe("TECHNICAL");
      expect(normalizeInterviewType("CULTURE_FIT")).toBe("CULTURE_FIT");
      expect(normalizeInterviewType("FINAL_ROUND")).toBe("FINAL_ROUND");
      expect(normalizeInterviewType("ASSESSMENT")).toBe("ASSESSMENT");
    });

    it("defaults to TECHNICAL for null, undefined, or unknown types", () => {
      expect(normalizeInterviewType(null)).toBe("TECHNICAL");
      expect(normalizeInterviewType(undefined)).toBe("TECHNICAL");
      expect(normalizeInterviewType("UNKNOWN_ROUND")).toBe("TECHNICAL");
    });
  });

  describe("getInterviewsFromApplication", () => {
    it("returns empty array when app is null or undefined", () => {
      expect(getInterviewsFromApplication(null)).toEqual([]);
      expect(getInterviewsFromApplication(undefined)).toEqual([]);
    });

    it("returns empty array when app has no interviews", () => {
      expect(getInterviewsFromApplication({ interviews: [] })).toEqual([]);
    });

    it("extracts interview scheduledAt normalized to ISO UTC", () => {
      const app = {
        interviews: [
          {
            id: "intv-1",
            applicationId: "app-1",
            scheduledAt: "2026-10-06T02:00:00.000Z",
            type: "TECHNICAL",
            format: "MEET",
            linkOrLocation: "https://meet.google.com/test",
            interviewer: "Lead Recruiter",
          },
        ],
      };

      const result = getInterviewsFromApplication(app);
      expect(result).toHaveLength(1);
      expect(result[0].scheduledAt).toBe("2026-10-06T02:00:00.000Z");
      expect(result[0].type).toBe("TECHNICAL");
    });

    it("accepts non-UTC ISO scheduledAt and normalizes to UTC ISO-8601", () => {
      const app = {
        interviews: [
          {
            id: "intv-2",
            applicationId: "app-2",
            scheduledAt: "2026-10-07T10:15:00+07:00",
            type: "HR_SCREENING",
            format: "ZOOM",
            linkOrLocation: "https://zoom.us/test",
            interviewer: "HR Manager",
          },
        ],
      };

      const result = getInterviewsFromApplication(app);
      expect(result).toHaveLength(1);
      expect(result[0].scheduledAt).toBe("2026-10-07T03:15:00.000Z");
      expect(result[0].format).toBe("ZOOM");
    });

    it("sorts multiple interviews in descending order (latest first)", () => {
      const app = {
        interviews: [
          {
            id: "intv-round-1",
            scheduledAt: "2026-10-01T02:00:00.000Z",
            linkOrLocation: "link-1",
            interviewer: "Interviewer 1",
          },
          {
            id: "intv-round-2",
            scheduledAt: "2026-10-08T07:00:00.000Z",
            linkOrLocation: "link-2",
            interviewer: "Interviewer 2",
          },
        ],
      };

      const result = getInterviewsFromApplication(app);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("intv-round-2");
      expect(result[1].id).toBe("intv-round-1");
    });
  });

  describe("timezone & DST interview helpers", () => {
    it("round-trips UTC+07:00 across UTC day boundary", () => {
      const iso = combineDateTimeInTimezone(
        "2026-10-21",
        "01:30",
        "Asia/Ho_Chi_Minh",
      );
      expect(iso).toBe("2026-10-20T18:30:00.000Z");
      expect(extractDateTimeInTimezone(iso, "Asia/Ho_Chi_Minh")).toEqual({
        date: "2026-10-21",
        time: "01:30",
      });
    });

    it("handles US DST spring-forward and fall-back transitions accurately", () => {
      // Pre-DST on spring-forward day (EST = UTC-5)
      expect(
        combineDateTimeInTimezone("2026-03-08", "01:30", "America/New_York"),
      ).toBe("2026-03-08T06:30:00.000Z");
      // Post-DST on spring-forward day (EDT = UTC-4)
      const springAfter = combineDateTimeInTimezone(
        "2026-03-08",
        "10:00",
        "America/New_York",
      );
      expect(springAfter).toBe("2026-03-08T14:00:00.000Z");
      expect(
        extractDateTimeInTimezone(springAfter, "America/New_York"),
      ).toEqual({
        date: "2026-03-08",
        time: "10:00",
      });

      // Fall-back day after 02:00 switch (EST = UTC-5)
      const fallAfter = combineDateTimeInTimezone(
        "2026-11-01",
        "10:00",
        "America/New_York",
      );
      expect(fallAfter).toBe("2026-11-01T15:00:00.000Z");
      expect(extractDateTimeInTimezone(fallAfter, "America/New_York")).toEqual({
        date: "2026-11-01",
        time: "10:00",
      });
    });

    it("formats interview date and time according to org timezone and 12H/24H", () => {
      const formatted = formatInterviewDateTimeInTimezone(
        "2026-10-20T18:30:00.000Z",
        {
          timezone: "Asia/Ho_Chi_Minh",
          dateFormat: "DD/MM/YYYY",
          timeFormat: "12H",
        },
      );
      expect(formatted).toEqual({
        date: "21/10/2026",
        time: "1:30 AM",
      });
    });
  });
});
