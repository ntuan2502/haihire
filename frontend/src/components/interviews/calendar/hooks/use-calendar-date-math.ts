import { useState, useMemo } from "react";
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
  const d = new Date(year, monthIndex, day);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dt = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dt}`;
}

export function useCalendarDateMath(initialDate: Date = new Date()) {
  const { t, locale } = useI18n();
  const [calendarMode, setCalendarMode] = useState<CalendarViewMode>("month");
  const [currentDate, setCurrentDate] = useState<Date>(() => initialDate);

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const handlePrevMonth = () => {
    if (calendarMode === "month") {
      setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    } else {
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(prevWeek.getDate() - 7);
      setCurrentDate(prevWeek);
    }
  };

  const handleNextMonth = () => {
    if (calendarMode === "month") {
      setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    } else {
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(nextWeek.getDate() + 7);
      setCurrentDate(nextWeek);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const monthDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Monday as 0, Sunday as 6
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: CalendarDateInfo[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
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
        date: new Date(currentYear, currentMonth - 1, dayNum),
      });
    }

    // Current month days
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
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
        date: new Date(currentYear, currentMonth, i),
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
        date: new Date(currentYear, currentMonth + 1, i),
      });
    }

    return days;
  }, [currentYear, currentMonth, todayStr]);

  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    let dayOfWeek = curr.getDay() - 1;
    if (dayOfWeek === -1) dayOfWeek = 6;

    const startOfWeek = new Date(curr);
    startOfWeek.setDate(curr.getDate() - dayOfWeek);

    const days: CalendarWeekDayInfo[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = formatLocalDate(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
      );

      days.push({
        dateStr,
        dayNumber: d.getDate(),
        monthName:
          locale === "vi" ? `Th${d.getMonth() + 1}` : `M${d.getMonth() + 1}`,
        isToday: dateStr === todayStr,
      });
    }

    return days;
  }, [currentDate, todayStr, locale]);

  const monthTitle = useMemo(() => {
    return currentDate.toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
      month: "long",
      year: "numeric",
    });
  }, [currentDate, locale]);

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

  return {
    calendarMode,
    setCalendarMode,
    viewMode: calendarMode,
    setViewMode: setCalendarMode,
    currentDate,
    setCurrentDate,
    todayStr,
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
        : formatLocalDate(d.getFullYear(), d.getMonth(), d.getDate()) ===
          todayStr,
    isWeekend: (d: Date) => d.getDay() === 0 || d.getDay() === 6,
    formatLocalDate,
  };
}
