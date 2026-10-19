import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InterviewsCalendarView } from "./interviews-calendar-view";
import type { Application, Job } from "@/types";

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    locale: "en",
    t: (key: string, params?: Record<string, string | number>) => {
      if (params) {
        return Object.entries(params).reduce(
          (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
          key,
        );
      }
      return key;
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
        date: todayDateStr,
        time: "14:00",
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
            date: todayDateStr,
            time: "16:00",
            interviewer: "Alice",
          },
          {
            id: "intv-1",
            applicationId: "app-1",
            date: todayDateStr,
            time: "09:00",
            interviewer: "Bob",
          },
          {
            id: "intv-2",
            applicationId: "app-1",
            date: todayDateStr,
            time: "11:30",
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
            date: todayDateStr,
            time: "09:00",
          },
          {
            id: "i2",
            applicationId: "app-1",
            date: todayDateStr,
            time: "10:00",
          },
          {
            id: "i3",
            applicationId: "app-1",
            date: todayDateStr,
            time: "11:00",
          },
          {
            id: "i4",
            applicationId: "app-1",
            date: todayDateStr,
            time: "13:00",
          },
          {
            id: "i5",
            applicationId: "app-1",
            date: todayDateStr,
            time: "15:00",
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
            date: todayDateStr,
            time: "09:00",
          },
          {
            id: "i2",
            applicationId: "app-1",
            date: todayDateStr,
            time: "10:00",
          },
          {
            id: "i3",
            applicationId: "app-1",
            date: todayDateStr,
            time: "11:00",
          },
          {
            id: "i4",
            applicationId: "app-1",
            date: todayDateStr,
            time: "13:00",
          },
          {
            id: "i5",
            applicationId: "app-1",
            date: todayDateStr,
            time: "15:00",
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

    it("invokes onOpenScorecard from week view card", () => {
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

      const weekBtn = screen.getByRole("button", {
        name: "interviews.week",
      });
      fireEvent.click(weekBtn);

      const scorecardBtn = screen.getByRole("button", {
        name: "interviews.scorecardAction",
      });
      fireEvent.click(scorecardBtn);

      expect(handleOpenScorecard).toHaveBeenCalledWith(
        mockApp,
        mockApp.interviews![0],
      );
    });
  });
});
