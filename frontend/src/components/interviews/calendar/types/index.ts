import type { Application, Job } from "@/types";
import type { ScheduledInterviewInfo } from "@/lib/interviews";

export type CalendarViewMode = "month" | "week";
export type CalendarMode = CalendarViewMode;

export interface CalendarDateInfo {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend?: boolean;
  year?: number;
  month?: number;
  day?: number;
  date?: Date;
}

export interface CalendarWeekDayInfo {
  dateStr: string;
  dayNumber: number;
  monthName: string;
  isToday: boolean;
}

export interface CalendarEventItem {
  id?: string;
  application: Application;
  interview: ScheduledInterviewInfo;
  job?: Job;
  dateKey?: string;
  dayOfMonth?: number;
}

export interface DayDetailsInfo {
  dateStr: string;
  dayNumber: number;
}
