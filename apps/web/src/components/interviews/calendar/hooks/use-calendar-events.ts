import { useMemo } from "react";
import { extractDateTimeInTimezone } from "@haihire/shared";
import { getInterviewsFromApplication } from "@/lib/interviews";
import { resolveEffectiveTimezone } from "@/lib/utils";
import { useLocalization } from "@/components/providers/localization-provider";
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
  const { localization, isConfigured } = useLocalization();
  const effectiveTimezone = resolveEffectiveTimezone(
    localization.timezone,
    isConfigured,
  );

  // Map of all interview events grouped by YYYY-MM-DD in effectiveTimezone
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();

    applications.forEach((app) => {
      const allInterviews = getInterviewsFromApplication(app);
      const job = jobs.find((j) => String(j.id) === String(app.jobId));

      allInterviews.forEach((intv) => {
        if (!intv.scheduledAt) return;
        const { date: dateKey } = extractDateTimeInTimezone(
          intv.scheduledAt,
          effectiveTimezone,
        );
        if (!dateKey) return;
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push({
          id: intv.id,
          application: app,
          interview: intv,
          job,
          dateKey,
          dayOfMonth: parseInt(dateKey.split("-")[2], 10),
        });
      });
    });

    // Sort events within each day chronologically
    map.forEach((events) => {
      events.sort((a, b) => {
        const msA = a.interview.scheduledAt
          ? new Date(a.interview.scheduledAt).getTime()
          : 0;
        const msB = b.interview.scheduledAt
          ? new Date(b.interview.scheduledAt).getTime()
          : 0;
        return msA - msB;
      });
    });

    return map;
  }, [applications, jobs, effectiveTimezone]);

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
