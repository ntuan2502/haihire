import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CandidateDrawer } from "./candidate-drawer";
import type { CandidateItem } from "@/lib/utils";
import type { Application, Job } from "@/types";

const mockDeleteInterviewMutateAsync = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/hooks/use-queries", () => ({
  useCandidate: () => ({
    data: null,
    isLoading: false,
  }),
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
    mutateAsync: mockDeleteInterviewMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const dict: Record<string, string> = {
        "candidates.candidateDetail": "Chi tiết ứng viên",
        "candidates.openFullPage": "Xem toàn màn hình",
        "candidates.applicationsTab": "Hồ sơ ứng tuyển",
        "candidates.documentsTab": "Tài liệu",
        "candidates.uploadDoc": "Tải tài liệu lên",
        "candidates.noDocuments": "Chưa có tài liệu nào",
        "candidates.backToDocuments": "Quay lại danh sách",
        "candidates.clickToPreview": "Nhấn để xem",
        "candidates.allStages": "Tất cả giai đoạn",
        "candidates.applyToJob": "Gán vào tin tuyển dụng",
        "interviews.scheduleInterview": "Lên lịch phỏng vấn",
        "common.overview": "Tổng quan",
        "common.edit": "Chỉnh sửa",
        "common.preview": "Xem trước",
        "common.download": "Tải xuống",
        "common.delete": "Xóa",
        "common.all": "Tất cả",
      };
      return dict[key] || key;
    },
  }),
}));

describe("CandidateDrawer Component", () => {
  const mockCandidate: CandidateItem = {
    id: "cand-1",
    name: "Pham Thi Ung Vien",
    email: "pham@haihire.vn",
    phone: "0912345678",
    createdAt: new Date().toISOString(),
    candidate: {
      id: "cand-1",
      name: "Pham Thi Ung Vien",
      email: "pham@haihire.vn",
      phone: "0912345678",
      createdAt: new Date().toISOString(),
      applications: [
        {
          id: "app-1",
          jobId: "job-1",
          candidateId: "cand-1",
          candidateName: "Pham Thi Ung Vien",
          candidateEmail: "pham@haihire.vn",
          candidatePhone: "0912345678",
          stage: "APPLIED",
          orderIndex: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          interviews: [],
        } as Application,
      ],
    },
  };

  const mockJobs: Job[] = [
    {
      id: "job-1",
      title: "Product Designer",
      department: "Product",
      status: "PUBLISHED",
      type: "FULL_TIME",
      workplaceType: "HYBRID",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when candidate is null", () => {
    const { container } = render(
      <CandidateDrawer
        candidate={null}
        onClose={vi.fn()}
        jobs={mockJobs}
        canEdit={true}
        onApplyToJob={vi.fn()}
        onScheduleInterview={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders candidate header, name, email and details when candidate is provided", () => {
    render(
      <CandidateDrawer
        candidate={mockCandidate}
        onClose={vi.fn()}
        jobs={mockJobs}
        canEdit={true}
        onApplyToJob={vi.fn()}
        onScheduleInterview={vi.fn()}
      />
    );

    expect(screen.getByText("Chi tiết ứng viên")).toBeInTheDocument();
    expect(screen.getAllByText("Pham Thi Ung Vien").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("pham@haihire.vn").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("0912345678").length).toBeGreaterThanOrEqual(1);
  });

  it("allows switching between Applications and Documents tabs", () => {
    render(
      <CandidateDrawer
        candidate={mockCandidate}
        onClose={vi.fn()}
        jobs={mockJobs}
        canEdit={true}
        onApplyToJob={vi.fn()}
        onScheduleInterview={vi.fn()}
      />
    );

    // Initial tab is applications
    expect(screen.getByText("Lên lịch phỏng vấn")).toBeInTheDocument();

    // Switch to Documents tab
    const docsTabBtn = screen.getByText(/Tài liệu/);
    fireEvent.click(docsTabBtn);
    expect(screen.getByText("Tải tài liệu lên")).toBeInTheDocument();
  });

  it("calls onScheduleInterview when schedule button is clicked on application", () => {
    const handleSchedule = vi.fn();

    render(
      <CandidateDrawer
        candidate={mockCandidate}
        onClose={vi.fn()}
        jobs={mockJobs}
        canEdit={true}
        onApplyToJob={vi.fn()}
        onScheduleInterview={handleSchedule}
      />
    );

    const scheduleBtn = screen.getByText("Lên lịch phỏng vấn").closest("button");
    if (scheduleBtn) {
      fireEvent.click(scheduleBtn);
    }

    expect(handleSchedule).toHaveBeenCalledTimes(1);
    expect(handleSchedule).toHaveBeenCalledWith(
      mockCandidate.candidate!.applications[0]
    );
  });
});
