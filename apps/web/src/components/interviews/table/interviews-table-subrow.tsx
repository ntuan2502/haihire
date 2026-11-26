"use client";

import { History, Star, User } from "lucide-react";
import { useLocalization } from "@/components/providers/localization-provider";
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
  const { localization, isConfigured } = useLocalization();
  const locOverrides = isConfigured ? localization : undefined;

  const getRecommendationBadge = (rec?: string) => {
    if (!rec) return null;
    const isYes = rec === "YES" || rec === "STRONG_YES";
    const label = getRecommendationLabel(rec, t);
    return (
      <span
        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
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
    <tr className="bg-muted/40 border-t border-border">
      <td colSpan={visibleColumnCount} className="px-6 py-3.5">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <History className="h-3.5 w-3.5 text-primary" />
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
                className="p-3 rounded-xl bg-card text-card-foreground border border-border shadow-2xs space-y-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-foreground">
                  <span>
                    {prev.round
                      ? t("interviews.roundInterview", {
                          round: prev.round,
                        })
                      : getInterviewTypeLabel(prev.type, t)}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    {formatDate(prev.scheduledAt, "numeric", locOverrides)} (
                    {formatTime(prev.scheduledAt, locOverrides)})
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1 min-w-0">
                    <User className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate">{prev.interviewer}</span>
                  </div>
                  <span className="shrink-0">
                    {prev.format === "OFFICE"
                      ? t("interviews.atOffice")
                      : t("interviews.onlineMeeting")}
                  </span>
                </div>

                {prev.scorecard && (
                  <div className="pt-1 border-t border-border flex items-center justify-between text-[10px]">
                    <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                      <Star
                        className="h-2.5 w-2.5 fill-amber-400 text-amber-400"
                        aria-hidden="true"
                      />
                      {prev.scorecard.overallRating}
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
