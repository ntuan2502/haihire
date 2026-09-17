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

import { type InterviewType, INTERVIEW_TYPES } from "@/types";

export { type InterviewType, INTERVIEW_TYPES };

export const INTERVIEW_TYPE_OPTIONS: { value: InterviewType; labelKey: string }[] = [
  { value: "HR_SCREENING", labelKey: "interviews.types.hrScreening" },
  { value: "TECHNICAL", labelKey: "interviews.types.technical" },
  { value: "CULTURE_FIT", labelKey: "interviews.types.cultureFit" },
  { value: "FINAL_ROUND", labelKey: "interviews.types.finalRound" },
  { value: "ASSESSMENT", labelKey: "interviews.types.assessment" },
];

export function normalizeInterviewType(rawType?: string | null): InterviewType {
  if (!rawType) return "TECHNICAL";
  if (
    rawType === "HR_SCREENING" ||
    rawType.includes("Screening") ||
    rawType.includes("Sơ bộ") ||
    rawType.includes("Sơ vấn")
  ) {
    return "HR_SCREENING";
  }
  if (
    rawType === "TECHNICAL" ||
    rawType.includes("Technical") ||
    rawType.includes("Kỹ thuật")
  ) {
    return "TECHNICAL";
  }
  if (
    rawType === "CULTURE_FIT" ||
    rawType.includes("Culture") ||
    rawType.includes("Văn hóa")
  ) {
    return "CULTURE_FIT";
  }
  if (
    rawType === "FINAL_ROUND" ||
    rawType.includes("Final") ||
    rawType.includes("Vòng cuối")
  ) {
    return "FINAL_ROUND";
  }
  if (
    rawType === "ASSESSMENT" ||
    rawType.includes("Assessment") ||
    rawType.includes("Đánh giá")
  ) {
    return "ASSESSMENT";
  }
  return "TECHNICAL";
}

export function getInterviewTypeLabel(
  type?: string | null,
  t?: (key: string, options?: Record<string, unknown>) => string,
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
      if (type.includes("HR Screening") || type.includes("Sơ bộ") || type.includes("Sơ vấn")) {
        return t("interviews.types.hrScreening");
      }
      if (type.includes("Technical") || type.includes("Kỹ thuật")) {
        return t("interviews.types.technical");
      }
      if (type.includes("Culture") || type.includes("Văn hóa")) {
        return t("interviews.types.cultureFit");
      }
      if (type.includes("Final") || type.includes("Vòng cuối")) {
        return t("interviews.types.finalRound");
      }
      if (type.includes("Assessment") || type.includes("Đánh giá")) {
        return t("interviews.types.assessment");
      }
      return type;
  }
}

export interface ScheduledInterviewInfo {
  id?: string;
  applicationId?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  type: InterviewType | string;
  format: "MEET" | "ZOOM" | "TEAMS" | "OFFICE";
  linkOrLocation: string;
  interviewer: string;
  notes?: string;
  round?: number;
  scorecard?: InterviewScorecard;
}

/**
 * Extract interviews from an application, prioritizing structured interviews array,
 * falling back to parsed notes for backward compatibility.
 */
export function getInterviewsFromApplication(
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

      return {
        id: inv.id,
        applicationId: inv.applicationId,
        date: inv.date,
        time: inv.time,
        type: inv.type,
        format: inv.format,
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

  return parseAllInterviewsFromNotes(app.notes);
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

/**
 * Safely extract all balanced JSON blocks after "Interview:" from candidate notes.
 * Handles nested JSON structures (such as scorecards) and escaped characters cleanly.
 */
export function extractInterviewJsonBlocks(notes?: string | null): {
  raw: string; // The full "Interview: {...}" substring
  json: string; // The "{...}" substring
  parsed: ScheduledInterviewInfo | null;
}[] {
  if (!notes) return [];
  const results: { raw: string; json: string; parsed: ScheduledInterviewInfo | null }[] = [];
  const keyword = "Interview:";
  let searchIdx = 0;

  while (searchIdx < notes.length) {
    const foundIdx = notes.indexOf(keyword, searchIdx);
    if (foundIdx === -1) break;

    // Find the opening brace '{'
    let braceStart = foundIdx + keyword.length;
    while (braceStart < notes.length && /\s/.test(notes[braceStart])) {
      braceStart++;
    }

    if (braceStart >= notes.length || notes[braceStart] !== "{") {
      searchIdx = foundIdx + keyword.length;
      continue;
    }

    // Parse balanced braces
    let depth = 0;
    let inString = false;
    let escape = false;
    let braceEnd = -1;

    for (let i = braceStart; i < notes.length; i++) {
      const char = notes[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === "\\") {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === "{") depth++;
        else if (char === "}") {
          depth--;
          if (depth === 0) {
            braceEnd = i;
            break;
          }
        }
      }
    }

    if (braceEnd !== -1) {
      const jsonStr = notes.slice(braceStart, braceEnd + 1);
      const rawStr = notes.slice(foundIdx, braceEnd + 1);
      let parsed: ScheduledInterviewInfo | null = null;
      try {
        parsed = JSON.parse(jsonStr) as ScheduledInterviewInfo;
      } catch {
        parsed = null;
      }
      results.push({ raw: rawStr, json: jsonStr, parsed });
      searchIdx = braceEnd + 1;
    } else {
      searchIdx = foundIdx + keyword.length;
    }
  }

  return results;
}

/**
 * Extract all scheduled or past interviews from candidate notes
 */
export function parseAllInterviewsFromNotes(notes?: string | null): ScheduledInterviewInfo[] {
  if (!notes) return [];
  const blocks = extractInterviewJsonBlocks(notes);
  const list: ScheduledInterviewInfo[] = [];
  for (const block of blocks) {
    if (block.parsed) {
      list.push(block.parsed);
    }
  }

  // Sắp xếp thời gian giảm dần: ngày lớn hơn nằm trên, nhỏ hơn nằm dưới
  list.sort((a, b) => {
    const dtA = `${a.date} ${a.time || "00:00"}`;
    const dtB = `${b.date} ${b.time || "00:00"}`;
    return dtB.localeCompare(dtA);
  });

  return list;
}

/**
 * Extract scheduled interview metadata from candidate notes (prioritizes upcoming or latest)
 */
export function parseInterviewFromNotes(notes?: string | null): ScheduledInterviewInfo | null {
  const all = parseAllInterviewsFromNotes(notes);
  if (!all.length) return null;
  const today = new Date().toISOString().split("T")[0];
  // Lịch sắp tới (>= hôm nay): lấy lịch gần hôm nay nhất
  const upcomingList = all.filter((item) => item.date >= today);
  if (upcomingList.length > 0) {
    return upcomingList[upcomingList.length - 1];
  }
  // Nếu không có lịch tương lai, lấy lịch mới nhất trong quá khứ (đầu danh sách giảm dần)
  return all[0];
}

/**
 * Remove interview metadata from notes when cancelling an interview or rebuilding notes
 */
export function removeInterviewFromNotes(currentNotes?: string | null): string {
  if (!currentNotes) return "";
  const blocks = extractInterviewJsonBlocks(currentNotes);
  let cleaned = currentNotes;
  for (const block of blocks) {
    cleaned = cleaned.replace(block.raw, "");
  }
  // Clean up any remaining legacy fragments or stray separators
  cleaned = cleaned
    .replace(/Interview:\s*\{.*?\}\s*\|?/g, "")
    .replace(/\|\s*\}\s*\|/g, "|")
    .replace(/\|\s*\|/g, "|")
    .replace(/^[|{}\s]+|[|{}\s]+$/g, "")
    .trim();

  if (/^[{}|\s]+$/.test(cleaned)) {
    return "";
  }
  return cleaned;
}

/**
 * Append or replace interview metadata JSON inside candidate notes.
 * Preserves other past interview rounds if they exist.
 */
export function stringifyInterviewToNotes(
  currentNotes: string | null | undefined,
  info: ScheduledInterviewInfo,
): string {
  const all = parseAllInterviewsFromNotes(currentNotes);
  const baseText = removeInterviewFromNotes(currentNotes);

  // If previous interviews exist, update matching round/date or prepend as new round
  if (all.length > 0) {
    let replaced = false;
    const updatedList = all.map((existing) => {
      const isMatch =
        (info.round && existing.round === info.round) ||
        (existing.date === info.date && existing.time === info.time);
      if (isMatch && !replaced) {
        replaced = true;
        return {
          ...existing,
          ...info,
          scorecard: info.scorecard || existing.scorecard,
        };
      }
      return existing;
    });

    if (!replaced) {
      updatedList.unshift(info);
    }

    const interviewPart = updatedList
      .map((intv) => `Interview: ${JSON.stringify(intv)}`)
      .join(" | ");

    return baseText ? `${baseText} | ${interviewPart}` : interviewPart;
  }

  // Single new interview
  const jsonStr = JSON.stringify(info);
  return baseText ? `${baseText} | Interview: ${jsonStr}` : `Interview: ${jsonStr}`;
}

/**
 * Save or update an interview's scorecard evaluation into candidate notes
 */
export function saveInterviewScorecardToNotes(
  currentNotes: string | null | undefined,
  targetInterview: ScheduledInterviewInfo,
  scorecard: InterviewScorecard,
): string {
  const all = parseAllInterviewsFromNotes(currentNotes);
  const baseText = removeInterviewFromNotes(currentNotes);

  let matched = false;
  const updatedList = all.map((intv) => {
    const isTarget =
      (targetInterview.round && intv.round === targetInterview.round) ||
      (intv.date === targetInterview.date && intv.time === targetInterview.time);

    if (isTarget && !matched) {
      matched = true;
      return {
        ...intv,
        scorecard,
      };
    }
    return intv;
  });

  if (!matched && all.length > 0) {
    updatedList[0] = {
      ...updatedList[0],
      scorecard,
    };
  } else if (!matched) {
    updatedList.push({
      ...targetInterview,
      scorecard,
    });
  }

  const interviewPart = updatedList
    .map((intv) => `Interview: ${JSON.stringify(intv)}`)
    .join(" | ");

  return baseText ? `${baseText} | ${interviewPart}` : interviewPart;
}
