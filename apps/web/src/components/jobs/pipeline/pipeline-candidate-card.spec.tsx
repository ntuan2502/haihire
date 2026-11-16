import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PipelineCandidateCard } from "./pipeline-candidate-card";
import type { Application } from "@/types";

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const dict: Record<string, string> = {
        "pipeline.viewCandidateLabel": "View candidate {name}, stage {stage}",
      };
      let text = dict[key] || key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replace(`{${k}}`, String(v));
        }
      }
      return text;
    },
  }),
}));

describe("PipelineCandidateCard Component", () => {
  const mockCandidate: Application = {
    id: "app-101",
    candidateId: "cand-1",
    jobId: "job-1",
    candidateName: "Le Van Test",
    candidateEmail: "test@haihire.vn",
    candidatePhone: "0901234567",
    stage: "SCREENING",
    orderIndex: 0,
    resumeUrl: "/resumes/test.pdf",
    resumeFileName: "test.pdf",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    candidate: {
      id: "cand-1",
      name: "Le Van Test",
      email: "test@haihire.vn",
      notes: "Top candidate with strong React skills",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    applicationNotes: [
      {
        id: "note-1",
        organizationId: "org-1",
        applicationId: "app-101",
        authorId: "user-1",
        authorName: "Recruiter",
        authorRole: "RECRUITER",
        content: "Top candidate with strong React skills",
        isEdited: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  };

  it("renders candidate name, email, and notes icon correctly", () => {
    const handleSelect = vi.fn();
    render(
      <PipelineCandidateCard
        candidate={mockCandidate}
        isSelected={false}
        onSelect={handleSelect}
      />,
    );

    expect(screen.getByText("Le Van Test")).toBeInTheDocument();
    expect(screen.getByText("test@haihire.vn")).toBeInTheDocument();
    expect(
      screen.getByText("candidates.columns.quickNotes"),
    ).toBeInTheDocument();
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
      />,
    );

    expect(screen.getByText("92%")).toBeInTheDocument();
  });

  it("applies selected highlight classes when isSelected is true", () => {
    const { container } = render(
      <PipelineCandidateCard
        candidate={mockCandidate}
        isSelected={true}
        onSelect={vi.fn()}
      />,
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
      />,
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
      />,
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

  it("has role='button', tabIndex={0}, and aria-label for accessibility", () => {
    const { container } = render(
      <PipelineCandidateCard
        candidate={mockCandidate}
        isSelected={false}
        onSelect={vi.fn()}
      />,
    );

    const card = container.querySelector("#candidate-card-app-101");
    expect(card).toHaveAttribute("role", "button");
    expect(card).toHaveAttribute("tabindex", "0");
    expect(card).toHaveAttribute(
      "aria-label",
      "View candidate Le Van Test, stage SCREENING",
    );
  });

  it("triggers onSelect callback when Enter or Space key is pressed", () => {
    const handleSelect = vi.fn();
    const { container } = render(
      <PipelineCandidateCard
        candidate={mockCandidate}
        isSelected={false}
        onSelect={handleSelect}
      />,
    );

    const card = container.querySelector("#candidate-card-app-101");
    expect(card).not.toBeNull();

    if (card) {
      fireEvent.keyDown(card, { key: "Enter" });
      expect(handleSelect).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(card, { key: " " });
      expect(handleSelect).toHaveBeenCalledTimes(2);

      fireEvent.keyDown(card, { key: "ArrowDown" });
      expect(handleSelect).toHaveBeenCalledTimes(2);
    }
  });
});
