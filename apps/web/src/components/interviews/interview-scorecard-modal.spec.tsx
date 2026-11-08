import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InterviewScorecardModal } from "./interview-scorecard-modal";
import type { Application, Job } from "@/types";
import type { ScheduledInterviewInfo } from "@/lib/interviews";

const mockUpdateInterviewMutateAsync = vi.fn();
const mockUpdateCandidateMutateAsync = vi.fn();

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-1", name: "Recruiter Alice" },
  }),
}));

vi.mock("@/hooks/use-queries", () => ({
  useUpdateInterviewMutation: () => ({
    mutateAsync: mockUpdateInterviewMutateAsync,
    isPending: false,
  }),
  useUpdateCandidateMutation: () => ({
    mutateAsync: mockUpdateCandidateMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const dict: Record<string, string> = {
        "interviews.scorecardTitle": "Đánh giá phỏng vấn",
        "interviews.scorecardSubtitle": "Ghi nhận nhận xét và điểm số của ứng viên",
        "interviews.hiringRecommendation": "Khuyến nghị tuyển dụng",
        "interviews.recommendations.strongYes": "Tuyển ngay (Strong Yes)",
        "interviews.recommendations.yes": "Tuyển (Yes)",
        "interviews.recommendations.neutral": "Cân nhắc (Neutral)",
        "interviews.recommendations.no": "Từ chối (No)",
        "interviews.detailedFeedback": "Nhận xét chi tiết",
        "interviews.feedbackPlaceholder": "Ghi chú về kỹ năng chuyên môn, thái độ...",
        "interviews.saveScorecard": "Lưu đánh giá",
        "interviews.savingScorecard": "Đang lưu...",
        "common.close": "Đóng",
      };
      return dict[key] || key;
    },
  }),
}));

describe("InterviewScorecardModal Component", () => {
  const mockApplication: Application = {
    id: "app-1",
    jobId: "job-1",
    candidateName: "Tran Van Candidate",
    candidateEmail: "candidate@haihire.vn",
    stage: "INTERVIEW",
    orderIndex: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockInterview: ScheduledInterviewInfo = {
    id: "int-100",
    applicationId: "app-1",
    date: "2026-10-15",
    time: "10:00",
    type: "TECHNICAL",
    format: "MEET",
    interviewer: "Recruiter Alice",
  };

  const mockJob: Job = {
    id: "job-1",
    title: "Senior Backend Engineer",
    department: "Engineering",
    status: "PUBLISHED",
    type: "FULL_TIME",
    workplaceType: "REMOTE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false or missing interview/application", () => {
    const { container } = render(
      <InterviewScorecardModal
        isOpen={false}
        onClose={vi.fn()}
        application={mockApplication}
        interview={mockInterview}
        job={mockJob}
      />
    );

    expect(screen.queryByText("Đánh giá phỏng vấn")).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it("renders candidate name, modal title, and recommendation buttons", () => {
    render(
      <InterviewScorecardModal
        isOpen={true}
        onClose={vi.fn()}
        application={mockApplication}
        interview={mockInterview}
        job={mockJob}
      />
    );

    expect(screen.getByText("Đánh giá phỏng vấn")).toBeInTheDocument();
    expect(screen.getAllByText("Tran Van Candidate").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Tuyển ngay (Strong Yes)")).toBeInTheDocument();
    expect(screen.getByText("Tuyển (Yes)")).toBeInTheDocument();
  });

  it("allows selecting recommendation and filling feedback before saving", async () => {
    mockUpdateInterviewMutateAsync.mockResolvedValueOnce({ id: "int-100" });
    const handleClose = vi.fn();
    const handleSaved = vi.fn();

    render(
      <InterviewScorecardModal
        isOpen={true}
        onClose={handleClose}
        application={mockApplication}
        interview={mockInterview}
        job={mockJob}
        onSaved={handleSaved}
      />
    );

    // Select Strong Yes
    const strongYesBtn = screen.getByText("Tuyển ngay (Strong Yes)").closest("button");
    if (strongYesBtn) {
      fireEvent.click(strongYesBtn);
    }

    // Type feedback
    const feedbackInput = screen.getByPlaceholderText(
      "Ghi chú về kỹ năng chuyên môn, thái độ..."
    );
    fireEvent.change(feedbackInput, {
      target: { value: "Excellent knowledge of TypeScript and distributed systems." },
    });

    // Click Save
    const saveBtn = screen.getByText("Lưu đánh giá").closest("button");
    if (saveBtn) {
      fireEvent.click(saveBtn);
    }

    await waitFor(() => {
      expect(mockUpdateInterviewMutateAsync).toHaveBeenCalledWith({
        id: "int-100",
        data: {
          scorecard: expect.objectContaining({
            recommendation: "STRONG_YES",
            feedback: "Excellent knowledge of TypeScript and distributed systems.",
            evaluatedBy: "Recruiter Alice",
          }),
        },
      });
      expect(handleSaved).toHaveBeenCalledTimes(1);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });
});
