import { useMemo } from "react";
import { Clock, MapPin, Plus, Star, Video } from "lucide-react";
import { CustomModal } from "@/components/shared";
import { getCandidateDisplayName } from "@/lib/utils";
import { useI18n } from "@/i18n";
import type { CalendarEventItem, DayDetailsInfo } from "../types";

export interface DayDetailsModalProps {
  isOpen: boolean;
  openDayDetails: DayDetailsInfo | null;
  events: CalendarEventItem[];
  onClose: () => void;
  onSelectEvent: (event: CalendarEventItem) => void;
  onScheduleDate: (dateStr: string) => void;
  canEdit?: boolean;
}

export function DayDetailsModal({
  isOpen,
  openDayDetails,
  events,
  onClose,
  onSelectEvent,
  onScheduleDate,
  canEdit = true,
}: DayDetailsModalProps) {
  const { t, locale } = useI18n();

  const dayDetailsTitle = useMemo(() => {
    if (!openDayDetails) return "";
    const [y, m, d] = openDayDetails.dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [openDayDetails, locale]);

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={dayDetailsTitle}
      badge={
        events.length > 0 ? (
          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300">
            {events.length}
          </span>
        ) : undefined
      }
      headerRight={
        canEdit && openDayDetails ? (
          <button
            type="button"
            onClick={() => {
              const d = openDayDetails.dateStr;
              onClose();
              onScheduleDate(d);
            }}
            className="h-7 px-2.5 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
          >
            <Plus className="h-3 w-3" />
            <span>{t("interviews.scheduleNew")}</span>
          </button>
        ) : undefined
      }
      size="md"
      contentClassName="p-4 sm:p-5 flex flex-col min-h-0 bg-[#fbfbfd] dark:bg-[#1a1a1a]"
    >
      <div className="flex flex-col min-h-0">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60 dark:border-white/10">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t("interviews.candidateInterviewsMultiple", {
              count: events.length,
            })}
          </span>
          {openDayDetails && (
            <span className="text-xs font-mono font-medium text-slate-400 dark:text-slate-500">
              {openDayDetails.dateStr}
            </span>
          )}
        </div>

        {/* Event list */}
        <div className="max-h-[440px] overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
          {events.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
              <Clock className="h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-xs text-slate-400 italic">
                {t("interviews.noScheduleForDay")}
              </p>
            </div>
          ) : (
            events.map((evt, idx) => {
              const candidateName = getCandidateDisplayName(evt.application);
              const hasScorecard = Boolean(evt.interview.scorecard);

              return (
                <button
                  type="button"
                  key={`${evt.application.id}-${idx}`}
                  onClick={() => {
                    onClose();
                    onSelectEvent(evt);
                  }}
                  aria-label={`Interview with ${candidateName} at ${evt.interview.time || "10:00"}`}
                  className={`w-full text-left p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.006] active:scale-[0.995] flex items-center justify-between gap-4 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    hasScorecard
                      ? "bg-emerald-50/70 hover:bg-emerald-100/70 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 border-emerald-200/80 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-100"
                      : "bg-white hover:bg-slate-50/90 dark:bg-[#252525] dark:hover:bg-[#2c2c2c] border-slate-200/80 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-600 text-slate-900 dark:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="font-bold text-blue-600 dark:text-blue-400 shrink-0 font-mono text-xs px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60">
                      {evt.interview.time || "10:00"}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate text-slate-900 dark:text-white">
                        {candidateName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {evt.job?.title || t("interviews.defaultJob")}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {hasScorecard ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 font-bold text-xs">
                        <Star className="h-3.5 w-3.5 fill-amber-400" />
                        <span>{evt.interview.scorecard?.overallRating}</span>
                      </span>
                    ) : evt.interview.format === "OFFICE" ? (
                      <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-500 flex items-center justify-center">
                        <MapPin className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-500 flex items-center justify-center">
                        <Video className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </CustomModal>
  );
}
