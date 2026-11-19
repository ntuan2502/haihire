"use client";

import { useState, useMemo, useEffect } from "react";
import { useCalendarDateMath } from "./hooks/use-calendar-date-math";
import { useCalendarEvents } from "./hooks/use-calendar-events";
import { CalendarHeader } from "./components/calendar-header";
import { CalendarMonthView } from "./components/calendar-month-view";
import { CalendarWeekView } from "./components/calendar-week-view";
import { DayDetailsModal } from "./modals/day-details-modal";
import { EventDetailsModal } from "./modals/event-details-modal";
import type {
  CalendarEventItem,
  DayDetailsInfo,
  InterviewsCalendarViewProps,
} from "./types";

export function InterviewsCalendarView({
  applications,
  jobs,
  calendarMode: controlledCalendarMode,
  activeMonth,
  activeDate,
  onCalendarStateChange,
  onScheduleDate,
  onEditSchedule,
  onOpenScorecard,
  onCancelInterview,
  onVisibleRangeChange,
  canEdit = true,
}: InterviewsCalendarViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(
    null,
  );
  const [openDayDetails, setOpenDayDetails] = useState<DayDetailsInfo | null>(
    null,
  );

  const {
    calendarMode,
    setCalendarMode,
    currentYear,
    currentMonth,
    handlePrevMonth,
    handleNextMonth,
    handleSelectMonthYear,
    handleToday,
    monthDays,
    weekDays,
    monthTitle,
    weekTitle,
    dayHeaders,
    visibleRange,
  } = useCalendarDateMath({
    controlledMode: controlledCalendarMode,
    controlledMonth: activeMonth,
    controlledDate: activeDate,
    onStateChange: onCalendarStateChange,
  });

  useEffect(() => {
    onVisibleRangeChange?.(visibleRange);
  }, [visibleRange, onVisibleRangeChange]);

  const { eventsByDate } = useCalendarEvents({
    applications,
    jobs,
  });

  const dayDetailsEvents = useMemo(() => {
    if (!openDayDetails) return [];
    return eventsByDate.get(openDayDetails.dateStr) || [];
  }, [openDayDetails, eventsByDate]);

  return (
    <div className="space-y-4">
      <CalendarHeader
        calendarMode={calendarMode}
        setCalendarMode={setCalendarMode}
        currentYear={currentYear}
        currentMonth={currentMonth}
        onSelectMonthYear={handleSelectMonthYear}
        monthTitle={monthTitle}
        weekTitle={weekTitle}
        handlePrevMonth={handlePrevMonth}
        handleNextMonth={handleNextMonth}
        handleToday={handleToday}
      />

      {calendarMode === "month" && (
        <CalendarMonthView
          monthDays={monthDays}
          dayHeaders={dayHeaders}
          eventsByDate={eventsByDate}
          onSelectEvent={setSelectedEvent}
          onOpenDayDetails={setOpenDayDetails}
          onScheduleDate={onScheduleDate}
          canEdit={canEdit}
        />
      )}

      {calendarMode === "week" && (
        <CalendarWeekView
          weekDays={weekDays}
          dayHeaders={dayHeaders}
          eventsByDate={eventsByDate}
          onScheduleDate={onScheduleDate}
          onSelectEvent={setSelectedEvent}
          canEdit={canEdit}
        />
      )}

      <DayDetailsModal
        isOpen={Boolean(openDayDetails)}
        openDayDetails={openDayDetails}
        events={dayDetailsEvents}
        onClose={() => setOpenDayDetails(null)}
        onSelectEvent={setSelectedEvent}
        onScheduleDate={onScheduleDate}
        canEdit={canEdit}
      />

      <EventDetailsModal
        isOpen={Boolean(selectedEvent)}
        selectedEvent={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onEditSchedule={onEditSchedule}
        onOpenScorecard={onOpenScorecard}
        onCancelInterview={onCancelInterview}
        canEdit={canEdit}
      />
    </div>
  );
}

export type { InterviewsCalendarViewProps };
