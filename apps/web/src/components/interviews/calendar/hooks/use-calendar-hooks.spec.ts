import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCalendarDateMath, formatLocalDate } from "./use-calendar-date-math";
import { useCalendarEvents } from "./use-calendar-events";
import type { Application, Job } from "@/types";

describe("useCalendarDateMath", () => {
  it("formats local date properly", () => {
    expect(formatLocalDate(2026, 0, 5)).toBe("2026-01-05");
    expect(formatLocalDate(2026, 9, 25)).toBe("2026-10-25");
  });

  it("initializes with default month mode and navigates in month mode", () => {
    const fixedDate = new Date(2026, 9, 15); // Oct 15, 2026
    const { result } = renderHook(() => useCalendarDateMath(fixedDate));

    expect(result.current.calendarMode).toBe("month");
    expect(result.current.monthDays.length % 7).toBe(0);

    act(() => {
      result.current.handleNextMonth();
    });
    expect(result.current.currentDate.getMonth()).toBe(10); // Nov

    act(() => {
      result.current.handlePrevMonth();
    });
    expect(result.current.currentDate.getMonth()).toBe(9); // Back to Oct
  });

  it("navigates by week when in week mode", () => {
    const fixedDate = new Date(2026, 9, 15); // Oct 15, 2026
    const { result } = renderHook(() => useCalendarDateMath(fixedDate));

    act(() => {
      result.current.setCalendarMode("week");
    });
    expect(result.current.calendarMode).toBe("week");

    act(() => {
      result.current.handleNextMonth(); // in week mode, should add 7 days
    });
    expect(result.current.currentDate.getDate()).toBe(22);

    act(() => {
      result.current.handlePrev(); // in week mode, should subtract 7 days
    });
    expect(result.current.currentDate.getDate()).toBe(15);
  });

  it("resets to today when handleToday is invoked", () => {
    const pastDate = new Date(2020, 0, 1);
    const { result } = renderHook(() => useCalendarDateMath(pastDate));

    act(() => {
      result.current.handleToday();
    });

    const now = new Date();
    expect(result.current.currentDate.getFullYear()).toBe(now.getFullYear());
    expect(result.current.currentDate.getMonth()).toBe(now.getMonth());
    expect(result.current.currentDate.getDate()).toBe(now.getDate());
  });

  it("correctly identifies isToday and isWeekend", () => {
    const { result } = renderHook(() => useCalendarDateMath());

    const now = new Date();
    expect(result.current.isToday(now)).toBe(true);
    expect(result.current.isToday(result.current.todayStr)).toBe(true);
    expect(result.current.isToday(new Date(2000, 0, 1))).toBe(false);
    expect(result.current.isToday("2000-01-01")).toBe(false);

    const saturday = new Date(2026, 9, 17); // Saturday
    const sunday = new Date(2026, 9, 18); // Sunday
    const monday = new Date(2026, 9, 19); // Monday
    expect(result.current.isWeekend(saturday)).toBe(true);
    expect(result.current.isWeekend(sunday)).toBe(true);
    expect(result.current.isWeekend(monday)).toBe(false);
  });
});

describe("useCalendarEvents", () => {
  const mockJobs: Job[] = [
    {
      id: "job-1",
      title: "Backend Engineer",
      slug: "backend-engineer",
      department: "Engineering",
      location: "Hanoi",
      type: "FULL_TIME",
      experienceLevel: "SENIOR",
      workplaceType: "HYBRID",
      status: "OPEN",
      applicationCount: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ];

  const mockApplications: Application[] = [
    {
      id: "app-1",
      candidateId: "cand-1",
      jobId: "job-1",
      stage: "INTERVIEW",
      appliedAt: "2026-10-01T00:00:00.000Z",
      candidate: {
        id: "cand-1",
        name: "Nguyen Van A",
        email: "a@test.com",
        phone: "0901234567",
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
      },
      interviews: [
        {
          id: "intv-1",
          date: "2026-10-20",
          time: "14:00",
          type: "TECHNICAL",
          format: "ONLINE",
          linkOrLocation: "https://meet.google.com/xyz",
          interviewer: "Jane Doe",
          status: "SCHEDULED",
        },
        {
          id: "intv-2",
          date: "2026-10-20",
          time: "10:00",
          type: "CULTURE_FIT",
          format: "ONLINE",
          linkOrLocation: "https://meet.google.com/xyz",
          interviewer: "Jane Doe",
          status: "SCHEDULED",
        },
        {
          id: "intv-no-date",
          date: "",
          time: "09:00",
          type: "TECHNICAL",
          format: "ONLINE",
          linkOrLocation: "https://meet.google.com/xyz",
          interviewer: "Jane Doe",
          status: "SCHEDULED",
        },
      ],
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    },
  ];

  it("groups and sorts events by date and time, filtering out dateless interviews", () => {
    const { result } = renderHook(() =>
      useCalendarEvents({
        applications: mockApplications,
        jobs: mockJobs,
      }),
    );

    const oct20Events = result.current.eventsByDate.get("2026-10-20");
    expect(oct20Events).toBeDefined();
    expect(oct20Events!.length).toBe(2);
    // Sorted by time: 10:00 first, then 14:00
    expect(oct20Events![0].interview.time).toBe("10:00");
    expect(oct20Events![1].interview.time).toBe("14:00");
    expect(oct20Events![0].job?.title).toBe("Backend Engineer");

    // eventsByDateKey matches map
    expect(result.current.eventsByDateKey["2026-10-20"]).toHaveLength(2);

    // getEventsForDate with string
    const stringLookup = result.current.getEventsForDate("2026-10-20");
    expect(stringLookup).toHaveLength(2);

    // getEventsForDate with Date object
    const dateLookup = result.current.getEventsForDate(new Date(2026, 9, 20));
    expect(dateLookup).toHaveLength(2);

    // getEventsForDate on empty day
    expect(result.current.getEventsForDate("2026-10-21")).toEqual([]);
  });
});
