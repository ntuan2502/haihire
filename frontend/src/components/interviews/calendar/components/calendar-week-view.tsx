import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { CalendarWeekCard } from "./calendar-week-card";
import type { Application } from "@/types";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import type { CalendarWeekDayInfo, CalendarEventItem } from "../types";

export interface CalendarWeekViewProps {
  weekDays: CalendarWeekDayInfo[];
  dayHeaders: string[];
  eventsByDate: Map<string, CalendarEventItem[]>;
  onScheduleDate: (dateStr: string) => void;
  onOpenScorecard: (
    app: Application,
    interview: ScheduledInterviewInfo,
  ) => void;
  canEdit?: boolean;
}

export function CalendarWeekView({
  weekDays,
  dayHeaders,
  eventsByDate,
  onScheduleDate,
  onOpenScorecard,
  canEdit = true,
}: CalendarWeekViewProps) {
  const { t } = useI18n();

  return (
    <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
      {/* Header Row: 7 days of week */}
      <div className="grid grid-cols-1 sm:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
        {weekDays.map((day, idx) => {
          const events = eventsByDate.get(day.dateStr) || [];
          const dayName = dayHeaders[idx];

          return (
            <div
              key={day.dateStr}
              className={`min-h-[350px] p-3 flex flex-col space-y-3 ${
                day.isToday
                  ? "bg-blue-50/20 dark:bg-blue-950/20"
                  : "bg-white dark:bg-slate-900"
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    {dayName}
                  </span>
                  <span
                    className={`text-sm font-extrabold ${
                      day.isToday
                        ? "text-blue-600 dark:text-blue-400 font-black"
                        : "text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {day.dayNumber} {day.monthName}
                  </span>
                </div>

                {canEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onScheduleDate(day.dateStr)}
                    className="h-7 w-7 p-0 rounded-lg hover:bg-blue-50 text-blue-600 dark:text-blue-400 cursor-pointer"
                    title={t("interviews.scheduleNew")}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {/* Events column for the day */}
              <div className="flex-1 space-y-2.5 overflow-y-auto">
                {events.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic text-center py-6">
                    {t("interviews.noScheduleForDay")}
                  </p>
                ) : (
                  events.map((evt, eIdx) => (
                    <CalendarWeekCard
                      key={`${evt.application.id}-${eIdx}`}
                      event={evt}
                      onOpenScorecard={onOpenScorecard}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
