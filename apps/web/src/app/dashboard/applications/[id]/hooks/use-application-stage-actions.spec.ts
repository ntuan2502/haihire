import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useApplicationStageActions } from "./use-application-stage-actions";
import { downloadAuthenticatedFile } from "@/lib/api";
import { toast } from "sonner";
import type { Application } from "@/types";

vi.mock("@/lib/api", () => ({
  downloadAuthenticatedFile: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
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
  useUpdateStageMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteApplicationMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteInterviewMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe("useApplicationStageActions (Caller #3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockApp: Application = {
    id: "app-3",
    candidateId: "cand-3",
    jobId: "job-3",
    stage: "APPLIED",
    orderIndex: 0,
    candidateName: "Le Van C",
    candidateEmail: "c@haihire.vn",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("Caller #3: downloadAuthenticatedFile throw 401 -> assert toast.error được gọi", async () => {
    vi.mocked(downloadAuthenticatedFile).mockRejectedValueOnce({
      response: { status: 401, data: { message: "Unauthorized" } },
    });

    const { result } = renderHook(() =>
      useApplicationStageActions({
        app: mockApp,
        appIdStr: "app-3",
        setIsDeleteModalOpen: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleDownloadDoc(
        "https://minio.local/cv.pdf",
        "CV.pdf",
        "app-3",
      );
    });

    expect(downloadAuthenticatedFile).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalled();
  });

  it("Caller #3: without activeAppId -> assert toast.error called with cannotDownloadDocument", async () => {
    const { result } = renderHook(() =>
      useApplicationStageActions({
        app: null,
        appIdStr: undefined,
        setIsDeleteModalOpen: vi.fn(),
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
