"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  MapPin,
  Plus,
  Star,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MacOsModal } from "@/components/shared";
import { getCandidateDisplayName, getInitials } from "@/lib/utils";
import { useI18n } from "@/i18n";
import {
  getInterviewsFromApplication,
  getInterviewTypeLabel,
  getRecommendationLabel,
  type ScheduledInterviewInfo,
} from "@/lib/interviews";
import type { Application, Job } from "@/types";

export interface InterviewsCalendarViewProps {
  applications: Application[];
  jobs: Job[];
  onScheduleDate: (dateStr: string) => void;
  onEditSchedule: (app: Application, interview: ScheduledInterviewInfo) => void;
  onOpenScorecard: (app: Application, interview: ScheduledInterviewInfo) => void;
  canEdit?: boolean;
}

interface CalendarEventItem {
  application: Application;
  interview: ScheduledInterviewInfo;
  job?: Job;
}

type CalendarMode = "month" | "week";

function formatLocalDate(year: number, monthIndex: number, day: number): string {
  const d = new Date(year, monthIndex, day);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dt = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dt}`;
}

export function InterviewsCalendarView({
  applications,
  jobs,
  onScheduleDate,
  onEditSchedule,
  onOpenScorecard,
  canEdit = true,
}: InterviewsCalendarViewProps) {
  const { t, locale } = useI18n();
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("month");
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(null);
  const [openDayDetails, setOpenDayDetails] = useState<{
    dateStr: string;
    dayNumber: number;
  } | null>(null);

  // Map of all interview events grouped by YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();

    applications.forEach((app) => {
      const allInterviews = getInterviewsFromApplication(app);
      const job = jobs.find((j) => String(j.id) === String(app.jobId));

      allInterviews.forEach((intv) => {
        if (!intv.date) return;
        const dateKey = intv.date; // "YYYY-MM-DD"
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push({
          application: app,
          interview: intv,
          job,
        });
      });
    });

    // Sort events within each day by time
    map.forEach((events) => {
      events.sort((a, b) => (a.interview.time || "").localeCompare(b.interview.time || ""));
    });

    return map;
  }, [applications, jobs]);

  // Today string YYYY-MM-DD in local timezone
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  // Helpers for Month calculation
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  // Month navigation
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

  // Month days array (with padding for start of week - Monday first)
  const monthDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Monday as 0, Sunday as 6
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: { dateStr: string; dayNumber: number; isCurrentMonth: boolean; isToday: boolean }[] =
      [];

    // Previous month padding
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const dateStr = formatLocalDate(currentYear, currentMonth - 1, dayNum);
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    // Current month days
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const dateStr = formatLocalDate(currentYear, currentMonth, i);
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // Next month padding to fill out 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const dateStr = formatLocalDate(currentYear, currentMonth + 1, i);
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    return days;
  }, [currentYear, currentMonth, todayStr]);

  // Week days array (Monday to Sunday)
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    let dayOfWeek = curr.getDay() - 1;
    if (dayOfWeek === -1) dayOfWeek = 6;

    const startOfWeek = new Date(curr);
    startOfWeek.setDate(curr.getDate() - dayOfWeek);

    const days: { dateStr: string; dayNumber: number; monthName: string; isToday: boolean }[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = formatLocalDate(d.getFullYear(), d.getMonth(), d.getDate());

      days.push({
        dateStr,
        dayNumber: d.getDate(),
        monthName: locale === "vi" ? `Th${d.getMonth() + 1}` : `M${d.getMonth() + 1}`,
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

  const dayHeaders = useMemo(() => [
    t("interviews.daysOfWeek.mon"),
    t("interviews.daysOfWeek.tue"),
    t("interviews.daysOfWeek.wed"),
    t("interviews.daysOfWeek.thu"),
    t("interviews.daysOfWeek.fri"),
    t("interviews.daysOfWeek.sat"),
    t("interviews.daysOfWeek.sun"),
  ], [t]);

  const dayDetailsEvents = useMemo(() => {
    if (!openDayDetails) return [];
    return eventsByDate.get(openDayDetails.dateStr) || [];
  }, [openDayDetails, eventsByDate]);

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
    <div className="space-y-4">
      {/* Calendar Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        {/* Left: Date Title & Nav Arrows */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="h-8 w-8 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              title={t("interviews.prevPeriod")}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="h-8 w-8 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              title={t("interviews.nextPeriod")}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleToday}
            className="h-8 px-3 rounded-xl text-xs font-bold cursor-pointer"
          >
            {t("interviews.today")}
          </Button>

          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
            {calendarMode === "month" ? monthTitle : weekTitle}
          </h2>
        </div>

        {/* Right: Mode Switcher (Month / Week) */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setCalendarMode("month")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                calendarMode === "month"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {t("interviews.month")}
            </button>
            <button
              type="button"
              onClick={() => setCalendarMode("week")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                calendarMode === "week"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {t("interviews.week")}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/*                     MONTH VIEW                            */}
      {/* ========================================================= */}
      {calendarMode === "month" && (
        <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          {/* Day Names Row */}
          <div className="grid grid-cols-7 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-center py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400">
            {dayHeaders.map((day, idx) => (
              <div key={day} className={idx >= 5 ? "text-rose-500/80 dark:text-rose-400/80" : ""}>
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
                    {visibleEvents.map((evt, eIdx) => {
                      const candidateName = getCandidateDisplayName(evt.application);
                      const hasScorecard = Boolean(evt.interview.scorecard);

                      return (
                        <div
                          key={`${evt.application.id}-${eIdx}`}
                          onClick={() => setSelectedEvent(evt)}
                          className={`h-5 sm:h-[22px] px-1.5 rounded flex items-center gap-1.5 text-[11px] leading-none cursor-pointer transition-all hover:brightness-95 active:scale-[0.99] border-l-2 select-none truncate ${
                            hasScorecard
                              ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-950 dark:text-emerald-200"
                              : "bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-950 dark:text-blue-200"
                          }`}
                          title={`${evt.interview.time || ""} ${candidateName} • ${evt.job?.title || ""}`}
                        >
                          <span className="font-bold shrink-0 text-[10px] opacity-75 font-mono">
                            {evt.interview.time || "10:00"}
                          </span>
                          <span className="font-semibold truncate">
                            {candidateName}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Outlook-style +N more indicator */}
                  {remainingCount > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDayDetails({
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
      )}

      {/* ========================================================= */}
      {/*                      WEEK VIEW                            */}
      {/* ========================================================= */}
      {calendarMode === "week" && (
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
                    day.isToday ? "bg-blue-50/20 dark:bg-blue-950/20" : "bg-white dark:bg-slate-900"
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
                          day.isToday ? "text-blue-600 dark:text-blue-400 font-black" : "text-slate-800 dark:text-slate-200"
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
                      events.map((evt, eIdx) => {
                        const candidateName = getCandidateDisplayName(evt.application);
                        const hasScorecard = Boolean(evt.interview.scorecard);

                        return (
                          <div
                            key={`${evt.application.id}-${eIdx}`}
                            className={`p-3 rounded-2xl border space-y-2 transition-all shadow-2xs ${
                              hasScorecard
                                ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80"
                                : "bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 text-xs">
                              <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
                                <Clock className="h-3 w-3 text-blue-500" />
                                {evt.interview.time}
                              </span>

                              {hasScorecard ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                                  <Star className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500" />
                                  <span>{evt.interview.scorecard?.overallRating} ⭐</span>
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                                  {evt.interview.round ? t("interviews.roundInterview", { round: evt.interview.round }) : t("interviews.round")}
                                </span>
                              )}
                            </div>

                            <div>
                              <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {candidateName}
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {evt.job?.title}
                              </p>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                              <span className="truncate max-w-[80px]">
                                {t("interviews.tableHeaders.interviewer")}: {evt.interview.interviewer}
                              </span>
                              {evt.interview.format === "OFFICE" ? (
                                <span className="text-rose-600 font-semibold">{t("interviews.atOffice")}</span>
                              ) : (
                                <span className="text-emerald-600 font-semibold">{t("interviews.onlineFormat", { format: evt.interview.format || "ONLINE" })}</span>
                              )}
                            </div>

                            {/* Actions in card */}
                            <div className="pt-1 flex items-center justify-between gap-1">
                              {evt.interview.linkOrLocation?.startsWith("http") && (
                                <a
                                  href={evt.interview.linkOrLocation}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                                >
                                  <Video className="h-2.5 w-2.5" />
                                  <span>{t("interviews.joinMeetingShort")}</span>
                                </a>
                              )}

                              <button
                                type="button"
                                onClick={() => onOpenScorecard(evt.application, evt.interview)}
                                className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer ml-auto"
                              >
                                {hasScorecard ? t("interviews.viewEvaluation") : t("interviews.scorecardAction")}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/*        DAY DETAILS MODAL (macOS Window Style)             */}
      {/* ========================================================= */}
      <MacOsModal
        isOpen={Boolean(openDayDetails)}
        onClose={() => setOpenDayDetails(null)}
        title={dayDetailsTitle}
        badge={
          dayDetailsEvents.length > 0 ? (
            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300">
              {dayDetailsEvents.length}
            </span>
          ) : undefined
        }
        headerRight={
          canEdit && openDayDetails ? (
            <button
              type="button"
              onClick={() => {
                const d = openDayDetails.dateStr;
                setOpenDayDetails(null);
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
              {t("interviews.candidateInterviewsMultiple", { count: dayDetailsEvents.length })}
            </span>
            {openDayDetails && (
              <span className="text-xs font-mono font-medium text-slate-400 dark:text-slate-500">
                {openDayDetails.dateStr}
              </span>
            )}
          </div>

          {/* Event list */}
          <div className="max-h-[440px] overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
            {dayDetailsEvents.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
                <Clock className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="text-xs text-slate-400 italic">
                  {t("interviews.noScheduleForDay")}
                </p>
              </div>
            ) : (
              dayDetailsEvents.map((evt, idx) => {
                const candidateName = getCandidateDisplayName(evt.application);
                const hasScorecard = Boolean(evt.interview.scorecard);

                return (
                  <div
                    key={`${evt.application.id}-${idx}`}
                    onClick={() => {
                      setOpenDayDetails(null);
                      setSelectedEvent(evt);
                    }}
                    className={`p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.006] active:scale-[0.995] flex items-center justify-between gap-4 shadow-2xs ${
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
                  </div>
                );
              })
            )}
          </div>
        </div>
      </MacOsModal>

      {/* ========================================================= */}
      {/*        CLICKED EVENT DETAIL MODAL (macOS Window Style)    */}
      {/* ========================================================= */}
      <MacOsModal
        isOpen={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent ? getCandidateDisplayName(selectedEvent.application) : ""}
        badge={
          selectedEvent?.interview.round ? (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {t("interviews.round")} {selectedEvent.interview.round}
            </span>
          ) : undefined
        }
        size="md"
        contentClassName="p-5 flex flex-col min-h-0 bg-[#fbfbfd] dark:bg-[#1a1a1a] space-y-4"
      >
        {selectedEvent && (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  {getInitials(getCandidateDisplayName(selectedEvent.application))}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {getCandidateDisplayName(selectedEvent.application)}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selectedEvent.application.candidateEmail}</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#252525] border border-slate-200/80 dark:border-white/10 space-y-2.5 text-xs shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t("interviews.role")}:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedEvent.job?.title || t("interviews.defaultJob")}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t("interviews.roundType")}:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {getInterviewTypeLabel(selectedEvent.interview.type, t)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t("interviews.timeLabel")}:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {t("interviews.atTime", {
                    date: selectedEvent.interview.date,
                    time: selectedEvent.interview.time,
                  })}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t("interviews.tableHeaders.interviewer")}:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedEvent.interview.interviewer}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t("interviews.formatLabel")}:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedEvent.interview.format === "OFFICE"
                    ? t("interviews.atOffice")
                    : t("interviews.onlineFormat", {
                        format: selectedEvent.interview.format,
                      })}
                </span>
              </div>

              {selectedEvent.interview.linkOrLocation && (
                <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <span className="text-slate-400">{t("interviews.meetingUrlLabel")}:</span>
                  {selectedEvent.interview.linkOrLocation.startsWith("http") ? (
                    <a
                      href={selectedEvent.interview.linkOrLocation}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      <Video className="h-3.5 w-3.5" />
                      <span>{t("interviews.openMeetingShort")}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                      {selectedEvent.interview.linkOrLocation}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Existing Scorecard Overview if present */}
            {selectedEvent.interview.scorecard && (
              <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    <span>
                      {t("interviews.ratingResult", {
                        score: selectedEvent.interview.scorecard.overallRating,
                      })}
                    </span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 font-bold text-[10px] text-emerald-600 border border-emerald-200 dark:border-emerald-800">
                    {getRecommendationLabel(selectedEvent.interview.scorecard.recommendation, t)}
                  </span>
                </div>
                {selectedEvent.interview.scorecard.feedback && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 italic pt-1 line-clamp-2">
                    &ldquo;{selectedEvent.interview.scorecard.feedback}&rdquo;
                  </p>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedEvent(null)}
                className="h-8 rounded-xl text-xs cursor-pointer"
              >
                {t("common.close")}
              </Button>

              <div className="flex items-center gap-2">
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const evt = selectedEvent;
                      setSelectedEvent(null);
                      onEditSchedule(evt.application, evt.interview);
                    }}
                    className="h-8 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    {t("interviews.editSchedule")}
                  </Button>
                )}

                <Button
                  size="sm"
                  onClick={() => {
                    const evt = selectedEvent;
                    setSelectedEvent(null);
                    onOpenScorecard(evt.application, evt.interview);
                  }}
                  className="h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Star className="h-3 w-3" />
                  <span>
                    {selectedEvent.interview.scorecard ? t("interviews.updateSchedule") : t("interviews.scorecardAction")}
                  </span>
                </Button>
              </div>
            </div>
          </>
        )}
      </MacOsModal>
    </div>
  );
}
