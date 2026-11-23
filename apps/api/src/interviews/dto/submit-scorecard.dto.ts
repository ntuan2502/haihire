import {
  IsDefined,
  Validate,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from "class-validator";

const VALID_RECOMMENDATIONS = new Set([
  "STRONG_YES",
  "YES",
  "NEUTRAL",
  "NO",
  "STRONG_NO",
]);

const SCORE_FIELDS = [
  "overallRating",
  "technicalScore",
  "communicationScore",
  "cultureScore",
  "problemSolvingScore",
  "rating",
] as const;

@ValidatorConstraint({ name: "validScorecard", async: false })
class ValidScorecardConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    let obj: unknown = value;
    if (typeof value === "string") {
      if (!value.trim()) return false;
      try {
        obj = JSON.parse(value);
      } catch {
        return true;
      }
    }
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      return false;
    }
    const record = obj as Record<string, unknown>;
    for (const field of SCORE_FIELDS) {
      if (record[field] !== undefined) {
        const num = record[field];
        if (
          typeof num !== "number" ||
          !Number.isFinite(num) ||
          num < 1 ||
          num > 5
        ) {
          return false;
        }
      }
    }
    if (
      record.recommendation !== undefined &&
      (typeof record.recommendation !== "string" ||
        !VALID_RECOMMENDATIONS.has(record.recommendation))
    ) {
      return false;
    }
    return true;
  }

  defaultMessage(): string {
    return "Scorecard ratings must be numbers between 1 and 5 with a valid recommendation.";
  }
}

export class SubmitScorecardDto {
  @IsDefined()
  @Validate(ValidScorecardConstraint)
  scorecard!: Record<string, unknown> | string;
}
