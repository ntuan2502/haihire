import { describe, it, expect } from "vitest";
import { getInterviewsFromApplication, normalizeInterviewType } from "./interviews";

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

    it("extracts interview with explicit date and time", () => {
      const app = {
        interviews: [
          {
            id: "intv-1",
            applicationId: "app-1",
            date: "2026-10-06",
            time: "09:00",
            type: "TECHNICAL",
            format: "MEET",
            linkOrLocation: "https://meet.google.com/test",
            interviewer: "Lead Recruiter",
          },
        ],
      };

      const result = getInterviewsFromApplication(app);
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe("2026-10-06");
      expect(result[0].time).toBe("09:00");
      expect(result[0].type).toBe("TECHNICAL");
    });

    it("extracts date and time from scheduledAt when date and time are missing", () => {
      const app = {
        interviews: [
          {
            id: "intv-2",
            applicationId: "app-2",
            scheduledAt: "2026-10-07T10:15:00.000Z",
            type: "HR_SCREENING",
            format: "ZOOM",
            linkOrLocation: "https://zoom.us/test",
            interviewer: "HR Manager",
          },
        ],
      };

      const result = getInterviewsFromApplication(app);
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe("2026-10-07");
      expect(result[0].time).toBe("10:15");
      expect(result[0].format).toBe("ZOOM");
    });

    it("sorts multiple interviews in descending order (latest first)", () => {
      const app = {
        interviews: [
          {
            id: "intv-round-1",
            date: "2026-10-01",
            time: "09:00",
            linkOrLocation: "link-1",
            interviewer: "Interviewer 1",
          },
          {
            id: "intv-round-2",
            date: "2026-10-08",
            time: "14:00",
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
});
