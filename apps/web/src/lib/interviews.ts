export interface InterviewScorecard {
  overallRating: number; // 1 - 5
  recommendation: "STRONG_YES" | "YES" | "NEUTRAL" | "NO" | "STRONG_NO";
  technicalScore?: number; // 1 - 5
  communicationScore?: number; // 1 - 5
  cultureScore?: number; // 1 - 5
  problemSolvingScore?: number; // 1 - 5
  feedback?: string;
  evaluatedBy?: string;
  evaluatedAt?: string;
}

import {
  type InterviewType,
  INTERVIEW_TYPES,
  type InterviewFormat,
  INTERVIEW_FORMATS,
} from "@/types";
import type { TranslationKey } from "@/i18n";

export {
  type InterviewType,
  INTERVIEW_TYPES,
  type InterviewFormat,
  INTERVIEW_FORMATS,
};

export const INTERVIEW_TYPE_OPTIONS: { value: InterviewType; labelKey: string }[] = [
  { value: "HR_SCREENING", labelKey: "interviews.types.hrScreening" },
  { value: "TECHNICAL", labelKey: "interviews.types.technical" },
  { value: "CULTURE_FIT", labelKey: "interviews.types.cultureFit" },
  { value: "FINAL_ROUND", labelKey: "interviews.types.finalRound" },
  { value: "ASSESSMENT", labelKey: "interviews.types.assessment" },
];

export function normalizeInterviewType(rawType?: string | null): InterviewType {
  switch (rawType) {
    case "HR_SCREENING":
      return "HR_SCREENING";
    case "TECHNICAL":
      return "TECHNICAL";
    case "CULTURE_FIT":
      return "CULTURE_FIT";
    case "FINAL_ROUND":
      return "FINAL_ROUND";
    case "ASSESSMENT":
      return "ASSESSMENT";
    default:
      return "TECHNICAL";
  }
}

export function getInterviewTypeLabel(
  type?: string | null,
  t?: (key: TranslationKey, params?: Record<string, string | number>) => string,
): string {
  if (!type) return "";
  if (!t) return type;

  switch (type) {
    case "HR_SCREENING":
      return t("interviews.types.hrScreening");
    case "TECHNICAL":
      return t("interviews.types.technical");
    case "CULTURE_FIT":
      return t("interviews.types.cultureFit");
    case "FINAL_ROUND":
      return t("interviews.types.finalRound");
    case "ASSESSMENT":
      return t("interviews.types.assessment");
    default:
      return type;
  }
}

export function getRecommendationLabel(
  rec?: string | null,
  t?: (key: TranslationKey, params?: Record<string, string | number>) => string,
): string {
  if (!rec) return "";
  const key = rec.toUpperCase();
  if (t) {
    if (key === "STRONG_YES") return t("interviews.recommendations.strongYes");
    if (key === "YES") return t("interviews.recommendations.yes");
    if (key === "NEUTRAL") return t("interviews.recommendations.neutral");
    if (key === "NO") return t("interviews.recommendations.no");
    if (key === "STRONG_NO") return t("interviews.recommendations.strongNo");
  }
  switch (key) {
    case "STRONG_YES":
      return "Tuyển ngay";
    case "YES":
      return "Đồng ý";
    case "NEUTRAL":
      return "Cân nhắc";
    case "NO":
      return "Không đạt";
    case "STRONG_NO":
      return "Loại ngay";
    default:
      return rec;
  }
}

export interface ScheduledInterviewInfo {
  id?: string;
  applicationId?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  type: InterviewType;
  format: InterviewFormat;
  linkOrLocation: string;
  interviewer: string;
  notes?: string;
  round?: number;
  scorecard?: InterviewScorecard;
}

/**
 * Extract interviews from an application's structured interviews array.
 */
export function getInterviewsFromApplication(
  app?: {
    interviews?: Array<{
      id?: string;
      applicationId?: string;
      scheduledAt?: string | Date;
      date?: string;
      time?: string;
      type?: InterviewType | string;
      format?: InterviewFormat | string;
      linkOrLocation: string;
      interviewer: string;
      round?: number;
      scorecard?: InterviewScorecard | string | null;
      notes?: string | null;
    }> | null;
    notes?: string | null;
  } | null,
): ScheduledInterviewInfo[] {
  if (!app) return [];

  if (app.interviews && Array.isArray(app.interviews) && app.interviews.length > 0) {
    const list: ScheduledInterviewInfo[] = app.interviews.map((inv) => {
      let scorecard: InterviewScorecard | undefined;
      if (inv.scorecard) {
        if (typeof inv.scorecard === "string") {
          try {
            scorecard = JSON.parse(inv.scorecard);
          } catch {
            scorecard = undefined;
          }
        } else if (typeof inv.scorecard === "object") {
          scorecard = inv.scorecard as InterviewScorecard;
        }
      }

      let date = inv.date || "";
      let time = inv.time || "";
      if ((!date || !time) && inv.scheduledAt) {
        const dt = new Date(inv.scheduledAt);
        if (!isNaN(dt.getTime())) {
          if (!date) date = dt.toISOString().split("T")[0];
          if (!time) time = dt.toISOString().split("T")[1]?.slice(0, 5) || "00:00";
        }
      }

      return {
        id: inv.id,
        applicationId: inv.applicationId,
        date,
        time,
        type: normalizeInterviewType(inv.type),
        format: (inv.format as InterviewFormat) || "MEET",
        linkOrLocation: inv.linkOrLocation,
        interviewer: inv.interviewer,
        notes: inv.notes || undefined,
        round: inv.round,
        scorecard,
      };
    });

    list.sort((a, b) => {
      const dtA = `${a.date} ${a.time || "00:00"}`;
      const dtB = `${b.date} ${b.time || "00:00"}`;
      return dtB.localeCompare(dtA);
    });

    return list;
  }

  return [];
}

/**
 * Get latest/upcoming interview for an application
 */
export function getLatestInterviewFromApplication(
  app?: {
    interviews?: Array<{
      id?: string;
      applicationId?: string;
      date: string;
      time: string;
      type: string;
      format: "MEET" | "ZOOM" | "TEAMS" | "OFFICE";
      linkOrLocation: string;
      interviewer: string;
      round?: number;
      scorecard?: InterviewScorecard | string | null;
      notes?: string | null;
    }> | null;
    notes?: string | null;
  } | null,
): ScheduledInterviewInfo | null {
  const all = getInterviewsFromApplication(app);
  if (!all.length) return null;
  const today = new Date().toISOString().split("T")[0];
  const upcomingList = all.filter((item) => item.date >= today);
  if (upcomingList.length > 0) {
    return upcomingList[upcomingList.length - 1];
  }
  return all[0];
}
