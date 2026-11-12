import type { Application } from "./applications";
import {
  canonicalizeTimezone,
  DEFAULT_ORG_LOCALIZATION,
  type DateFormat,
  type TimeFormat,
} from "./organizations";

export const INTERVIEW_TYPES = [
  "HR_SCREENING",
  "TECHNICAL",
  "CULTURE_FIT",
  "FINAL_ROUND",
  "ASSESSMENT",
] as const;

export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const INTERVIEW_FORMATS = ["MEET", "ZOOM", "TEAMS", "OFFICE"] as const;

export type InterviewFormat = (typeof INTERVIEW_FORMATS)[number];

export interface InterviewScorecard {
  overallRating: number;
  recommendation: "STRONG_YES" | "YES" | "NEUTRAL" | "NO" | "STRONG_NO";
  technicalScore?: number;
  communicationScore?: number;
  cultureScore?: number;
  problemSolvingScore?: number;
  feedback?: string;
  evaluatedBy?: string;
  evaluatedAt?: string;
}

export interface Interview {
  id: string;
  applicationId: string;
  scheduledAt: string;
  type: InterviewType;
  format: InterviewFormat;
  linkOrLocation: string;
  interviewer: string;
  round: number;
  scorecard?: InterviewScorecard | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  application?: Application;
  candidateName?: string;
  candidateEmail?: string;
  jobTitle?: string;
  jobId?: string;
  organizationId?: string;
}

export interface CreateInterviewInput {
  applicationId: string;
  scheduledAt: string;
  type: InterviewType;
  format?: InterviewFormat;
  linkOrLocation?: string;
  interviewer: string;
  round?: number;
  scorecard?: InterviewScorecard;
  notes?: string;
  sendInvitationEmail?: boolean;
  templateId?: string;
}

export interface UpdateInterviewInput {
  scheduledAt?: string;
  type?: InterviewType;
  format?: InterviewFormat;
  linkOrLocation?: string;
  interviewer?: string;
  round?: number;
  scorecard?: InterviewScorecard;
  notes?: string;
}

function parseZonedWallParts(
  instant: Date,
  timezone: string,
): { year: number; month: number; day: number; hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(instant);
  const pick = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const hour = pick("hour");
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: hour === 24 ? 0 : hour,
    minute: pick("minute"),
  };
}

function resolveValidTimezone(timezone?: string | null): string {
  const candidate = canonicalizeTimezone(
    timezone || DEFAULT_ORG_LOCALIZATION.timezone,
  );
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate });
    return candidate;
  } catch {
    return DEFAULT_ORG_LOCALIZATION.timezone;
  }
}

export function extractDateTimeInTimezone(
  input?: string | Date | null,
  timezone?: string | null,
): { date: string; time: string } {
  if (!input) return { date: "", time: "" };
  const dt = typeof input === "string" ? new Date(input) : input;
  if (isNaN(dt.getTime())) return { date: "", time: "" };
  const tz = resolveValidTimezone(timezone);
  const p = parseZonedWallParts(dt, tz);
  const pad2 = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${String(p.year).padStart(4, "0")}-${pad2(p.month)}-${pad2(p.day)}`,
    time: `${pad2(p.hour)}:${pad2(p.minute)}`,
  };
}

export function combineDateTimeInTimezone(
  dateYmd: string,
  timeHm: string,
  timezone?: string | null,
): string {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateYmd.trim());
  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(timeHm.trim());
  if (!dateMatch || !timeMatch) {
    throw new RangeError(
      `Invalid interview date/time: "${dateYmd}" "${timeHm}"`,
    );
  }
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = timeMatch[3] ? Number(timeMatch[3]) : 0;

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    throw new RangeError(
      `Out-of-range interview date/time: "${dateYmd}" "${timeHm}"`,
    );
  }

  const tz = resolveValidTimezone(timezone);
  const desiredWallMs = Date.UTC(year, month - 1, day, hour, minute, second, 0);

  const wallMsAt = (utcMs: number): number => {
    const p = parseZonedWallParts(new Date(utcMs), tz);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, second, 0);
  };

  // Two-pass offset estimation handles DST transitions accurately.
  const guessWallMs = wallMsAt(desiredWallMs);
  const offset1Ms = guessWallMs - desiredWallMs;
  let resolvedMs = desiredWallMs - offset1Ms;

  const checkWallMs = wallMsAt(resolvedMs);
  if (checkWallMs !== desiredWallMs) {
    const offset2Ms = checkWallMs - resolvedMs;
    resolvedMs = desiredWallMs - offset2Ms;
  }

  return new Date(resolvedMs).toISOString();
}

export function formatInterviewDateTimeInTimezone(
  input?: string | Date | null,
  localization?: {
    timezone?: string | null;
    dateFormat?: DateFormat | string | null;
    timeFormat?: TimeFormat | string | null;
  },
): { date: string; time: string } {
  const { date: ymd, time: hm } = extractDateTimeInTimezone(
    input,
    localization?.timezone,
  );
  if (!ymd || !hm) return { date: "", time: "" };

  const [y, m, d] = ymd.split("-");
  const dateFormat =
    localization?.dateFormat ?? DEFAULT_ORG_LOCALIZATION.dateFormat;
  const formattedDate =
    dateFormat === "YYYY-MM-DD"
      ? `${y}-${m}-${d}`
      : dateFormat === "MM/DD/YYYY"
        ? `${m}/${d}/${y}`
        : `${d}/${m}/${y}`;

  const [hhStr, mmStr] = hm.split(":");
  const hNum = Number(hhStr);
  const timeFormat =
    localization?.timeFormat ?? DEFAULT_ORG_LOCALIZATION.timeFormat;
  const formattedTime =
    timeFormat === "12H"
      ? `${hNum % 12 || 12}:${mmStr} ${hNum >= 12 ? "PM" : "AM"}`
      : `${hhStr}:${mmStr}`;

  return { date: formattedDate, time: formattedTime };
}
