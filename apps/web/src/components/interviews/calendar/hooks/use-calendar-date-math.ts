import { useState, useMemo } from "react";
import {
  combineDateTimeInTimezone,
  extractDateTimeInTimezone,
} from "@haihire/shared";
import { resolveEffectiveTimezone } from "@/lib/utils";
import { useLocalization } from "@/components/providers/localization-provider";
import { useI18n } from "@/i18n";
import type {
  CalendarDateInfo,
  CalendarWeekDayInfo,
  CalendarViewMode,
} from "../types";

export function formatLocalDate(
  year: number,
  monthIndex: number,
  day: number,
): string {
  const d = new Date(Date.UTC(year, monthIndex, day));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dt = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dt}`;
}

function parseYmdParts(ymd: string): {
  year: number;
  monthIndex: number;
  day: number;
} {
  const [y, m, d] = ymd.split("-").map(Number);
  return { year: y, monthIndex: m - 1, day: d };
}

export function useCalendarDateMath(initialDate: Date = new Date()) {
  const { t, locale } = useI18n();
  const { localization, isConfigured } = useLocalization();
  const effectiveTimezone = resolveEffectiveTimezone(
    localization.timezone,
    isConfigured,
  );
  const [calendarMode, setCalendarMode] = useState<CalendarViewMode>("month");
  const [activeYmd, setActiveYmd] = useState<string>(
    () => extractDateTimeInTimezone(initialDate, effectiveTimezone).date,
  );

  const todayStr = useMemo(
    () => extractDateTimeInTimezone(new Date(), effectiveTimezone).date,
    [effectiveTimezone],
  );

  const {
    year: currentYear,
    monthIndex: currentMonth,
    day: currentDay,
  } = useMemo(() => parseYmdParts(activeYmd), [activeYmd]);

  const currentDate = useMemo(
    () => new Date(currentYear, currentMonth, currentDay),
    [currentYear, currentMonth, currentDay],
  );

  const setCurrentDate = (next: Date) => {
    setActiveYmd(extractDateTimeInTimezone(next, effectiveTimezone).date);
  };

  const handlePrevMonth = () => {
    if (calendarMode === "month") {
      setActiveYmd(formatLocalDate(currentYear, currentMonth - 1, 1));
    } else {
      setActiveYmd(formatLocalDate(currentYear, currentMonth, currentDay - 7));
    }
  };

  const handleNextMonth = () => {
    if (calendarMode === "month") {
      setActiveYmd(formatLocalDate(currentYear, currentMonth + 1, 1));
    } else {
      setActiveYmd(formatLocalDate(currentYear, currentMonth, currentDay + 7));
    }
  };

  const handleToday = () => {
    setActiveYmd(extractDateTimeInTimezone(new Date(), effectiveTimezone).date);
  };

  const monthDays = useMemo(() => {
    const firstDayOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1));
    const lastDayOfMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0));

    // Monday as 0, Sunday as 6
    let startDayOfWeek = firstDayOfMonth.getUTCDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: CalendarDateInfo[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(
      Date.UTC(currentYear, currentMonth, 0),
    ).getUTCDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const dateStr = formatLocalDate(currentYear, currentMonth - 1, dayNum);
      const isWeekend = days.length % 7 === 5 || days.length % 7 === 6;
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isWeekend,
        year: currentYear,
        month: currentMonth,
        day: dayNum,
        date: new Date(Date.UTC(currentYear, currentMonth - 1, dayNum)),
      });
    }

    // Current month days
    for (let i = 1; i <= lastDayOfMonth.getUTCDate(); i++) {
      const dateStr = formatLocalDate(currentYear, currentMonth, i);
      const isWeekend = days.length % 7 === 5 || days.length % 7 === 6;
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isWeekend,
        year: currentYear,
        month: currentMonth + 1,
        day: i,
        date: new Date(Date.UTC(currentYear, currentMonth, i)),
      });
    }

    // Next month padding to fill out 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const dateStr = formatLocalDate(currentYear, currentMonth + 1, i);
      const isWeekend = days.length % 7 === 5 || days.length % 7 === 6;
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isWeekend,
        year: currentYear,
        month: currentMonth + 2,
        day: i,
        date: new Date(Date.UTC(currentYear, currentMonth + 1, i)),
      });
    }

    return days;
  }, [currentYear, currentMonth, todayStr]);

  const weekDays = useMemo(() => {
    const curr = new Date(Date.UTC(currentYear, currentMonth, currentDay));
    let dayOfWeek = curr.getUTCDay() - 1;
    if (dayOfWeek === -1) dayOfWeek = 6;

    const days: CalendarWeekDayInfo[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(
        Date.UTC(currentYear, currentMonth, currentDay - dayOfWeek + i),
      );
      const dateStr = formatLocalDate(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDate(),
      );

      days.push({
        dateStr,
        dayNumber: d.getUTCDate(),
        monthName:
          locale === "vi"
            ? `Th${d.getUTCMonth() + 1}`
            : `M${d.getUTCMonth() + 1}`,
        isToday: dateStr === todayStr,
      });
    }

    return days;
  }, [currentYear, currentMonth, currentDay, todayStr, locale]);

  const monthTitle = useMemo(() => {
    return new Date(
      Date.UTC(currentYear, currentMonth, 15, 12, 0, 0),
    ).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
      month: "long",
      year: "numeric",
      timeZone: effectiveTimezone,
    });
  }, [currentYear, currentMonth, locale, effectiveTimezone]);

  const weekTitle = useMemo(() => {
    if (weekDays.length < 7) return "";
    return `${t("interviews.week")}: ${weekDays[0].dayNumber}/${weekDays[0].monthName} - ${weekDays[6].dayNumber}/${weekDays[6].monthName}, ${currentYear}`;
  }, [weekDays, currentYear, t]);

  const dayHeaders = useMemo(
    () => [
      t("interviews.daysOfWeek.mon"),
      t("interviews.daysOfWeek.tue"),
      t("interviews.daysOfWeek.wed"),
      t("interviews.daysOfWeek.thu"),
      t("interviews.daysOfWeek.fri"),
      t("interviews.daysOfWeek.sat"),
      t("interviews.daysOfWeek.sun"),
    ],
    [t],
  );

  const visibleRange = useMemo(() => {
    const start =
      calendarMode === "week" ? weekDays[0]?.dateStr : monthDays[0]?.dateStr;
    const end =
      calendarMode === "week"
        ? weekDays[weekDays.length - 1]?.dateStr
        : monthDays[monthDays.length - 1]?.dateStr;

    const startDate = start
      ? combineDateTimeInTimezone(start, "00:00", effectiveTimezone)
      : undefined;
    const endDate = end
      ? new Date(
          new Date(
            combineDateTimeInTimezone(end, "23:59", effectiveTimezone),
          ).getTime() + 59999,
        ).toISOString()
      : undefined;

    return { startDate, endDate };
  }, [calendarMode, monthDays, weekDays, effectiveTimezone]);

  return {
    calendarMode,
    setCalendarMode,
    viewMode: calendarMode,
    setViewMode: setCalendarMode,
    currentDate,
    setCurrentDate,
    todayStr,
    visibleRange,
    handlePrevMonth,
    handleNextMonth,
    handlePrev: handlePrevMonth,
    handleNext: handleNextMonth,
    handleToday,
    monthDays,
    weekDays,
    monthTitle,
    weekTitle,
    dayHeaders,
    isToday: (d: Date | string) =>
      typeof d === "string"
        ? d === todayStr
        : extractDateTimeInTimezone(d, effectiveTimezone).date === todayStr,
    isWeekend: (d: Date) => d.getDay() === 0 || d.getDay() === 6,
    formatLocalDate,
  };
}
