import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ApplicationStage } from "@haihire/shared";
import { PipelineStageSelector } from "./pipeline-stage-selector";
import { canTransition, getTransitionDisabledReason, PIPELINE_STAGES } from "@/lib/stages";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (key === "pipeline.tooltips.invalidTransition") {
        return `Không thể chuyển từ ${params?.from} sang ${params?.to}`;
      }
      if (key === "pipeline.tooltips.cannotMoveHired") {
        return `Ứng viên đã HIRED không thể quay lại ${params?.to}`;
      }
      return key;
    },
  }),
}));

describe("Kanban Drag-and-Drop State Machine Alignment (C3 Acceptance Criteria)", () => {
  let mockApiCall: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiCall = vi.fn();
  });

  const renderKanbanPipeline = () => {
    // Controller logic matching handleDropCandidate in page.tsx
    const handleDropCandidate = (
      candidateId: string,
      fromStage: ApplicationStage,
      toStage: ApplicationStage,
    ) => {
      if (fromStage === toStage) return;

      if (!canTransition(fromStage, toStage)) {
        const reason = getTransitionDisabledReason(
          fromStage,
          toStage,
          (key, params) => `Không thể chuyển từ ${params?.from} sang ${params?.to}`,
        );
        toast.error(reason);
        return;
      }

      mockApiCall({ candidateId, toStage });
    };

    return render(
      <PipelineStageSelector
        stages={PIPELINE_STAGES}
        stageCounts={{
          APPLIED: 4,
          SCREENING: 2,
          INTERVIEW: 1,
          OFFER: 0,
          HIRED: 1,
          REJECTED: 0,
        }}
        selectedStage="SCREENING"
        onSelectStage={vi.fn()}
        isFullscreen={false}
        onToggleFullscreen={vi.fn()}
        isListCollapsed={false}
        onToggleCollapse={vi.fn()}
        onDropCandidate={handleDropCandidate}
      />,
    );
  };

  it("Drag APPLIED -> SCREENING: API is called successfully", () => {
    renderKanbanPipeline();

    const screeningPill = screen.getByTestId("stage-pill-SCREENING");
    expect(screeningPill).toBeInTheDocument();

    // Simulate dropping an application from APPLIED stage onto SCREENING stage pill
    const dropEvent = new Event("drop", { bubbles: true, cancelable: true });
    Object.assign(dropEvent, {
      dataTransfer: {
        getData: (format: string) => {
          if (format === "application/json") {
            return JSON.stringify({ id: "cand-app-001", stage: "APPLIED" });
          }
          return null;
        },
      },
    });

    screeningPill.dispatchEvent(dropEvent);

    // API must be called with candidateId and targetStage
    expect(mockApiCall).toHaveBeenCalledTimes(1);
    expect(mockApiCall).toHaveBeenCalledWith({
      candidateId: "cand-app-001",
      toStage: "SCREENING",
    });
    // No error toast shown
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("Drag SCREENING -> APPLIED: API is NOT called, prevention toast/tooltip is shown", () => {
    renderKanbanPipeline();

    const appliedPill = screen.getByTestId("stage-pill-APPLIED");
    expect(appliedPill).toBeInTheDocument();

    // Simulate user attempting illegal backward drag from SCREENING to APPLIED
    const dropEvent = new Event("drop", { bubbles: true, cancelable: true });
    Object.assign(dropEvent, {
      dataTransfer: {
        getData: (format: string) => {
          if (format === "application/json") {
            return JSON.stringify({ id: "cand-app-002", stage: "SCREENING" });
          }
          return null;
        },
      },
    });

    appliedPill.dispatchEvent(dropEvent);

    // API must NOT be called
    expect(mockApiCall).not.toHaveBeenCalled();

    // Error toast/tooltip message must explain why transition was rejected
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(
      "Không thể chuyển từ SCREENING sang APPLIED",
    );
  });

  it("Drag HIRED -> APPLIED: API is NOT called, terminal stage prevention toast is shown", () => {
    renderKanbanPipeline();

    const appliedPill = screen.getByTestId("stage-pill-APPLIED");

    const dropEvent = new Event("drop", { bubbles: true, cancelable: true });
    Object.assign(dropEvent, {
      dataTransfer: {
        getData: (format: string) => {
          if (format === "application/json") {
            return JSON.stringify({ id: "cand-app-003", stage: "HIRED" });
          }
          return null;
        },
      },
    });

    appliedPill.dispatchEvent(dropEvent);

    expect(mockApiCall).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("HIRED"),
    );
  });
});
