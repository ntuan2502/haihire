import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePipelineKanban } from "./use-pipeline-kanban";
import type { Application, Job } from "@/types";

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => new URLSearchParams(""),
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    canEdit: true,
  }),
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (k: string) => k,
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

const mockJob: Job = {
  id: "job-1",
  title: "Principal Engineer",
  department: "Engineering",
  location: "Remote",
  description: "Lead architecture",
  status: "PUBLISHED",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockApplications: Application[] = [
  {
    id: "app-1",
    jobId: "job-1",
    candidateId: "cand-1",
    candidateName: "Alice Walker",
    candidateEmail: "alice@example.com",
    stage: "APPLIED",
    orderIndex: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "app-2",
    jobId: "job-1",
    candidateId: "cand-2",
    candidateName: "Bob Smith",
    candidateEmail: "bob@example.com",
    stage: "SCREENING",
    orderIndex: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

vi.mock("@/hooks/use-queries", () => ({
  useJob: () => ({ data: mockJob, isLoading: false }),
  useJobApplications: () => ({ data: mockApplications, isLoading: false }),
  useUpdateCandidateMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateStageMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteApplicationMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe("usePipelineKanban", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with default state and calculates stageCounts correctly", () => {
    const { result } = renderHook(() => usePipelineKanban("job-1"));

    expect(result.current.selectedStage).toBe("APPLIED");
    expect(result.current.isListCollapsed).toBe(false);
    expect(result.current.isFullscreen).toBe(false);
    expect(result.current.stageCounts.APPLIED).toBe(1);
    expect(result.current.stageCounts.SCREENING).toBe(1);
    expect(result.current.stageCounts.INTERVIEW).toBe(0);
    expect(result.current.filteredCandidates.length).toBe(1);
    expect(result.current.filteredCandidates[0]?.candidateName).toBe("Alice Walker");
  });

  it("updates stage and navigates when handleSelectStage is called", () => {
    const { result } = renderHook(() => usePipelineKanban("job-1"));

    act(() => {
      result.current.handleSelectStage("SCREENING");
    });

    expect(result.current.selectedStage).toBe("SCREENING");
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("stage=SCREENING"),
      { scroll: false },
    );
  });

  it("toggles overview section visibility", () => {
    const { result } = renderHook(() => usePipelineKanban("job-1"));

    const initialShowNotes = result.current.overviewSections.notes;
    act(() => {
      result.current.handleToggleOverviewSection("notes");
    });

    expect(result.current.overviewSections.notes).toBe(!initialShowNotes);
  });
});
