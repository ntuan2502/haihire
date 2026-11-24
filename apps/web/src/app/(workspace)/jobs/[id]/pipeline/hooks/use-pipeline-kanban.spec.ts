import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePipelineKanban } from "./use-pipeline-kanban";
import type { Application, Job } from "@/types";

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockSearchParamString = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => new URLSearchParams(mockSearchParamString),
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
  useJobStages: () => ({ data: undefined, isLoading: false }),
  useJobApplications: () => ({ data: mockApplications, isLoading: false }),
  useUpdateCandidateMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUpdateStageMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteApplicationMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteInterviewMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe("usePipelineKanban", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParamString = "";
    window.history.replaceState(null, "", "/jobs/job-1/pipeline");
  });

  it("initializes with default state and calculates stageCounts correctly", () => {
    const { result } = renderHook(() => usePipelineKanban("job-1"));

    expect(result.current.selectedStage).toBe("APPLIED");
    expect(result.current.stageCounts.APPLIED).toBe(1);
    expect(result.current.stageCounts.SCREENING).toBe(1);
    expect(result.current.stageCounts.INTERVIEW).toBe(0);
    expect(result.current.filteredCandidates.length).toBe(1);
    expect(result.current.filteredCandidates[0]?.candidateName).toBe(
      "Alice Walker",
    );
  });

  it("updates stage and syncs shallow URL without router.replace when handleSelectStage is called", () => {
    const replaceStateSpy = vi.spyOn(window.history, "replaceState");
    const { result } = renderHook(() => usePipelineKanban("job-1"));
    replaceStateSpy.mockClear();

    act(() => {
      result.current.handleSelectStage("SCREENING");
    });

    expect(result.current.selectedStage).toBe("SCREENING");
    expect(result.current.selectedAppId).toBe("app-2");
    expect(mockReplace).not.toHaveBeenCalled();
    expect(replaceStateSpy).toHaveBeenCalledTimes(1);
    expect(replaceStateSpy).toHaveBeenLastCalledWith(
      null,
      "",
      "/jobs/job-1/pipeline?stage=SCREENING&applicationId=app-2",
    );
    replaceStateSpy.mockRestore();
  });

  it("does not loop replaceState when selecting an empty stage with zero candidates", () => {
    const replaceStateSpy = vi.spyOn(window.history, "replaceState");
    const { result, rerender } = renderHook(() => usePipelineKanban("job-1"));
    replaceStateSpy.mockClear();

    act(() => {
      result.current.handleSelectStage("INTERVIEW");
    });

    expect(result.current.selectedStage).toBe("INTERVIEW");
    expect(result.current.filteredCandidates).toHaveLength(0);
    expect(result.current.selectedAppId).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(replaceStateSpy).toHaveBeenCalledTimes(1);
    expect(replaceStateSpy).toHaveBeenLastCalledWith(
      null,
      "",
      "/jobs/job-1/pipeline?stage=INTERVIEW",
    );

    // Rerendering repeatedly with identical URL or fresh searchParams must NOT call replaceState again
    replaceStateSpy.mockClear();
    rerender();
    rerender();
    expect(replaceStateSpy).not.toHaveBeenCalled();
    replaceStateSpy.mockRestore();
  });

  it("switches candidateTab to interviews and clears tab param when returning to overview", () => {
    mockSearchParamString = "";
    const replaceStateSpy = vi.spyOn(window.history, "replaceState");
    const { result } = renderHook(() => usePipelineKanban("job-1"));

    expect(result.current.candidateTab).toBe("overview");

    act(() => {
      result.current.setCandidateTab("interviews");
    });
    expect(replaceStateSpy).toHaveBeenLastCalledWith(
      null,
      "",
      expect.stringContaining("tab=interviews"),
    );

    act(() => {
      result.current.setCandidateTab("overview");
    });
    expect(replaceStateSpy).toHaveBeenLastCalledWith(
      null,
      "",
      expect.not.stringContaining("tab="),
    );
    replaceStateSpy.mockRestore();
  });

  it("initializes and syncs search, sortBy, and tab with URL query params", () => {
    mockSearchParamString =
      "stage=INTERVIEW&search=Nguyen&sortBy=score&tab=interviews";
    const replaceStateSpy = vi.spyOn(window.history, "replaceState");

    const { result } = renderHook(() => usePipelineKanban("job-1"));

    expect(result.current.selectedStage).toBe("INTERVIEW");
    expect(result.current.searchQuery).toBe("Nguyen");
    expect(result.current.sortBy).toBe("score");
    expect(result.current.candidateTab).toBe("interviews");

    act(() => {
      result.current.setSearchQuery("Tran");
    });
    expect(replaceStateSpy).toHaveBeenLastCalledWith(
      null,
      "",
      expect.stringContaining("search=Tran"),
    );

    act(() => {
      result.current.setSortBy("name");
    });
    expect(replaceStateSpy).toHaveBeenLastCalledWith(
      null,
      "",
      expect.stringContaining("sortBy=name"),
    );

    act(() => {
      result.current.setCandidateTab("documents");
    });
    expect(replaceStateSpy).toHaveBeenLastCalledWith(
      null,
      "",
      expect.stringContaining("tab=documents"),
    );

    mockSearchParamString = "";
    replaceStateSpy.mockRestore();
  });

  it("does not snap back or flicker when Next.js useSearchParams lags behind stage switches", () => {
    mockSearchParamString = "stage=APPLIED&applicationId=app-1";
    window.history.replaceState(
      null,
      "",
      "/jobs/job-1/pipeline?stage=APPLIED&applicationId=app-1",
    );
    const replaceStateSpy = vi.spyOn(window.history, "replaceState");

    const { result, rerender } = renderHook(() => usePipelineKanban("job-1"));
    expect(result.current.selectedStage).toBe("APPLIED");
    expect(result.current.selectedAppId).toBe("app-1");
    expect(result.current.selectedCandidate?.id).toBe("app-1");
    replaceStateSpy.mockClear();

    // Switch stage while useSearchParams still reflects the previous stage
    act(() => {
      result.current.handleSelectStage("SCREENING");
    });

    expect(result.current.selectedStage).toBe("SCREENING");
    expect(result.current.selectedAppId).toBe("app-2");
    expect(result.current.selectedCandidate?.id).toBe("app-2");
    expect(replaceStateSpy).toHaveBeenCalledTimes(1);

    // Delayed Next.js flush catches up with SCREENING
    replaceStateSpy.mockClear();
    mockSearchParamString = "stage=SCREENING&applicationId=app-2";
    rerender();

    expect(result.current.selectedStage).toBe("SCREENING");
    expect(result.current.selectedAppId).toBe("app-2");
    expect(result.current.selectedCandidate?.id).toBe("app-2");
    expect(replaceStateSpy).not.toHaveBeenCalled();

    // Switch to empty stage while useSearchParams still lags at SCREENING
    act(() => {
      result.current.handleSelectStage("INTERVIEW");
    });

    expect(result.current.selectedStage).toBe("INTERVIEW");
    expect(result.current.selectedAppId).toBeNull();
    expect(result.current.selectedCandidate).toBeNull();

    // Delayed Next.js flush catches up with empty stage
    replaceStateSpy.mockClear();
    mockSearchParamString = "stage=INTERVIEW";
    rerender();

    expect(result.current.selectedStage).toBe("INTERVIEW");
    expect(result.current.selectedAppId).toBeNull();
    expect(result.current.selectedCandidate).toBeNull();
    expect(replaceStateSpy).not.toHaveBeenCalled();

    replaceStateSpy.mockRestore();
  });
});
