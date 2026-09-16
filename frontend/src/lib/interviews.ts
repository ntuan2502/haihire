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

export interface ScheduledInterviewInfo {
  id?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  type: string; // Technical / Cultural / Screening / Final
  format: "MEET" | "ZOOM" | "TEAMS" | "OFFICE";
  linkOrLocation: string;
  interviewer: string;
  notes?: string;
  round?: number;
  scorecard?: InterviewScorecard;
}

/**
 * Extract all scheduled or past interviews from candidate notes
 */
export function parseAllInterviewsFromNotes(notes?: string | null): ScheduledInterviewInfo[] {
  if (!notes) return [];
  const matches = [...notes.matchAll(/Interview:\s*(\{.*?\})/g)];
  if (!matches.length) return [];
  const list: ScheduledInterviewInfo[] = [];
  for (const match of matches) {
    try {
      const parsed = JSON.parse(match[1]) as ScheduledInterviewInfo;
      list.push(parsed);
    } catch {
      // ignore malformed entries
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
 * Append or replace interview metadata JSON inside candidate notes.
 * Preserves other past interview rounds if they exist.
 */
export function stringifyInterviewToNotes(
  currentNotes: string | null | undefined,
  info: ScheduledInterviewInfo,
): string {
  const all = parseAllInterviewsFromNotes(currentNotes);
  const baseText = (currentNotes || "")
    .replace(/Interview:\s*\{.*?\}\s*\|?/g, "")
    .replace(/^\|\s*|\s*\|$/g, "")
    .trim();

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
  const baseText = (currentNotes || "")
    .replace(/Interview:\s*\{.*?\}\s*\|?/g, "")
    .replace(/^\|\s*|\s*\|$/g, "")
    .trim();

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

/**
 * Remove interview metadata from notes when cancelling an interview
 */
export function removeInterviewFromNotes(currentNotes?: string | null): string {
  if (!currentNotes) return "";
  const cleaned = currentNotes.replace(/Interview:\s*\{.*?\}\s*\|?/g, "").trim();
  return cleaned.replace(/^\|\s*|\s*\|$/g, "").trim();
}
