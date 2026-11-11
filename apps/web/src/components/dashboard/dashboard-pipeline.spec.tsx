import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardPipeline } from "./dashboard-pipeline";
import type { Job } from "@/types";
import type { ApplicationStats } from "@haihire/shared";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/lib/stages", () => ({
  usePipelineStages: () => [
    {
      id: "APPLIED",
      label: "Applied",
      badgeColor: "",
      dotColor: "bg-slate-400",
    },
    {
      id: "SCREENING",
      label: "Screening",
      badgeColor: "",
      dotColor: "bg-blue-500",
    },
    {
      id: "INTERVIEW",
      label: "Interview",
      badgeColor: "",
      dotColor: "bg-amber-500",
    },
    { id: "OFFER", label: "Offer", badgeColor: "", dotColor: "bg-emerald-500" },
    { id: "HIRED", label: "Hired", badgeColor: "", dotColor: "bg-green-600" },
  ],
}));

describe("DashboardPipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders accurate totals > 100 using server SQL statsByJob instead of 100-item truncation", () => {
    const jobs: Job[] = [
      {
        id: "job-1",
        title: "Staff Platform Engineer",
        department: "Engineering",
        location: "Remote",
        description: "Lead platform",
        status: "PUBLISHED",
        createdAt: new Date().toISOString(),
      },
    ];

    const statsByJob: ApplicationStats["byJob"] = {
      "job-1": {
        total: 145,
        byStage: {
          APPLIED: 60,
          SCREENING: 40,
          INTERVIEW: 25,
          OFFER: 12,
          HIRED: 8,
          REJECTED: 0,
        },
      },
    };

    render(<DashboardPipeline pipelineJobs={jobs} statsByJob={statsByJob} />);

    expect(screen.getByText("Staff Platform Engineer")).toBeInTheDocument();
    expect(screen.getByText(/145/)).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
  });
});
