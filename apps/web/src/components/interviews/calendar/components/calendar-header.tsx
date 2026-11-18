import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import type { CalendarViewMode } from "../types";

export interface CalendarHeaderProps {
  calendarMode: CalendarViewMode;
  setCalendarMode: (mode: CalendarViewMode) => void;
  monthTitle: string;
  weekTitle: string;
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  handleToday: () => void;
}

export function CalendarHeader({
  calendarMode,
  setCalendarMode,
  monthTitle,
  weekTitle,
  handlePrevMonth,
  handleNextMonth,
  handleToday,
}: CalendarHeaderProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-card text-card-foreground border border-border shadow-2xs">
      {/* Left: Date Title & Nav Arrows */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="h-8 w-8 rounded-md border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-colors cursor-pointer"
            title={t("interviews.prevPeriod")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="h-8 w-8 rounded-md border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-colors cursor-pointer"
            title={t("interviews.nextPeriod")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleToday}
          className="h-8 px-3 rounded-md text-xs font-bold cursor-pointer"
        >
          {t("interviews.today")}
        </Button>

        <h2 className="text-base sm:text-lg font-extrabold text-foreground">
          {calendarMode === "month" ? monthTitle : weekTitle}
        </h2>
      </div>

      {/* Right: Mode Switcher (Month / Week) */}
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <div className="flex items-center p-1 rounded-lg bg-muted border border-border">
          <button
            type="button"
            onClick={() => setCalendarMode("month")}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              calendarMode === "month"
                ? "bg-card text-primary shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("interviews.month")}
          </button>
          <button
            type="button"
            onClick={() => setCalendarMode("week")}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              calendarMode === "week"
                ? "bg-card text-primary shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("interviews.week")}
          </button>
        </div>
      </div>
    </div>
  );
}
