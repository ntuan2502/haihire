import { Clock, Star, Video } from "lucide-react";
import { getCandidateDisplayName } from "@/lib/utils";
import { useI18n } from "@/i18n";
import type { Application } from "@/types";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import type { CalendarEventItem } from "../types";

export interface CalendarWeekCardProps {
  event: CalendarEventItem;
  onOpenScorecard: (
    app: Application,
    interview: ScheduledInterviewInfo,
  ) => void;
}

export function CalendarWeekCard({
  event,
  onOpenScorecard,
}: CalendarWeekCardProps) {
  const { t } = useI18n();
  const candidateName = getCandidateDisplayName(event.application);
  const hasScorecard = Boolean(event.interview.scorecard);

  return (
    <div
      className={`p-3 rounded-2xl border space-y-2 transition-all shadow-2xs ${
        hasScorecard
          ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80"
          : "bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700"
      }`}
    >
      <div className="flex items-center justify-between gap-1 text-xs">
        <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
          <Clock className="h-3 w-3 text-blue-500" />
          {event.interview.time}
        </span>

        {hasScorecard ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
            <Star className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500" />
            <span>{event.interview.scorecard?.overallRating} ⭐</span>
          </span>
        ) : (
          <span className="px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
            {event.interview.round
              ? t("interviews.roundInterview", {
                  round: event.interview.round,
                })
              : t("interviews.round")}
          </span>
        )}
      </div>

      <div>
        <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
          {candidateName}
        </h4>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
          {event.job?.title}
        </p>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
        <span className="truncate max-w-[80px]">
          {t("interviews.tableHeaders.interviewer")}:{" "}
          {event.interview.interviewer}
        </span>
        {event.interview.format === "OFFICE" ? (
          <span className="text-rose-600 font-semibold">
            {t("interviews.atOffice")}
          </span>
        ) : (
          <span className="text-emerald-600 font-semibold">
            {t("interviews.onlineFormat", {
              format: event.interview.format || "ONLINE",
            })}
          </span>
        )}
      </div>

      {/* Actions in card */}
      <div className="pt-1 flex items-center justify-between gap-1">
        {event.interview.linkOrLocation?.startsWith("http") && (
          <a
            href={event.interview.linkOrLocation}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
          >
            <Video className="h-2.5 w-2.5" />
            <span>{t("interviews.joinMeetingShort")}</span>
          </a>
        )}

        <button
          type="button"
          onClick={() => onOpenScorecard(event.application, event.interview)}
          className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer ml-auto"
        >
          {hasScorecard
            ? t("interviews.viewEvaluation")
            : t("interviews.scorecardAction")}
        </button>
      </div>
    </div>
  );
}
