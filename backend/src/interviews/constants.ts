import { toTimestamp } from "../common/date.util";
import { fixUtf8String } from "../common/doc-utils";

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
 * extracting date (YYYY-MM-DD) and time (HH:mm) from scheduledAt and parsing scorecard JSON.
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
  const dt = ms ? new Date(ms) : new Date();
  const date = dt.toISOString().split("T")[0];
  const time = dt.toISOString().split("T")[1]?.slice(0, 5) || "00:00";

  return {
    ...intv,
    id: intv.id as string,
    applicationId: intv.applicationId as string,
    date,
    time,
    scheduledAt: intv.scheduledAt,
    type: fixUtf8String(intv.type as string),
    linkOrLocation: fixUtf8String(intv.linkOrLocation as string),
    interviewer: fixUtf8String(intv.interviewer as string),
    scorecard: parsedScorecard,
    notes: intv.notes ? fixUtf8String(intv.notes as string) : null,
  };
}

