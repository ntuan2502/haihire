import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { InterviewsTableView } from "./interviews-table-view";
import type { Application, Job } from "@/types";

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (params?.round !== undefined) return `${key}:${params.round}`;
      if (params?.count !== undefined) return `${key}:${params.count}`;
      return key;
    },
  }),
}));

vi.mock("@/components/providers/localization-provider", () => ({
  useLocalization: () => ({
    localization: { timezone: "Asia/Ho_Chi_Minh" },
    isConfigured: true,
  }),
}));

const sharedAppId = "8dc7c330-e108-4cc4-a878-1d3df35dc381";

const mockJobs: Job[] = [
  {
    id: "job-1",
    organizationId: "org-1",
    title: "Frontend Engineer",
    department: "Engineering",
    location: "Hanoi",
    type: "FULL_TIME",
    status: "PUBLISHED",
    description: "Frontend role",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

const mockApplications: Application[] = [
  {
    id: sharedAppId,
    jobId: "job-1",
    candidateName: "Alice Nguyen",
    candidateEmail: "alice@example.com",
    stage: "INTERVIEW",
    orderIndex: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    interviews: [
      {
        id: "intv-1",
        applicationId: sharedAppId,
        scheduledAt: "2026-11-20T03:00:00.000Z",
        type: "HR_SCREENING",
        format: "MEET",
        linkOrLocation: "https://meet.google.com/abc",
        interviewer: "Recruiter A",
        round: 1,
      },
    ],
  },
  {
    id: sharedAppId,
    jobId: "job-1",
    candidateName: "Alice Nguyen",
    candidateEmail: "alice@example.com",
    stage: "INTERVIEW",
    orderIndex: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    interviews: [
      {
        id: "intv-2",
        applicationId: sharedAppId,
        scheduledAt: "2026-11-22T03:00:00.000Z",
        type: "TECHNICAL",
        format: "MEET",
        linkOrLocation: "https://meet.google.com/def",
        interviewer: "Lead B",
        round: 2,
      },
    ],
  },
];

describe("InterviewsTableView", () => {
  it("renders unique row keys without React warnings when one application has multiple interview rounds", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      render(
        <InterviewsTableView
          applications={mockApplications}
          jobs={mockJobs}
          onOpenScheduleModal={vi.fn()}
          onOpenScorecard={vi.fn()}
          onNavigateToPipeline={vi.fn()}
        />,
      );

      expect(errorSpy).not.toHaveBeenCalled();
      expect(screen.getAllByText("Alice Nguyen")).toHaveLength(2);
      expect(screen.getByText("interviews.roundBadge:1")).toBeInTheDocument();
      expect(screen.getByText("interviews.roundBadge:2")).toBeInTheDocument();
    } finally {
      errorSpy.mockRestore();
    }
  });
});
