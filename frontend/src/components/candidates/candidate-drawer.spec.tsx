import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CandidateDrawer } from "./candidate-drawer";
import type { CandidateItem } from "@/lib/utils";
import type { Application, Job } from "@/types";

const mockDeleteInterviewMutateAsync = vi.fn().mockResolvedValue({});
const mockUploadDocMutateAsync = vi.fn().mockResolvedValue({});
const mockDeleteCandidateDocMutateAsync = vi.fn().mockResolvedValue({});
const mockDeleteAppDocMutateAsync = vi.fn().mockResolvedValue({});
const mockDownloadAuthenticatedFile = vi.fn().mockResolvedValue({});
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/lib/api", () => ({
  getDocumentUrl: (url: string) => url,
  downloadAuthenticatedFile: (...args: unknown[]) =>
    mockDownloadAuthenticatedFile(...args),
}));

vi.mock("@/hooks/use-queries", () => ({
  useCandidate: () => ({
    data: null,
    isLoading: false,
  }),
  useUploadCandidateDocumentMutation: () => ({
    mutateAsync: mockUploadDocMutateAsync,
    isPending: false,
  }),
  useDeleteCandidateDocumentMutation: () => ({
    mutateAsync: mockDeleteCandidateDocMutateAsync,
    isPending: false,
  }),
  useDeleteDocumentMutation: () => ({
    mutateAsync: mockDeleteAppDocMutateAsync,
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
        "candidates.noApplicationsYet": "Chưa có hồ sơ nào",
        "candidates.noApplicationsMatchingStage":
          "Không có hồ sơ trong giai đoạn này",
        "candidates.applyCandidateHint": "Gán ứng viên vào công việc",
        "candidates.trySelectingDifferentStage": "Thử chọn giai đoạn khác",
        "candidates.addProperty": "Thêm thuộc tính",
        "candidates.resume": "CV",
        "candidates.coverLetter": "Thư xin việc",
        "candidates.uploadDocHint": "Kéo thả hoặc nhấn để tải lên",
        "candidates.firstName": "Tên",
        "candidates.lastName": "Họ",
        "candidates.displayName": "Tên hiển thị",
        "candidates.email": "Email",
        "candidates.phone": "Số điện thoại",
        "candidates.gender": "Giới tính",
        "candidates.dateOfBirth": "Ngày sinh",
        "candidates.notes": "Ghi chú",
        "interviews.scheduleInterview": "Lên lịch phỏng vấn",
        "applications.appliedBadge": "Đã ứng tuyển",
        "applications.viewApplication": "Xem hồ sơ",
        "common.overview": "Tổng quan",
        "common.details": "Chi tiết",
        "common.properties": "Thuộc tính",
        "common.edit": "Chỉnh sửa",
        "common.preview": "Xem trước",
        "common.download": "Tải xuống",
        "common.delete": "Xóa",
        "common.all": "Tất cả",
        "common.created": "Ngày tạo",
        "common.updated": "Cập nhật",
        "common.status": "Trạng thái",
        "common.other": "Khác",
        "common.deleteConfirmWord": "XÓA",
        "common.cancelConfirmWord": "HỦY",
        "interviews.cancelThisSchedule": "Hủy lịch này",
        "common.cancel": "Hủy",
        "common.confirm": "Xác nhận",
        "pipeline.stages.applied": "Ứng tuyển",
        "pipeline.stages.screening": "Sơ loại",
        "pipeline.stages.interview": "Phỏng vấn",
        "pipeline.stages.offer": "Đề nghị",
        "pipeline.stages.hired": "Đã tuyển",
        "pipeline.stages.rejected": "Từ chối",
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
      resumeUrl: "https://minio.local/cv.pdf",
      resumeFileName: "Pham_Thi_Ung_Vien_CV.pdf",
      resumeFileSize: 102400,
      resumeMimeType: "application/pdf",
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
          interviews: [
            {
              id: "intv-1",
              applicationId: "app-1",
              title: "Technical Interview",
              stage: "INTERVIEW",
              status: "SCHEDULED",
              startTime: new Date().toISOString(),
              endTime: new Date().toISOString(),
            },
          ],
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
      />,
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
      />,
    );

    expect(screen.getByText("Chi tiết ứng viên")).toBeInTheDocument();
    expect(
      screen.getAllByText("Pham Thi Ung Vien").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("pham@haihire.vn").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("0912345678").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Chi tiết")).toBeInTheDocument();
  });

  it("navigates to candidate edit page when edit button is clicked", () => {
    render(
      <CandidateDrawer
        candidate={mockCandidate}
        onClose={vi.fn()}
        jobs={mockJobs}
        canEdit={true}
        onApplyToJob={vi.fn()}
        onScheduleInterview={vi.fn()}
      />,
    );

    const editBtn = screen.getByTitle("Chỉnh sửa");
    fireEvent.click(editBtn);
    expect(mockPush).toHaveBeenCalledWith("/dashboard/candidates/cand-1/edit");
  });

  it("navigates to candidate full page when open full page button is clicked", () => {
    render(
      <CandidateDrawer
        candidate={mockCandidate}
        onClose={vi.fn()}
        jobs={mockJobs}
        canEdit={true}
        onApplyToJob={vi.fn()}
        onScheduleInterview={vi.fn()}
      />,
    );

    const fullPageBtn = screen.getByTitle("Xem toàn màn hình");
    fireEvent.click(fullPageBtn);
    expect(mockPush).toHaveBeenCalledWith("/dashboard/candidates/cand-1");
  });

  it("calls onClose when close button is clicked", () => {
    const handleClose = vi.fn();
    render(
      <CandidateDrawer
        candidate={mockCandidate}
        onClose={handleClose}
        jobs={mockJobs}
        canEdit={true}
        onApplyToJob={vi.fn()}
        onScheduleInterview={vi.fn()}
      />,
    );

    const closeBtn = screen.getByRole("button", { name: "" });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
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
      />,
    );

    // Initial tab is applications
    expect(screen.getByText("Product Designer")).toBeInTheDocument();

    // Switch to Documents tab
    const docsTabBtn = screen.getByText(/Tài liệu/);
    fireEvent.click(docsTabBtn);
    expect(screen.getByText("Tải tài liệu lên")).toBeInTheDocument();
    expect(screen.getByText("Pham_Thi_Ung_Vien_CV.pdf")).toBeInTheDocument();

    // Switch back to Applications tab
    const appsTabBtn = screen.getByText(/Hồ sơ ứng tuyển/);
    fireEvent.click(appsTabBtn);
    expect(screen.getByText("Product Designer")).toBeInTheDocument();
  });

  it("filters applications by stage using the stage filter dropdown", () => {
    render(
      <CandidateDrawer
        candidate={mockCandidate}
        onClose={vi.fn()}
        jobs={mockJobs}
        canEdit={true}
        onApplyToJob={vi.fn()}
        onScheduleInterview={vi.fn()}
      />,
    );

    expect(screen.getByText("Product Designer")).toBeInTheDocument();

    // Click stage filter dropdown and select REJECTED
    const trigger = screen.getByText("Tất cả giai đoạn");
    fireEvent.click(trigger);

    const rejectedOption = screen.getByText("Từ chối");
    fireEvent.click(rejectedOption);

    // Filtered out: empty state shown
    expect(
      screen.getByText("Không có hồ sơ trong giai đoạn này"),
    ).toBeInTheDocument();
  });

  it("calls onApplyToJob when Apply to Job CTA is clicked", () => {
    const handleApply = vi.fn();
    render(
      <CandidateDrawer
        candidate={mockCandidate}
        onClose={vi.fn()}
        jobs={mockJobs}
        canEdit={true}
        onApplyToJob={handleApply}
        onScheduleInterview={vi.fn()}
      />,
    );

    const applyBtn = screen.getByText("Gán vào tin tuyển dụng");
    fireEvent.click(applyBtn);

    expect(handleApply).toHaveBeenCalledTimes(1);
    expect(handleApply).toHaveBeenCalledWith(mockCandidate);
  });

  it("calls onScheduleInterview when schedule button is clicked on application", () => {
    const handleSchedule = vi.fn();
    const candWithoutInterviews = {
      ...mockCandidate,
      candidate: {
        ...mockCandidate.candidate!,
        applications: [
          {
            ...mockCandidate.candidate!.applications[0],
            interviews: [],
          } as Application,
        ],
      },
    };

    render(
      <CandidateDrawer
        candidate={candWithoutInterviews}
        onClose={vi.fn()}
        jobs={mockJobs}
        canEdit={true}
        onApplyToJob={vi.fn()}
        onScheduleInterview={handleSchedule}
      />,
    );

    const scheduleBtn = screen
      .getByText("Lên lịch phỏng vấn")
      .closest("button");
    if (scheduleBtn) {
      fireEvent.click(scheduleBtn);
    }

    expect(handleSchedule).toHaveBeenCalledTimes(1);
  });

  it("cancels an interview when cancel action is triggered", async () => {
    render(
      <CandidateDrawer
        candidate={mockCandidate}
        onClose={vi.fn()}
        jobs={mockJobs}
        canEdit={true}
        onApplyToJob={vi.fn()}
        onScheduleInterview={vi.fn()}
      />,
    );

    const cancelBtn = screen.getByText("Hủy lịch này");
    fireEvent.click(cancelBtn);

    const confirmInput = screen.getByRole("textbox");
    fireEvent.change(confirmInput, { target: { value: "HỦY" } });
    fireEvent.submit(confirmInput.closest("form")!);

    await waitFor(() => {
      expect(mockDeleteInterviewMutateAsync).toHaveBeenCalledWith("intv-1");
    });
  });

  it("renders candidate documents and allows filtering by document type", () => {
    render(
      <CandidateDrawer
        candidate={mockCandidate}
        onClose={vi.fn()}
        jobs={mockJobs}
        canEdit={true}
        onApplyToJob={vi.fn()}
        onScheduleInterview={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText(/Tài liệu/));

    expect(screen.getByText("Pham_Thi_Ung_Vien_CV.pdf")).toBeInTheDocument();

    // Filter by Cover Letter (should be empty)
    const filterTrigger = screen.getByText("Tất cả");
    fireEvent.click(filterTrigger);

    const coverLetterOption = screen.getByText("Thư xin việc");
    fireEvent.click(coverLetterOption);

    expect(screen.getByText("Chưa có tài liệu nào")).toBeInTheDocument();
  });

  it("previews a document and returns back to the document list", () => {
    render(
      <CandidateDrawer
        candidate={mockCandidate}
        onClose={vi.fn()}
        jobs={mockJobs}
        canEdit={true}
        onApplyToJob={vi.fn()}
        onScheduleInterview={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText(/Tài liệu/));
    fireEvent.click(screen.getByText("Nhấn để xem"));

    // In preview mode
    expect(screen.getByText("Quay lại danh sách")).toBeInTheDocument();
    expect(screen.getByTitle("Pham_Thi_Ung_Vien_CV.pdf")).toBeInTheDocument();

    // Click back to document list
    fireEvent.click(screen.getByText("Quay lại danh sách"));
    expect(screen.getByText("Tải tài liệu lên")).toBeInTheDocument();
  });

  it("triggers authenticated document download", async () => {
    render(
      <CandidateDrawer
        candidate={mockCandidate}
        onClose={vi.fn()}
        jobs={mockJobs}
        canEdit={true}
        onApplyToJob={vi.fn()}
        onScheduleInterview={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText(/Tài liệu/));
    const downloadBtn = screen.getByTitle("Tải xuống");
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(mockDownloadAuthenticatedFile).toHaveBeenCalledWith(
        "https://minio.local/cv.pdf",
        "Pham_Thi_Ung_Vien_CV.pdf",
      );
    });
  });

  it("triggers file upload when file input changes", async () => {
    const { container } = render(
      <CandidateDrawer
        candidate={mockCandidate}
        onClose={vi.fn()}
        jobs={mockJobs}
        canEdit={true}
        onApplyToJob={vi.fn()}
        onScheduleInterview={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText(/Tài liệu/));

    const fileInput = container.querySelector(
      "#drawer-doc-upload",
    ) as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    const file = new File(["dummy cv content"], "New_CV.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUploadDocMutateAsync).toHaveBeenCalledWith({
        id: "cand-1",
        file,
        type: "All",
      });
    });
  });

  it("opens delete document modal and confirms document deletion", async () => {
    render(
      <CandidateDrawer
        candidate={mockCandidate}
        onClose={vi.fn()}
        jobs={mockJobs}
        canEdit={true}
        onApplyToJob={vi.fn()}
        onScheduleInterview={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText(/Tài liệu/));

    const deleteBtn = screen.getByTitle("Xóa");
    fireEvent.click(deleteBtn);

    // Modal opens, fill confirm text and submit form
    const confirmInput = screen.getByRole("textbox");
    fireEvent.change(confirmInput, { target: { value: "XÓA" } });
    fireEvent.submit(confirmInput.closest("form")!);

    await waitFor(() => {
      expect(mockDeleteCandidateDocMutateAsync).toHaveBeenCalledWith({
        id: "cand-1",
        documentId: "resume-cand-1",
        url: "https://minio.local/cv.pdf",
      });
    });
  });
});
