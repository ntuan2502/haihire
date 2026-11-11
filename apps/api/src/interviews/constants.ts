import { toTimestamp } from "../common/date.util";

export {
  INTERVIEW_TYPES,
  type InterviewType,
  INTERVIEW_FORMATS,
  type InterviewFormat,
} from "@haihire/shared";

export interface RawInterviewLike {
  id?: string;
  applicationId?: string;
  scheduledAt?: unknown;
  type?: unknown;
  format?: unknown;
  linkOrLocation?: unknown;
  interviewer?: unknown;
  round?: number | null;
  scorecard?: unknown;
  notes?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  [key: string]: unknown;
}

/**
 * Normalizes a raw Interview database record into the shared domain contract,
 * normalizing scheduledAt to an ISO-8601 UTC string and parsing scorecard JSON.
 */
export function formatInterviewRecord<T extends RawInterviewLike>(intv: T) {
  let parsedScorecard: Record<string, unknown> | null = null;
  if (intv.scorecard) {
    if (typeof intv.scorecard === "string") {
      try {
        parsedScorecard = JSON.parse(intv.scorecard) as Record<string, unknown>;
      } catch {
        parsedScorecard = null;
      }
    } else if (typeof intv.scorecard === "object") {
      parsedScorecard = intv.scorecard as Record<string, unknown>;
    }
  }

  const ms = toTimestamp(intv.scheduledAt);
  const scheduledAt = (ms ? new Date(ms) : new Date()).toISOString();

  return {
    ...intv,
    id: intv.id as string,
    applicationId: intv.applicationId as string,
    scheduledAt,
    type: (intv.type as string) || "",
    linkOrLocation: (intv.linkOrLocation as string) || "",
    interviewer: (intv.interviewer as string) || "",
    scorecard: parsedScorecard,
    notes: (intv.notes as string) || null,
  };
}
