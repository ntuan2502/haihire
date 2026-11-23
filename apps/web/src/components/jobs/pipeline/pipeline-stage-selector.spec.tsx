import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PipelineStageSelector } from "./pipeline-stage-selector";
import type { StageConfig } from "@/lib/stages";

const mockStages: StageConfig[] = [
  {
    id: "APPLIED",
    label: "Ứng tuyển",
    color: "slate",
    badgeColor: "bg-slate-100 text-slate-700",
    dotColor: "bg-slate-500",
    activePill: "border-slate-500 bg-slate-50 text-slate-900",
    pillBadge: "bg-slate-200 text-slate-800",
  },
  {
    id: "SCREENING",
    label: "Sàng lọc",
    color: "blue",
    badgeColor: "bg-blue-100 text-blue-700",
    dotColor: "bg-blue-500",
    activePill: "border-blue-500 bg-blue-50 text-blue-900",
    pillBadge: "bg-blue-200 text-blue-800",
  },
  {
    id: "INTERVIEW",
    label: "Phỏng vấn",
    color: "purple",
    badgeColor: "bg-purple-100 text-purple-700",
    dotColor: "bg-purple-500",
    activePill: "border-purple-500 bg-purple-50 text-purple-900",
    pillBadge: "bg-purple-200 text-purple-800",
  },
];

describe("PipelineStageSelector Component", () => {
  const defaultCounts = {
    APPLIED: 5,
    SCREENING: 3,
    INTERVIEW: 1,
  };

  it("renders all stage labels and their corresponding counts", () => {
    render(
      <PipelineStageSelector
        stages={mockStages}
        stageCounts={defaultCounts}
        selectedStage="SCREENING"
        onSelectStage={vi.fn()}
      />,
    );

    expect(screen.getByText("Ứng tuyển")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Sàng lọc")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Phỏng vấn")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("calls onSelectStage with selected stage when pill is clicked", () => {
    const handleSelectStage = vi.fn();
    render(
      <PipelineStageSelector
        stages={mockStages}
        stageCounts={defaultCounts}
        selectedStage="APPLIED"
        onSelectStage={handleSelectStage}
      />,
    );

    const interviewPill = screen.getByText("Phỏng vấn").closest("button");
    if (interviewPill) {
      fireEvent.click(interviewPill);
    }

    expect(handleSelectStage).toHaveBeenCalledWith("INTERVIEW");
  });

  it("renders only stage buttons in the toolbar", () => {
    render(
      <PipelineStageSelector
        stages={mockStages}
        stageCounts={defaultCounts}
        selectedStage="SCREENING"
        onSelectStage={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("button")).toHaveLength(mockStages.length);
  });
});
