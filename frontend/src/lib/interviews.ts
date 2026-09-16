export interface ScheduledInterviewInfo {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  type: string; // Technical / Cultural / Screening / Final
  format: "MEET" | "ZOOM" | "TEAMS" | "OFFICE";
  linkOrLocation: string;
  interviewer: string;
  notes?: string;
  round?: number;
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
 * Append or replace interview metadata JSON inside candidate notes
 */
export function stringifyInterviewToNotes(
  currentNotes: string | null | undefined,
  info: ScheduledInterviewInfo,
): string {
  const cleaned = (currentNotes || "").replace(/Interview:\s*\{.*?\}\s*\|?/g, "").trim();
  const jsonStr = JSON.stringify(info);
  const normalizedCleaned = cleaned.replace(/^\|\s*|\s*\|$/g, "").trim();
  return normalizedCleaned ? `${normalizedCleaned} | Interview: ${jsonStr}` : `Interview: ${jsonStr}`;
}

/**
 * Remove interview metadata from notes when cancelling an interview
 */
export function removeInterviewFromNotes(currentNotes?: string | null): string {
  if (!currentNotes) return "";
  const cleaned = currentNotes.replace(/Interview:\s*\{.*?\}\s*\|?/g, "").trim();
  return cleaned.replace(/^\|\s*|\s*\|$/g, "").trim();
}
