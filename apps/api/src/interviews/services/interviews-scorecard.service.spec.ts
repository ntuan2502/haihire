import { describe, it, expect, beforeEach } from "vitest";
import { InterviewsScorecardService } from "./interviews-scorecard.service";

describe("InterviewsScorecardService", () => {
  let service: InterviewsScorecardService;

  beforeEach(() => {
    service = new InterviewsScorecardService();
  });

  describe("serializeScorecard", () => {
    it("returns null when scorecard is undefined or null", () => {
      expect(service.serializeScorecard(undefined)).toBeNull();
      expect(service.serializeScorecard(null)).toBeNull();
    });

    it("returns raw string if already a string", () => {
      expect(service.serializeScorecard("test-scorecard")).toBe(
        "test-scorecard",
      );
    });

    it("serializes objects into JSON string", () => {
      const data = { rating: 5, comments: "Excellent" };
      expect(service.serializeScorecard(data)).toBe(JSON.stringify(data));
    });

    it("safely handles circular references without throwing", () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      expect(service.serializeScorecard(circular)).toBeNull();
    });
  });

  describe("parseScorecard", () => {
    it("returns null when scorecardStr is null or empty", () => {
      expect(service.parseScorecard(null)).toBeNull();
      expect(service.parseScorecard("")).toBeNull();
    });

    it("parses valid JSON string", () => {
      const parsed = service.parseScorecard<{ rating: number }>(
        '{"rating": 4}',
      );
      expect(parsed).toEqual({ rating: 4 });
    });

    it("returns null when JSON is invalid", () => {
      expect(service.parseScorecard("invalid json {")).toBeNull();
    });
  });
});
