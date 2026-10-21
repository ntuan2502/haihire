import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import JobPipelinePage from "./page";
import { downloadAuthenticatedFile } from "@/lib/api";
import { toast } from "sonner";

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
  useParams: () => ({ id: "job-1" }),
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-1", organizationId: "org-1" },
  }),
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "vi",
  }),
}));

const mockJob = {
  id: "job-1",
  title: "Frontend Engineer",
  status: "PUBLISHED",
  department: "Engineering",
};

const mockApplications = [
  {
    id: "app-1",
    jobId: "job-1",
    candidateId: "cand-1",
    candidateName: "Nguyen Van Pipeline",
    candidateEmail: "pipeline@haihire.vn",
    stage: "APPLIED",
    orderIndex: 0,
    resumeUrl: "https://minio.local/cv.pdf",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockUseJobApplications = vi
  .fn()
  .mockReturnValue({ data: mockApplications, isLoading: false });

vi.mock("@/hooks/use-queries", () => ({
  useJob: () => ({ data: mockJob, isLoading: false }),
  useJobApplications: () => mockUseJobApplications(),
  useUpdateCandidateMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUpdateStageMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteApplicationMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useOrgMembers: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/components/interviews/schedule-interview-modal", () => ({
  ScheduleInterviewModal: () => null,
}));

vi.mock("@/components/applications/document-preview-modal", () => ({
  DocumentPreviewModal: ({
    onDownload,
    appId,
  }: {
    onDownload: (url: string, filename?: string, appId?: string) => void;
    appId?: string;
  }) => (
    <div>
      <button
        data-testid="mock-preview-download-btn"
        onClick={() =>
          onDownload("https://minio.local/cv.pdf", "test.pdf", appId)
        }
      >
        Download Preview
      </button>
      <button
        data-testid="mock-preview-download-no-app-btn"
        onClick={() =>
          onDownload("https://minio.local/cv.pdf", "test.pdf", undefined)
        }
      >
        Download No App
      </button>
    </div>
  ),
}));

describe("JobPipelinePage - handleDownloadDoc (Caller #4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Caller #4: downloadAuthenticatedFile throw 401 -> assert toast.error được gọi", async () => {
    vi.mocked(downloadAuthenticatedFile).mockRejectedValueOnce({
      response: { status: 401, data: { message: "Unauthorized" } },
    });

    render(<JobPipelinePage />);

    const downloadBtn = screen.getByTestId("mock-preview-download-btn");
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(downloadAuthenticatedFile).toHaveBeenCalledTimes(1);
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("Caller #4: without activeAppId -> assert toast.error called with cannotDownloadDocument", async () => {
    vi.mocked(downloadAuthenticatedFile).mockClear();
    vi.mocked(toast.error).mockClear();

    mockUseJobApplications.mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<JobPipelinePage />);

    const noAppBtn = screen.getByTestId("mock-preview-download-no-app-btn");
    fireEvent.click(noAppBtn);

    await waitFor(() => {
      expect(downloadAuthenticatedFile).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith("errors.cannotDownloadDocument");
    });
  });
});
