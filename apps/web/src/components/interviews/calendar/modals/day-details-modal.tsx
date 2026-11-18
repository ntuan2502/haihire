import { useMemo } from "react";
import { Clock, MapPin, Plus, Star, Video } from "lucide-react";
import { CustomModal } from "@/components/shared";
import { formatTime, getCandidateDisplayName } from "@/lib/utils";
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
          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-secondary text-secondary-foreground">
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
            className="h-7 px-2.5 rounded-md text-xs font-semibold text-primary hover:bg-primary/10 border border-primary/20 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
          >
            <Plus className="h-3 w-3" />
            <span>{t("interviews.scheduleNew")}</span>
          </button>
        ) : undefined
      }
      size="md"
      contentClassName="p-4 sm:p-5 flex flex-col min-h-0 bg-background"
    >
      <div className="flex flex-col min-h-0">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("interviews.candidateInterviewsMultiple", {
              count: events.length,
            })}
          </span>
          {openDayDetails && (
            <span className="text-xs font-mono font-medium text-muted-foreground">
              {openDayDetails.dateStr}
            </span>
          )}
        </div>

        {/* Event list */}
        <div className="max-h-[440px] overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
          {events.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
              <Clock className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground italic">
                {t("interviews.noScheduleForDay")}
              </p>
            </div>
          ) : (
            events.map((evt, idx) => {
              const candidateName = getCandidateDisplayName(evt.application);
              const hasScorecard = Boolean(evt.interview.scorecard);
              const formattedTime = formatTime(evt.interview.scheduledAt);

              return (
                <button
                  type="button"
                  key={`${evt.application.id}-${idx}`}
                  onClick={() => {
                    onClose();
                    onSelectEvent(evt);
                  }}
                  aria-label={t("interviews.interviewEventAria", {
                    candidate: candidateName,
                    time: formattedTime,
                  })}
                  className={`w-full text-left p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.006] active:scale-[0.995] flex items-center justify-between gap-4 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    hasScorecard
                      ? "bg-emerald-50/70 hover:bg-emerald-100/70 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 border-emerald-200/80 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-100"
                      : "bg-card hover:bg-muted/50 border-border hover:border-primary/40 text-card-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="font-bold text-primary shrink-0 font-mono text-xs px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20">
                      {formattedTime}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate text-foreground">
                        {candidateName}
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
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
