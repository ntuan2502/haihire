import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ScheduleInterviewModal } from "./schedule-interview-modal";
import type { Application, Job } from "@/types";
import type { ScheduledInterviewInfo } from "@/lib/interviews";

const mockCreateMutateAsync = vi.fn();
const mockUpdateMutateAsync = vi.fn();
const mockUpdateStageMutateAsync = vi.fn();

vi.mock("@/hooks/use-queries", () => ({
  useCreateInterviewMutation: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  }),
  useUpdateInterviewMutation: () => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
  }),
  useUpdateStageMutation: () => ({
    mutateAsync: mockUpdateStageMutateAsync,
    isPending: false,
  }),
  useOrgMembers: () => ({
    data: [
      { id: "mem-1", name: "Nguyen Recruiter", email: "recruiter@haihire.vn" },
      { id: "mem-2", name: "Tran Tech Lead", email: "techlead@haihire.vn" },
    ],
    isLoading: false,
  }),
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const dict: Record<string, string> = {
        "interviews.modalTitle": "Lên lịch phỏng vấn",
        "interviews.editScheduleBtn": "Chỉnh sửa lịch phỏng vấn",
        "interviews.modalSubtitle": "Thiết lập thời gian và người tham gia phỏng vấn",
        "interviews.confirmSchedule": "Xác nhận lên lịch",
        "interviews.updateSchedule": "Cập nhật lịch phỏng vấn",
        "interviews.errors.selectDate": "Vui lòng chọn ngày phỏng vấn.",
        "interviews.errors.selectTime": "Vui lòng chọn giờ phỏng vấn.",
        "interviews.errors.selectType": "Vui lòng chọn hình thức phỏng vấn.",
        "interviews.errors.selectFormat": "Vui lòng chọn phương thức phỏng vấn.",
        "interviews.errors.enterInterviewer": "Vui lòng nhập tên người phỏng vấn.",
        "interviews.errors.candidateNotFound": "Không tìm thấy ứng viên.",
        "interviews.errors.saveFailed": "Lưu lịch phỏng vấn thất bại.",
      };
      return dict[key] || key;
    },
  }),
}));

describe("ScheduleInterviewModal Component", () => {
  const mockJob: Job = {
    id: "job-1",
    title: "Senior Fullstack Engineer",
    department: "Engineering",
    status: "PUBLISHED",
    type: "FULL_TIME",
    workplaceType: "REMOTE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockCandidate: Application = {
    id: "app-1",
    jobId: "job-1",
    candidateName: "Nguyen Van A",
    candidateEmail: "nguyen@example.com",
    stage: "APPLIED",
    orderIndex: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(
      <ScheduleInterviewModal
        isOpen={false}
        onClose={vi.fn()}
        jobs={[mockJob]}
        applications={[mockCandidate]}
      />
    );

    expect(screen.queryByText("Lên lịch phỏng vấn")).not.toBeInTheDocument();
  });

  it("renders modal header and fields when isOpen is true", () => {
    render(
      <ScheduleInterviewModal
        isOpen={true}
        onClose={vi.fn()}
        jobs={[mockJob]}
        applications={[mockCandidate]}
        selectedApplicationId="app-1"
        selectedJobId="job-1"
      />
    );

    expect(screen.getByText("Lên lịch phỏng vấn")).toBeInTheDocument();
    expect(screen.getByText(/Nguyen Van A/)).toBeInTheDocument();
  });

  it("validates missing date or time before submitting", async () => {
    render(
      <ScheduleInterviewModal
        isOpen={true}
        onClose={vi.fn()}
        jobs={[mockJob]}
        applications={[mockCandidate]}
        selectedApplicationId="app-1"
        selectedJobId="job-1"
      />
    );

    const submitBtn = screen.getByRole("button", { name: "Xác nhận lên lịch" });
    fireEvent.submit(submitBtn.closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Vui lòng chọn ngày phỏng vấn.")).toBeInTheDocument();
    });
    expect(mockCreateMutateAsync).not.toHaveBeenCalled();
  });

  it("submits update when editing an existing interview", async () => {
    mockUpdateMutateAsync.mockResolvedValueOnce({ id: "int-existing" });
    const handleClose = vi.fn();

    const existingInterview: ScheduledInterviewInfo = {
      id: "int-existing",
      applicationId: "app-1",
      date: "2026-10-20",
      time: "15:00",
      type: "TECHNICAL",
      format: "MEET",
      interviewer: "Tran Tech Lead",
    };

    render(
      <ScheduleInterviewModal
        isOpen={true}
        onClose={handleClose}
        jobs={[mockJob]}
        applications={[mockCandidate]}
        selectedApplicationId="app-1"
        selectedJobId="job-1"
        editingInterview={existingInterview}
      />
    );

    expect(screen.getByText("Chỉnh sửa lịch phỏng vấn")).toBeInTheDocument();
    const updateBtn = screen.getByRole("button", { name: "Cập nhật lịch phỏng vấn" });
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
        id: "int-existing",
        data: expect.objectContaining({
          date: "2026-10-20",
          time: "15:00",
          interviewer: "Tran Tech Lead",
        }),
      });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });
});
