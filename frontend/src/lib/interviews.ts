export interface ScheduledInterviewInfo {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  type: string; // Technical / Cultural / Screening / Final
  format: "MEET" | "ZOOM" | "TEAMS" | "OFFICE";
  linkOrLocation: string;
  interviewer: string;
  notes?: string;
}

/**
 * Extract scheduled interview metadata from candidate notes
 */
export function parseInterviewFromNotes(notes?: string | null): ScheduledInterviewInfo | null {
  if (!notes) return null;
  const match = notes.match(/Interview:\s*(\{.*?\})/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as ScheduledInterviewInfo;
  } catch {
    return null;
  }
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
