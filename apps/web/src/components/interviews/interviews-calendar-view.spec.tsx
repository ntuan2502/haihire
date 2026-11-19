import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InterviewsCalendarView } from "./interviews-calendar-view";
import type { Application, Job } from "@/types";

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    locale: "en",
    t: (key: string, params?: Record<string, string | number>) => {
      const dict: Record<string, string> = {
        "interviews.interviewEventAria": "Interview with {candidate} at {time}",
      };
      const base = dict[key] ?? key;
      if (params) {
        return Object.entries(params).reduce(
          (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
          base,
        );
      }
      return base;
    },
  }),
}));

describe("InterviewsCalendarView Component Tests", () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const todayDateStr = `${year}-${month}-${day}`;

  const mockApp: Application = {
    id: "app-1",
    jobId: "job-1",
    candidateName: "Nguyen Van A",
    candidateEmail: "a@example.com",
    stage: "INTERVIEW",
    orderIndex: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    interviews: [
      {
        id: "intv-1",
        applicationId: "app-1",
        scheduledAt: new Date(
          year,
          today.getMonth(),
          today.getDate(),
          14,
          0,
          0,
        ).toISOString(),
        type: "TECHNICAL",
        format: "ONLINE",
        linkOrLocation: "https://meet.google.com/xyz",
        interviewer: "Jane Doe",
        round: 1,
      },
    ],
  };

  const mockJob: Job = {
    id: "job-1",
    organizationId: "org-1",
    title: "Senior Backend Developer",
    slug: "senior-backend-dev",
    department: "Engineering",
    location: "Hanoi",
    workplaceType: "REMOTE",
    employmentType: "FULL_TIME",
    status: "PUBLISHED",
    description: "Role desc",
    requirements: "Role req",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Original Accessibility Test
  it("renders interview chip as keyboard-accessible button with aria-label", () => {
    render(
      <InterviewsCalendarView
        applications={[mockApp]}
        jobs={[mockJob]}
        onScheduleDate={vi.fn()}
        onEditSchedule={vi.fn()}
        onOpenScorecard={vi.fn()}
      />,
    );

    const eventChip = screen.getByRole("button", {
      name: "Interview with Nguyen Van A at 14:00",
    });
    expect(eventChip).toBeInTheDocument();
    expect(eventChip.tagName).toBe("BUTTON");

    eventChip.focus();
    expect(document.activeElement).toBe(eventChip);

    fireEvent.click(eventChip);

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  // A.1: Date math (5 tests)
  describe("A.1: Date math", () => {
    it("navigates to previous month when clicking previous button", () => {
      render(
        <InterviewsCalendarView
          applications={[mockApp]}
          jobs={[mockJob]}
          onScheduleDate={vi.fn()}
          onEditSchedule={vi.fn()}
          onOpenScorecard={vi.fn()}
        />,
      );

      const prevBtn = screen.getByTitle("interviews.prevPeriod");
      fireEvent.click(prevBtn);

      const expectedPrevMonth = new Date(year, today.getMonth() - 1, 1);
      const expectedTitle = expectedPrevMonth.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      expect(screen.getByText(expectedTitle)).toBeInTheDocument();
    });

    it("navigates to next month when clicking next button", () => {
      render(
        <InterviewsCalendarView
          applications={[mockApp]}
          jobs={[mockJob]}
          onScheduleDate={vi.fn()}
          onEditSchedule={vi.fn()}
          onOpenScorecard={vi.fn()}
        />,
      );

      const nextBtn = screen.getByTitle("interviews.nextPeriod");
      fireEvent.click(nextBtn);

      const expectedNextMonth = new Date(year, today.getMonth() + 1, 1);
      const expectedTitle = expectedNextMonth.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      expect(screen.getByText(expectedTitle)).toBeInTheDocument();
    });

    it("resets to current month when clicking today button", () => {
      render(
        <InterviewsCalendarView
          applications={[mockApp]}
          jobs={[mockJob]}
          onScheduleDate={vi.fn()}
          onEditSchedule={vi.fn()}
          onOpenScorecard={vi.fn()}
        />,
      );

      const nextBtn = screen.getByTitle("interviews.nextPeriod");
      fireEvent.click(nextBtn);
      fireEvent.click(nextBtn);

      const todayBtn = screen.getByRole("button", {
        name: "interviews.today",
      });
      fireEvent.click(todayBtn);

      const currentTitle = today.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      expect(screen.getByText(currentTitle)).toBeInTheDocument();
    });

    it("renders month grid with either 35 or 42 day cells", () => {
      const { container } = render(
        <InterviewsCalendarView
          applications={[mockApp]}
          jobs={[mockJob]}
          onScheduleDate={vi.fn()}
          onEditSchedule={vi.fn()}
          onOpenScorecard={vi.fn()}
        />,
      );

      const dayCells = container.querySelectorAll(
        ".grid.grid-cols-7.divide-x > div",
      );
      expect([35, 42]).toContain(dayCells.length);
    });

    it("applies weekend styles to Saturday and Sunday columns", () => {
      render(
        <InterviewsCalendarView
          applications={[mockApp]}
          jobs={[mockJob]}
          onScheduleDate={vi.fn()}
          onEditSchedule={vi.fn()}
          onOpenScorecard={vi.fn()}
        />,
      );

      const satHeader = screen.getByText("interviews.daysOfWeek.sat");
      const sunHeader = screen.getByText("interviews.daysOfWeek.sun");

      expect(satHeader).toHaveClass("text-rose-500/80");
      expect(sunHeader).toHaveClass("text-rose-500/80");
    });
  });

  // A.2: Events grouping (3 tests)
  describe("A.2: Events grouping", () => {
    it("renders zero event chips when applications list is empty", () => {
      render(
        <InterviewsCalendarView
          applications={[]}
          jobs={[mockJob]}
          onScheduleDate={vi.fn()}
          onEditSchedule={vi.fn()}
          onOpenScorecard={vi.fn()}
        />,
      );

      expect(
        screen.queryByRole("button", {
          name: /Interview with/i,
        }),
      ).not.toBeInTheDocument();
    });

    it("renders single event chip for single interview", () => {
      render(
        <InterviewsCalendarView
          applications={[mockApp]}
          jobs={[mockJob]}
          onScheduleDate={vi.fn()}
          onEditSchedule={vi.fn()}
          onOpenScorecard={vi.fn()}
        />,
      );

      const chips = screen.getAllByRole("button", {
        name: /Interview with Nguyen Van A at 14:00/i,
      });
      expect(chips).toHaveLength(1);
    });

    it("groups multiple interviews on the same day sorted by time", () => {
      const multiApp: Application = {
        ...mockApp,
        interviews: [
          {
            id: "intv-3",
            applicationId: "app-1",
            scheduledAt: new Date(
              year,
              today.getMonth(),
              today.getDate(),
              16,
              0,
              0,
            ).toISOString(),
            interviewer: "Alice",
          },
          {
            id: "intv-1",
            applicationId: "app-1",
            scheduledAt: new Date(
              year,
              today.getMonth(),
              today.getDate(),
              9,
              0,
              0,
            ).toISOString(),
            interviewer: "Bob",
          },
          {
            id: "intv-2",
            applicationId: "app-1",
            scheduledAt: new Date(
              year,
              today.getMonth(),
              today.getDate(),
              11,
              30,
              0,
            ).toISOString(),
            interviewer: "Charlie",
          },
        ],
      };

      render(
        <InterviewsCalendarView
          applications={[multiApp]}
          jobs={[mockJob]}
          onScheduleDate={vi.fn()}
          onEditSchedule={vi.fn()}
          onOpenScorecard={vi.fn()}
        />,
      );

      const chips = screen.getAllByRole("button", {
        name: /Interview with Nguyen Van A at/i,
      });
      expect(chips).toHaveLength(3);
      expect(chips[0]).toHaveTextContent("09:00");
      expect(chips[1]).toHaveTextContent("11:30");
      expect(chips[2]).toHaveTextContent("16:00");
    });
  });

  // A.3: View switching (2 tests)
  describe("A.3: View switching", () => {
    it("renders month view with 7-column grid by default", () => {
      render(
        <InterviewsCalendarView
          applications={[mockApp]}
          jobs={[mockJob]}
          onScheduleDate={vi.fn()}
          onEditSchedule={vi.fn()}
          onOpenScorecard={vi.fn()}
        />,
      );

      expect(screen.getByText("interviews.daysOfWeek.mon")).toBeInTheDocument();
      expect(screen.getByText("interviews.daysOfWeek.sun")).toBeInTheDocument();
    });

    it("switches to week view rendering 7-day card columns", () => {
      render(
        <InterviewsCalendarView
          applications={[mockApp]}
          jobs={[mockJob]}
          onScheduleDate={vi.fn()}
          onEditSchedule={vi.fn()}
          onOpenScorecard={vi.fn()}
        />,
      );

      const weekBtn = screen.getByRole("button", { name: "interviews.week" });
      fireEvent.click(weekBtn);

      expect(screen.getByText(/interviews\.week:/i)).toBeInTheDocument();
    });
  });

  // A.4: Event interactions (3 tests)
  describe("A.4: Event interactions", () => {
    it("opens interview detail modal when clicking event chip", () => {
      render(
        <InterviewsCalendarView
          applications={[mockApp]}
          jobs={[mockJob]}
          onScheduleDate={vi.fn()}
          onEditSchedule={vi.fn()}
          onOpenScorecard={vi.fn()}
        />,
      );

      const eventChip = screen.getByRole("button", {
        name: "Interview with Nguyen Van A at 14:00",
      });
      fireEvent.click(eventChip);

      expect(
        screen.getByRole("heading", { name: "Nguyen Van A", level: 2 }),
      ).toBeInTheDocument();
      expect(screen.getByText("Senior Backend Developer")).toBeInTheDocument();
    });

    it("opens day details modal when clicking +N more indicator", () => {
      const busyApp: Application = {
        ...mockApp,
        interviews: [
          {
            id: "i1",
            applicationId: "app-1",
            scheduledAt: new Date(
              year,
              today.getMonth(),
              today.getDate(),
              9,
              0,
              0,
            ).toISOString(),
          },
          {
            id: "i2",
            applicationId: "app-1",
            scheduledAt: new Date(
              year,
              today.getMonth(),
              today.getDate(),
              10,
              0,
              0,
            ).toISOString(),
          },
          {
            id: "i3",
            applicationId: "app-1",
            scheduledAt: new Date(
              year,
              today.getMonth(),
              today.getDate(),
              11,
              0,
              0,
            ).toISOString(),
          },
          {
            id: "i4",
            applicationId: "app-1",
            scheduledAt: new Date(
              year,
              today.getMonth(),
              today.getDate(),
              13,
              0,
              0,
            ).toISOString(),
          },
          {
            id: "i5",
            applicationId: "app-1",
            scheduledAt: new Date(
              year,
              today.getMonth(),
              today.getDate(),
              15,
              0,
              0,
            ).toISOString(),
          },
        ],
      };

      render(
        <InterviewsCalendarView
          applications={[busyApp]}
          jobs={[mockJob]}
          onScheduleDate={vi.fn()}
          onEditSchedule={vi.fn()}
          onOpenScorecard={vi.fn()}
        />,
      );

      const moreBtn = screen.getByRole("button", { name: "+1" });
      expect(moreBtn).toBeInTheDocument();
      fireEvent.click(moreBtn);

      expect(
        screen.getByText("interviews.candidateInterviewsMultiple"),
      ).toBeInTheDocument();
    });

    it("updates week dates when navigating next/prev in week view", () => {
      render(
        <InterviewsCalendarView
          applications={[mockApp]}
          jobs={[mockJob]}
          onScheduleDate={vi.fn()}
          onEditSchedule={vi.fn()}
          onOpenScorecard={vi.fn()}
        />,
      );

      const weekBtn = screen.getByRole("button", { name: "interviews.week" });
      fireEvent.click(weekBtn);

      const initialTitle = screen.getByText(/interviews\.week:/i).textContent;

      const nextBtn = screen.getByTitle("interviews.nextPeriod");
      fireEvent.click(nextBtn);

      const newTitle = screen.getByText(/interviews\.week:/i).textContent;
      expect(newTitle).not.toEqual(initialTitle);
    });
  });

  // A.5: Modals (2 tests)
  describe("A.5: Modals", () => {
    it("displays complete interview data in detail modal", () => {
      render(
        <InterviewsCalendarView
          applications={[mockApp]}
          jobs={[mockJob]}
          onScheduleDate={vi.fn()}
          onEditSchedule={vi.fn()}
          onOpenScorecard={vi.fn()}
        />,
      );

      const eventChip = screen.getByRole("button", {
        name: "Interview with Nguyen Van A at 14:00",
      });
      fireEvent.click(eventChip);

      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      expect(screen.getByText("interviews.round 1")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /interviews\.openMeetingShort/i }),
      ).toHaveAttribute("href", "https://meet.google.com/xyz");
    });

    it("closes event modal when clicking close button", () => {
      render(
        <InterviewsCalendarView
          applications={[mockApp]}
          jobs={[mockJob]}
          onScheduleDate={vi.fn()}
          onEditSchedule={vi.fn()}
          onOpenScorecard={vi.fn()}
        />,
      );

      const eventChip = screen.getByRole("button", {
        name: "Interview with Nguyen Van A at 14:00",
      });
      fireEvent.click(eventChip);

      expect(
        screen.getByRole("heading", { name: "Nguyen Van A", level: 2 }),
      ).toBeInTheDocument();

      const closeBtn = screen.getByRole("button", { name: "Close" });
      fireEvent.click(closeBtn);

      expect(
        screen.queryByRole("heading", { name: "Nguyen Van A", level: 2 }),
      ).not.toBeInTheDocument();
    });

    it("invokes onEditSchedule when clicking edit schedule button in detail modal", () => {
      const handleEditSchedule = vi.fn();
      render(
        <InterviewsCalendarView
          applications={[mockApp]}
          jobs={[mockJob]}
          onScheduleDate={vi.fn()}
          onEditSchedule={handleEditSchedule}
          onOpenScorecard={vi.fn()}
        />,
      );

      const eventChip = screen.getByRole("button", {
        name: "Interview with Nguyen Van A at 14:00",
      });
      fireEvent.click(eventChip);

      const editBtn = screen.getByRole("button", {
        name: "interviews.editSchedule",
      });
      fireEvent.click(editBtn);

      expect(handleEditSchedule).toHaveBeenCalledWith(
        mockApp,
        mockApp.interviews![0],
      );
    });

    it("invokes onOpenScorecard when clicking scorecard button in detail modal", () => {
      const handleOpenScorecard = vi.fn();
      render(
        <InterviewsCalendarView
          applications={[mockApp]}
          jobs={[mockJob]}
          onScheduleDate={vi.fn()}
          onEditSchedule={vi.fn()}
          onOpenScorecard={handleOpenScorecard}
        />,
      );

      const eventChip = screen.getByRole("button", {
        name: "Interview with Nguyen Van A at 14:00",
      });
      fireEvent.click(eventChip);

      const scorecardBtn = screen.getByRole("button", {
        name: "interviews.scorecardAction",
      });
      fireEvent.click(scorecardBtn);

      expect(handleOpenScorecard).toHaveBeenCalledWith(
        mockApp,
        mockApp.interviews![0],
      );
    });

    it("invokes onScheduleDate from day details modal when clicking schedule button", () => {
      const handleScheduleDate = vi.fn();
      const busyApp: Application = {
        ...mockApp,
        interviews: [
          {
            id: "i1",
            applicationId: "app-1",
            scheduledAt: new Date(
              year,
              today.getMonth(),
              today.getDate(),
              9,
              0,
              0,
            ).toISOString(),
          },
          {
            id: "i2",
            applicationId: "app-1",
            scheduledAt: new Date(
              year,
              today.getMonth(),
              today.getDate(),
              10,
              0,
              0,
            ).toISOString(),
          },
          {
            id: "i3",
            applicationId: "app-1",
            scheduledAt: new Date(
              year,
              today.getMonth(),
              today.getDate(),
              11,
              0,
              0,
            ).toISOString(),
          },
          {
            id: "i4",
            applicationId: "app-1",
            scheduledAt: new Date(
              year,
              today.getMonth(),
              today.getDate(),
              13,
              0,
              0,
            ).toISOString(),
          },
          {
            id: "i5",
            applicationId: "app-1",
            scheduledAt: new Date(
              year,
              today.getMonth(),
              today.getDate(),
              15,
              0,
              0,
            ).toISOString(),
          },
        ],
      };
      render(
        <InterviewsCalendarView
          applications={[busyApp]}
          jobs={[mockJob]}
          onScheduleDate={handleScheduleDate}
          onEditSchedule={vi.fn()}
          onOpenScorecard={vi.fn()}
        />,
      );

      const moreBtn = screen.getByRole("button", { name: "+1" });
      fireEvent.click(moreBtn);

      const scheduleBtn = screen.getByRole("button", {
        name: "interviews.scheduleNew",
      });
      fireEvent.click(scheduleBtn);

      expect(handleScheduleDate).toHaveBeenCalledWith(todayDateStr);
    });

    it("opens event details modal from week view card and invokes onOpenScorecard", () => {
      const handleOpenScorecard = vi.fn();
      const ratedApp: Application = {
        ...mockApp,
        interviews: [
          {
            ...mockApp.interviews![0],
            scorecard: {
              overallRating: 5,
              recommendation: "STRONG_YES",
            },
          },
        ],
      };

      render(
        <InterviewsCalendarView
          applications={[ratedApp]}
          jobs={[mockJob]}
          onScheduleDate={vi.fn()}
          onEditSchedule={vi.fn()}
          onOpenScorecard={handleOpenScorecard}
        />,
      );

      const weekBtn = screen.getByRole("button", {
        name: "interviews.week",
      });
      fireEvent.click(weekBtn);

      // Week card shows round + score consistently and displays full job title without truncation
      expect(
        screen.queryByText("interviews.joinMeetingShort"),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/5 ⭐/)).not.toBeInTheDocument();
      expect(screen.getByText("interviews.roundShort")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(
        screen.getByText("Senior Backend Developer").className,
      ).not.toContain("truncate");

      const weekCard = screen.getByRole("button", {
        name: "Interview with Nguyen Van A at 14:00",
      });
      fireEvent.click(weekCard);

      const scorecardBtn = screen.getByRole("button", {
        name: "interviews.viewEvaluation",
      });
      fireEvent.click(scorecardBtn);

      expect(handleOpenScorecard).toHaveBeenCalledWith(
        ratedApp,
        ratedApp.interviews![0],
      );
    });

    it("omits initials badge in EventDetailsModal header and provides application link and cancel callback", () => {
      const handleCancel = vi.fn();
      render(
        <InterviewsCalendarView
          applications={[mockApp]}
          jobs={[mockJob]}
          onScheduleDate={vi.fn()}
          onEditSchedule={vi.fn()}
          onOpenScorecard={vi.fn()}
          onCancelInterview={handleCancel}
        />,
      );

      fireEvent.click(
        screen.getByRole("button", {
          name: "Interview with Nguyen Van A at 14:00",
        }),
      );

      expect(screen.queryByText("NA")).not.toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "applications.viewApplication" }),
      ).toHaveAttribute("href", "/applications/app-1");

      const cancelBtn = screen.getByRole("button", {
        name: "interviews.cancelThisSchedule",
      });
      fireEvent.click(cancelBtn);
      expect(handleCancel).toHaveBeenCalledWith(
        mockApp,
        mockApp.interviews![0],
      );
    });

    it("displays round, interviewer, and full address/URL in DayDetailsModal (+N)", () => {
      const longAddress =
        "Tang 12, Toa nha Bitexco Financial Tower, So 2 Hai Trieu, Phuong Ben Nghe, Quan 1, TP Ho Chi Minh";
      const busyApp: Application = {
        ...mockApp,
        interviews: [
          {
            id: "i1",
            applicationId: "app-1",
            round: 1,
            type: "HR_SCREENING",
            format: "OFFICE",
            linkOrLocation: longAddress,
            interviewer: "Tran Thi Minh",
            scheduledAt: new Date(
              year,
              today.getMonth(),
              today.getDate(),
              9,
              0,
              0,
            ).toISOString(),
          },
          {
            id: "i2",
            applicationId: "app-1",
            scheduledAt: new Date(
              year,
              today.getMonth(),
              today.getDate(),
              10,
              0,
              0,
            ).toISOString(),
          },
          {
            id: "i3",
            applicationId: "app-1",
            scheduledAt: new Date(
              year,
              today.getMonth(),
              today.getDate(),
              11,
              0,
              0,
            ).toISOString(),
          },
          {
            id: "i4",
            applicationId: "app-1",
            scheduledAt: new Date(
              year,
              today.getMonth(),
              today.getDate(),
              13,
              0,
              0,
            ).toISOString(),
          },
          {
            id: "i5",
            applicationId: "app-1",
            round: 2,
            type: "TECHNICAL",
            format: "MEET",
            linkOrLocation: "https://meet.google.com/long-room-abc",
            interviewer: "Le Van Cuong",
            scheduledAt: new Date(
              year,
              today.getMonth(),
              today.getDate(),
              15,
              0,
              0,
            ).toISOString(),
          },
        ],
      };

      render(
        <InterviewsCalendarView
          applications={[busyApp]}
          jobs={[mockJob]}
          onScheduleDate={vi.fn()}
          onEditSchedule={vi.fn()}
          onOpenScorecard={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "+1" }));

      expect(screen.getByText("Tran Thi Minh")).toBeInTheDocument();
      expect(screen.getByText("Le Van Cuong")).toBeInTheDocument();
      expect(screen.getByText(longAddress)).toBeInTheDocument();
      expect(
        screen.getByRole("link", {
          name: "https://meet.google.com/long-room-abc",
        }),
      ).toHaveAttribute("href", "https://meet.google.com/long-room-abc");
    });

    it("emits onCalendarStateChange when changing month/year or switching between month and week tabs", () => {
      const handleStateChange = vi.fn();
      render(
        <InterviewsCalendarView
          applications={[mockApp]}
          jobs={[mockJob]}
          calendarMode="month"
          activeMonth="2026-10"
          onCalendarStateChange={handleStateChange}
          onScheduleDate={vi.fn()}
          onEditSchedule={vi.fn()}
          onOpenScorecard={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByTitle("interviews.nextPeriod"));
      expect(handleStateChange).toHaveBeenCalledWith({
        calendarMode: "month",
        month: "2026-11",
        date: null,
      });

      fireEvent.click(screen.getByRole("button", { name: "interviews.week" }));
      expect(handleStateChange).toHaveBeenCalledWith({
        calendarMode: "week",
        month: null,
        date: "2026-09-28",
      });

      fireEvent.click(
        screen.getByRole("button", { name: "interviews.selectMonth" }),
      );
      fireEvent.click(screen.getByRole("option", { name: "December" }));
      expect(handleStateChange).toHaveBeenCalledWith({
        calendarMode: "month",
        month: "2026-12",
        date: null,
      });
    });
  });
});
