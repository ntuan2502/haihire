"use client";

import { History, Star, User } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";
import {
  getInterviewTypeLabel,
  getRecommendationLabel,
  type ScheduledInterviewInfo,
} from "@/lib/interviews";
import { useI18n } from "@/i18n";

interface InterviewsTableSubrowProps {
  previousInterviews: ScheduledInterviewInfo[];
  visibleColumnCount: number;
}

export function InterviewsTableSubrow({
  previousInterviews,
  visibleColumnCount,
}: InterviewsTableSubrowProps) {
  const { t } = useI18n();

  const getRecommendationBadge = (rec?: string) => {
    if (!rec) return null;
    const isYes = rec === "YES" || rec === "STRONG_YES";
    const label = getRecommendationLabel(rec, t);
    return (
      <span
        className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
          isYes
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
            : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
        }`}
      >
        {label}
      </span>
    );
  };

  return (
    <tr className="bg-slate-50/90 dark:bg-slate-800/40 border-t border-slate-200/60 dark:border-slate-800">
      <td colSpan={visibleColumnCount} className="px-6 py-3.5">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <History className="h-3.5 w-3.5 text-blue-500" />
            <span>
              {t("interviews.previousRoundsCount", {
                count: previousInterviews.length,
              })}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {previousInterviews.map((prev, pIdx) => (
              <div
                key={prev.id || `${prev.scheduledAt}-${pIdx}`}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                  <span>
                    {prev.round
                      ? t("interviews.roundInterview", {
                          round: prev.round,
                        })
                      : getInterviewTypeLabel(prev.type, t)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {formatDate(prev.scheduledAt)} (
                    {formatTime(prev.scheduledAt)})
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3 text-slate-400" />
                    <span>{prev.interviewer}</span>
                  </div>
                  <span>
                    {prev.format === "OFFICE"
                      ? t("interviews.atOffice")
                      : t("interviews.onlineMeeting")}
                  </span>
                </div>

                {prev.scorecard && (
                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                    <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                      <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                      {prev.scorecard.overallRating} ⭐
                    </span>
                    {getRecommendationBadge(prev.scorecard.recommendation)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </td>
    </tr>
  );
}
