import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PipelineCandidateCard } from "./pipeline-candidate-card";
import type { Application } from "@/types";

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

describe("PipelineCandidateCard Component", () => {
  const mockCandidate: Application = {
    id: "app-101",
    jobId: "job-1",
    candidateName: "Le Van Test",
    candidateEmail: "test@haihire.vn",
    candidatePhone: "0901234567",
    stage: "SCREENING",
    orderIndex: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: "Top candidate with strong React skills",
  };

  it("renders candidate name, email, and notes icon correctly", () => {
    const handleSelect = vi.fn();
    render(
      <PipelineCandidateCard
        candidate={mockCandidate}
        isSelected={false}
        onSelect={handleSelect}
      />
    );

    expect(screen.getByText("Le Van Test")).toBeInTheDocument();
    expect(screen.getByText("test@haihire.vn")).toBeInTheDocument();
    expect(screen.getByText("candidates.columns.quickNotes")).toBeInTheDocument();
  });

  it("renders match score if available on candidate", () => {
    const candidateWithScore = {
      ...mockCandidate,
      matchScore: 92,
    };

    render(
      <PipelineCandidateCard
        candidate={candidateWithScore}
        isSelected={false}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText("92%")).toBeInTheDocument();
  });

  it("applies selected highlight classes when isSelected is true", () => {
    const { container } = render(
      <PipelineCandidateCard
        candidate={mockCandidate}
        isSelected={true}
        onSelect={vi.fn()}
      />
    );

    const card = container.querySelector("#candidate-card-app-101");
    expect(card).toHaveClass("bg-blue-50/80");
    expect(card).toHaveClass("border-l-4");
  });

  it("triggers onSelect callback when card is clicked", () => {
    const handleSelect = vi.fn();
    const { container } = render(
      <PipelineCandidateCard
        candidate={mockCandidate}
        isSelected={false}
        onSelect={handleSelect}
      />
    );

    const card = container.querySelector("#candidate-card-app-101");
    if (card) {
      fireEvent.click(card);
    }
    expect(handleSelect).toHaveBeenCalledTimes(1);
  });

  it("supports dragging candidate card and sets dataTransfer payload", () => {
    const { container } = render(
      <PipelineCandidateCard
        candidate={mockCandidate}
        isSelected={false}
        onSelect={vi.fn()}
        canDrag={true}
      />
    );

    const card = container.querySelector("#candidate-card-app-101");
    expect(card).toHaveAttribute("draggable", "true");

    const setData = vi.fn();
    const dragEvent = new Event("dragstart", { bubbles: true });
    Object.assign(dragEvent, {
      dataTransfer: {
        setData,
        effectAllowed: "none",
      },
    });

    if (card) {
      card.dispatchEvent(dragEvent);
    }

    expect(setData).toHaveBeenCalledWith(
      "application/json",
      JSON.stringify({ id: "app-101", stage: "SCREENING" }),
    );
  });
});
