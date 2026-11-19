import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { CalendarWeekCard } from "./calendar-week-card";
import type { CalendarWeekDayInfo, CalendarEventItem } from "../types";

export interface CalendarWeekViewProps {
  weekDays: CalendarWeekDayInfo[];
  dayHeaders: string[];
  eventsByDate: Map<string, CalendarEventItem[]>;
  onScheduleDate: (dateStr: string) => void;
  onSelectEvent: (event: CalendarEventItem) => void;
  canEdit?: boolean;
}

export function CalendarWeekView({
  weekDays,
  dayHeaders,
  eventsByDate,
  onScheduleDate,
  onSelectEvent,
  canEdit = true,
}: CalendarWeekViewProps) {
  const { t } = useI18n();

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <div className="grid grid-cols-1 sm:grid-cols-7 sm:min-w-[980px] divide-y sm:divide-y-0 sm:divide-x divide-border">
          {weekDays.map((day, idx) => {
            const events = eventsByDate.get(day.dateStr) || [];
            const dayName = dayHeaders[idx];

            return (
              <div
                key={day.dateStr}
                className={`min-h-[340px] p-2.5 flex flex-col space-y-2.5 ${
                  day.isToday ? "bg-primary/5" : "bg-card"
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-border">
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                      {dayName}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-sm font-extrabold tabular-nums ${
                          day.isToday
                            ? "text-primary font-black"
                            : "text-foreground"
                        }`}
                      >
                        {day.displayDate}
                      </span>
                      {events.length > 0 && (
                        <span className="inline-flex items-center justify-center rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground tabular-nums">
                          {events.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {canEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onScheduleDate(day.dateStr)}
                      className="h-7 w-7 p-0 rounded-md hover:bg-primary/10 text-primary cursor-pointer shrink-0"
                      title={t("interviews.scheduleNew")}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {/* Events column for the day */}
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {events.length === 0 ? (
                    <p
                      aria-label={t("interviews.noScheduleForDay")}
                      className="text-xs text-muted-foreground/50 text-center py-8 select-none"
                    >
                      —
                    </p>
                  ) : (
                    events.map((evt, eIdx) => (
                      <CalendarWeekCard
                        key={
                          evt.interview.id || `${evt.application.id}-${eIdx}`
                        }
                        event={evt}
                        onSelectEvent={onSelectEvent}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
