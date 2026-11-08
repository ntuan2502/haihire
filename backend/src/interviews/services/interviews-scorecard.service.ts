import { Injectable } from "@nestjs/common";

@Injectable()
export class InterviewsScorecardService {
  /**
   * Serializes scorecard data to a JSON string or returns null.
   */
  serializeScorecard(scorecard: unknown): string | null {
    if (scorecard === undefined || scorecard === null) {
      return null;
    }
    if (typeof scorecard === "string") {
      return scorecard;
    }
    try {
      return JSON.stringify(scorecard);
    } catch {
      return null;
    }
  }

  /**
   * Safely parses a scorecard JSON string or returns null.
   */
  parseScorecard<T = Record<string, unknown>>(
    scorecardStr: string | null,
  ): T | null {
    if (!scorecardStr) return null;
    try {
      return JSON.parse(scorecardStr) as T;
    } catch {
      return null;
    }
  }
}
