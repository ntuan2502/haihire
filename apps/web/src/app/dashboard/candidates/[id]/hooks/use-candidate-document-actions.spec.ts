import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCandidateDocumentActions } from "./use-candidate-document-actions";
import { downloadAuthenticatedFile } from "@/lib/api";
import { toast } from "sonner";
import type { Candidate } from "@/types";

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

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/hooks/use-queries", () => ({
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
}));

describe("useCandidateDocumentActions (Caller #2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCandidate: Candidate = {
    id: "cand-2",
    organizationId: "org-1",
    name: "Tran Van B",
    email: "b@haihire.vn",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("Caller #2: downloadAuthenticatedFile throw 401 -> assert toast.error được gọi", async () => {
    vi.mocked(downloadAuthenticatedFile).mockRejectedValueOnce({
      response: { status: 401, data: { message: "Unauthorized" } },
    });

    const { result } = renderHook(() =>
      useCandidateDocumentActions({
        candidate: mockCandidate,
        documentFilter: "All",
      }),
    );

    await act(async () => {
      await result.current.handleDownloadDoc(
        "https://minio.local/cv.pdf",
        "CV.pdf",
        "app-2",
      );
    });

    expect(downloadAuthenticatedFile).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalled();
  });
});
