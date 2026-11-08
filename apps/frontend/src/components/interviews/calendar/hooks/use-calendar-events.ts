import { useMemo } from "react";
import { getInterviewsFromApplication } from "@/lib/interviews";
import { formatLocalDate } from "./use-calendar-date-math";
import type { Application, Job } from "@/types";
import type { CalendarEventItem } from "../types";

interface UseCalendarEventsProps {
  applications: Application[];
  jobs: Job[];
}

export function useCalendarEvents({
  applications,
  jobs,
}: UseCalendarEventsProps) {
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
          id: intv.id,
          application: app,
          interview: intv,
          job,
          dateKey,
          dayOfMonth: intv.date
            ? parseInt(intv.date.split("-")[2], 10)
            : undefined,
        });
      });
    });

    // Sort events within each day by time
    map.forEach((events) => {
      events.sort((a, b) =>
        (a.interview.time || "").localeCompare(b.interview.time || ""),
      );
    });

    return map;
  }, [applications, jobs]);

  // Record dictionary representation for easy lookup
  const eventsByDateKey = useMemo(() => {
    const record: Record<string, CalendarEventItem[]> = {};
    eventsByDate.forEach((events, key) => {
      record[key] = events;
    });
    return record;
  }, [eventsByDate]);

  const getEventsForDate = (date: Date | string): CalendarEventItem[] => {
    const key =
      typeof date === "string"
        ? date
        : formatLocalDate(date.getFullYear(), date.getMonth(), date.getDate());
    return eventsByDate.get(key) || [];
  };

  return {
    eventsByDate,
    eventsByDateKey,
    getEventsForDate,
  };
}
