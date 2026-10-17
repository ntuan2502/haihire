import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InterviewsCalendarView } from "./interviews-calendar-view";
import type { Application, Job } from "@/types";

vi.mock("@/i18n", () => ({
  useI18n: () => ({
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

describe("InterviewsCalendarView Accessibility", () => {
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
});
