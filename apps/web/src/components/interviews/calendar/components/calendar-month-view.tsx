import { Plus } from "lucide-react";
import { useI18n } from "@/i18n";
import { CalendarEventChip } from "./calendar-event-chip";
import type {
  CalendarDateInfo,
  CalendarEventItem,
  DayDetailsInfo,
} from "../types";

export interface CalendarMonthViewProps {
  monthDays: CalendarDateInfo[];
  dayHeaders: string[];
  eventsByDate: Map<string, CalendarEventItem[]>;
  onSelectEvent: (event: CalendarEventItem) => void;
  onOpenDayDetails: (info: DayDetailsInfo) => void;
  onScheduleDate: (dateStr: string) => void;
  canEdit?: boolean;
}

export function CalendarMonthView({
  monthDays,
  dayHeaders,
  eventsByDate,
  onSelectEvent,
  onOpenDayDetails,
  onScheduleDate,
  canEdit = true,
}: CalendarMonthViewProps) {
  const { t } = useI18n();

  return (
    <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
      {/* Day Names Row */}
      <div className="grid grid-cols-7 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-center py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400">
        {dayHeaders.map((day, idx) => (
          <div
            key={day}
            className={idx >= 5 ? "text-rose-500/80 dark:text-rose-400/80" : ""}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/80">
        {monthDays.map((day, idx) => {
          const events = eventsByDate.get(day.dateStr) || [];
          const isWeekend = idx % 7 === 5 || idx % 7 === 6;
          const maxDisplay = 4;
          const visibleEvents = events.slice(0, maxDisplay);
          const remainingCount = events.length - maxDisplay;

          return (
            <div
              key={`${day.dateStr}-${idx}`}
              className={`min-h-[125px] sm:min-h-[145px] p-1.5 sm:p-2 flex flex-col justify-start transition-colors relative group ${
                day.isCurrentMonth
                  ? isWeekend
                    ? "bg-slate-50/30 dark:bg-slate-950/20"
                    : "bg-white dark:bg-slate-900"
                  : "bg-slate-50/60 dark:bg-slate-950/50 text-slate-400"
              } ${day.isToday ? "ring-2 ring-inset ring-blue-500/30 bg-blue-50/10" : ""}`}
            >
              {/* Top Bar inside cell: Date number & Add Button */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`inline-flex items-center justify-center text-xs font-bold rounded-lg ${
                    day.isToday
                      ? "h-6 w-6 bg-blue-600 text-white shadow-2xs"
                      : day.isCurrentMonth
                        ? "text-slate-800 dark:text-slate-200"
                        : "text-slate-400"
                  }`}
                >
                  {day.dayNumber}
                </span>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onScheduleDate(day.dateStr)}
                    className="opacity-0 group-hover:opacity-100 h-5 w-5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-all cursor-pointer"
                    title={`${t("interviews.scheduleNew")} ${day.dateStr}`}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* 1-Line Event Strips (Outlook style, max 4) */}
              <div className="space-y-1 w-full flex-1">
                {visibleEvents.map((evt, eIdx) => (
                  <CalendarEventChip
                    key={`${evt.application.id}-${eIdx}`}
                    event={evt}
                    onClick={() => onSelectEvent(evt)}
                  />
                ))}
              </div>

              {/* Outlook-style +N more indicator */}
              {remainingCount > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDayDetails({
                      dateStr: day.dateStr,
                      dayNumber: day.dayNumber,
                    });
                  }}
                  className="mt-1 text-center text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 py-0.5 rounded transition-colors cursor-pointer w-full"
                >
                  +{remainingCount}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
