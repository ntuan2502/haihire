import { getCandidateDisplayName } from "@/lib/utils";
import type { CalendarEventItem } from "../types";

export interface CalendarEventChipProps {
  event: CalendarEventItem;
  onClick: () => void;
}

export function CalendarEventChip({ event, onClick }: CalendarEventChipProps) {
  const candidateName = getCandidateDisplayName(event.application);
  const hasScorecard = Boolean(event.interview.scorecard);
  const timeStr = event.interview.time || "10:00";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Interview with ${candidateName} at ${timeStr}`}
      className={`w-full text-left h-5 sm:h-[22px] px-1.5 rounded flex items-center gap-1.5 text-[11px] leading-none cursor-pointer transition-all hover:brightness-95 active:scale-[0.99] border-l-2 select-none truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        hasScorecard
          ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-950 dark:text-emerald-200"
          : "bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-950 dark:text-blue-200"
      }`}
      title={`${event.interview.time || ""} ${candidateName} • ${event.job?.title || ""}`}
    >
      <span className="font-bold shrink-0 text-[10px] opacity-75 font-mono">
        {timeStr}
      </span>
      <span className="font-semibold truncate">{candidateName}</span>
    </button>
  );
}
