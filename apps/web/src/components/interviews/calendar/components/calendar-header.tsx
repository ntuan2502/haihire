import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/shared";
import { useI18n } from "@/i18n";
import type { CalendarViewMode } from "../types";

export interface CalendarHeaderProps {
  calendarMode: CalendarViewMode;
  setCalendarMode: (mode: CalendarViewMode) => void;
  currentYear: number;
  currentMonth: number;
  onSelectMonthYear: (year: number, monthIndex: number) => void;
  monthTitle: string;
  weekTitle: string;
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  handleToday: () => void;
}

export function CalendarHeader({
  calendarMode,
  setCalendarMode,
  currentYear,
  currentMonth,
  onSelectMonthYear,
  monthTitle,
  weekTitle,
  handlePrevMonth,
  handleNextMonth,
  handleToday,
}: CalendarHeaderProps) {
  const { t, locale } = useI18n();

  const monthOptions = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(
      locale === "vi" ? "vi-VN" : "en-US",
      { month: "long", timeZone: "UTC" },
    );
    return Array.from({ length: 12 }, (_, idx) => {
      const raw = formatter.format(new Date(Date.UTC(2026, idx, 15)));
      const label = raw.charAt(0).toUpperCase() + raw.slice(1);
      return { value: String(idx), label };
    });
  }, [locale]);

  const yearOptions = useMemo(() => {
    const startYear = currentYear - 3;
    return Array.from({ length: 7 }, (_, i) => {
      const y = startYear + i;
      return { value: String(y), label: String(y) };
    });
  }, [currentYear]);

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 rounded-xl bg-card text-card-foreground border border-border shadow-2xs">
      {/* Left: Date Title & Nav Arrows */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="h-9 w-9 sm:h-8 sm:w-8 rounded-md border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-colors cursor-pointer"
            title={t("interviews.prevPeriod")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="h-9 w-9 sm:h-8 sm:w-8 rounded-md border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-colors cursor-pointer"
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

        <h2 className="text-base sm:text-lg font-semibold text-foreground">
          {calendarMode === "month" ? monthTitle : weekTitle}
        </h2>
      </div>

      {/* Right: Month/Year Selectors (Month mode) + Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2 w-full lg:w-auto">
        {calendarMode === "month" && (
          <div className="flex items-center gap-1.5 flex-1 sm:flex-initial min-w-0">
            <CustomSelect
              size="sm"
              aria-label={t("interviews.selectMonth")}
              value={String(currentMonth)}
              onChange={(val) =>
                onSelectMonthYear(currentYear, Number.parseInt(val, 10))
              }
              options={monthOptions}
              className="flex-1 min-w-0 sm:flex-initial sm:w-32"
              triggerClassName="text-xs font-semibold h-8"
            />
            <CustomSelect
              size="sm"
              aria-label={t("interviews.selectYear")}
              value={String(currentYear)}
              onChange={(val) =>
                onSelectMonthYear(Number.parseInt(val, 10), currentMonth)
              }
              options={yearOptions}
              className="w-20 sm:w-22 shrink-0"
              triggerClassName="text-xs font-semibold h-8 tabular-nums"
            />
          </div>
        )}

        <div className="flex items-center p-1 rounded-lg bg-muted border border-border">
          <button
            type="button"
            onClick={() => setCalendarMode("month")}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
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
            className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
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
