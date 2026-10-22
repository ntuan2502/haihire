import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCandidateDrawerState } from "./use-candidate-drawer-state";
import { downloadAuthenticatedFile } from "@/lib/api";
import { toast } from "sonner";
import type { CandidateItem } from "@/lib/utils";

vi.mock("@/lib/api", () => ({
  downloadAuthenticatedFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/hooks/use-queries", () => ({
  useCandidate: () => ({ data: null }),
  useUploadCandidateDocumentMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteCandidateDocumentMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteDocumentMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteInterviewMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe("useCandidateDrawerState - handleDownloadDoc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCandidate: CandidateItem = {
    id: "cand-123",
    name: "Nguyen Van A",
    email: "a@haihire.vn",
    phone: "0901234567",
    createdAt: new Date().toISOString(),
  };

  it("1. Download có appId -> URL chứa name=, KHÔNG chứa fileName=", async () => {
    const { result } = renderHook(() =>
      useCandidateDrawerState({ candidate: mockCandidate }),
    );

    await act(async () => {
      await result.current.handleDownloadDoc(
        "https://minio.local/resumes/cv.pdf",
        "Nguyen_Van_A_CV.pdf",
        "app-456",
      );
    });

    expect(downloadAuthenticatedFile).toHaveBeenCalledTimes(1);
    const [downloadPath, cleanName] = vi.mocked(downloadAuthenticatedFile).mock
      .calls[0];

    expect(cleanName).toBe("Nguyen_Van_A_CV.pdf");
    expect(downloadPath).toContain("/applications/app-456/documents/download?");
    expect(downloadPath).toContain("name=Nguyen_Van_A_CV.pdf");
    expect(downloadPath).not.toContain("fileName=");
  });

  it("2. Download không có appId -> URL bắt đầu bằng /candidates/{id}/documents/download", async () => {
    const { result } = renderHook(() =>
      useCandidateDrawerState({ candidate: mockCandidate }),
    );

    await act(async () => {
      await result.current.handleDownloadDoc(
        "https://minio.local/resumes/cv.pdf",
        "Nguyen_Van_A_CV.pdf",
      );
    });

    expect(downloadAuthenticatedFile).toHaveBeenCalledTimes(1);
    const [downloadPath, cleanName] = vi.mocked(downloadAuthenticatedFile).mock
      .calls[0];

    expect(cleanName).toBe("Nguyen_Van_A_CV.pdf");
    expect(downloadPath).toMatch(
      /^\/candidates\/cand-123\/documents\/download\?/,
    );
    expect(downloadPath).toContain("name=Nguyen_Van_A_CV.pdf");
    expect(downloadPath).not.toContain("fileName=");
  });

  it("3. Download không có appId và không có candidate.id -> toast.error", async () => {
    const { result } = renderHook(() =>
      useCandidateDrawerState({ candidate: null }),
    );

    await act(async () => {
      await result.current.handleDownloadDoc(
        "https://minio.local/resumes/cv.pdf",
        "Nguyen_Van_A_CV.pdf",
      );
    });

    expect(downloadAuthenticatedFile).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("errors.cannotDownloadDocument");
  });

  it("4. Caller #1: downloadAuthenticatedFile throw 401 -> assert toast.error được gọi", async () => {
    vi.mocked(downloadAuthenticatedFile).mockRejectedValueOnce({
      response: { status: 401, data: { message: "Unauthorized" } },
    });

    const { result } = renderHook(() =>
      useCandidateDrawerState({ candidate: mockCandidate }),
    );

    await act(async () => {
      await result.current.handleDownloadDoc(
        "https://minio.local/resumes/cv.pdf",
        "Nguyen_Van_A_CV.pdf",
      );
    });

    expect(downloadAuthenticatedFile).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalled();
  });
});
