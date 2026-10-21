import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCandidateDrawer } from "./use-candidate-drawer";
import { downloadAuthenticatedFile } from "@/lib/api";
import { toast } from "sonner";
import type { Application } from "@/types";

vi.mock("@/lib/api", () => ({
  downloadAuthenticatedFile: vi.fn(),
  getDocumentUrl: vi.fn((url: string) => url),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/hooks/use-queries", () => ({
  useUpdateStageMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateCandidateMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteInterviewMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe("useCandidateDrawer (Caller #5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockApp: Application = {
    id: "app-5",
    candidateId: "cand-5",
    jobId: "job-5",
    stage: "APPLIED",
    orderIndex: 0,
    candidateName: "Hoang Van E",
    candidateEmail: "e@haihire.vn",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("Caller #5: downloadAuthenticatedFile throw 401 -> assert toast.error được gọi", async () => {
    vi.mocked(downloadAuthenticatedFile).mockRejectedValueOnce({
      response: { status: 401, data: { message: "Unauthorized" } },
    });

    const { result } = renderHook(() =>
      useCandidateDrawer({
        initialApplications: [mockApp],
        selectedApp: mockApp,
        setSelectedApp: vi.fn(),
        jobMap: new Map(),
      }),
    );

    await act(async () => {
      await result.current.handleDownloadDoc(
        "https://minio.local/cv.pdf",
        "CV.pdf",
        "app-5",
      );
    });

    expect(downloadAuthenticatedFile).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalled();
  });

  it("Caller #5: without activeAppId -> assert toast.error called with cannotDownloadDocument", async () => {
    const { result } = renderHook(() =>
      useCandidateDrawer({
        initialApplications: [],
        selectedApp: null,
        setSelectedApp: vi.fn(),
        jobMap: new Map(),
      }),
    );

    await act(async () => {
      await result.current.handleDownloadDoc(
        "https://minio.local/cv.pdf",
        "CV.pdf",
        undefined,
      );
    });

    expect(downloadAuthenticatedFile).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("errors.cannotDownloadDocument");
  });
});
