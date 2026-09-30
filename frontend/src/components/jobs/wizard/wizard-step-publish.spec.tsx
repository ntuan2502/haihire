import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WizardStepPublish } from "./wizard-step-publish";
import type { Job } from "@/types";

// Mock i18n
vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "jobs.wizard.readyToGo": "Sẵn sàng đăng tuyển",
        "jobs.wizard.publishDistributionTitle": "Trạng thái & Phân phối",
        "jobs.wizard.publishNow": "Đăng tin ngay",
        "jobs.wizard.publishNowDesc": "Tin tuyển dụng sẽ được hiển thị công khai trên trang sự nghiệp.",
        "jobs.wizard.openPublished": "Đang mở tuyển dụng",
        "jobs.wizard.saveDraft": "Lưu bản nháp",
        "jobs.wizard.saveDraftDesc": "Chỉ lưu nội dung để xem lại nội bộ, chưa công khai.",
        "jobs.wizard.closeJob": "Đóng tin tuyển dụng",
        "jobs.wizard.closeJobDesc": "Tạm dừng nhận thêm hồ sơ ứng tuyển mới.",
        "jobs.wizard.summaryTitle": "Tóm tắt tin tuyển dụng",
        "jobs.wizard.summaryDesc": "Xem lại các thông số chính trước khi xác nhận",
        "jobs.wizard.requiredOption": "Bắt buộc",
        "jobs.wizard.offOption": "Tắt",
        "jobs.wizard.resumeSub": "Hồ sơ CV",
        "jobs.wizard.questionsSub": "Câu hỏi sàng lọc",
        "jobs.wizard.questionsCountText": "câu hỏi",
        "jobs.wizard.dangerZoneTitle": "Vùng nguy hiểm",
        "jobs.wizard.dangerZoneDesc": "Các thao tác không thể phục hồi đối với tin tuyển dụng này.",
        "jobs.wizard.deletePermanentTitle": "Xóa vĩnh viễn tin tuyển dụng này",
        "jobs.wizard.deletePermanentDesc": "Thao tác này sẽ xóa toàn bộ đơn ứng tuyển liên quan.",
        "jobs.wizard.deleteJobAction": "Xóa tin",
        "jobs.wizard.backAction": "Quay lại",
        "jobs.wizard.saveAndUpdateJob": "Lưu & Cập nhật tin",
        "jobs.wizard.saving": "Đang lưu...",
        "common.cancel": "Hủy bỏ",
        "jobs.workplace.remote": "Từ xa",
      };
      return translations[key] || key;
    },
  }),
}));

describe("WizardStepPublish Component Tests", () => {
  const mockJob: Job = {
    id: "job-uuid-1",
    title: "Senior Backend Engineer",
    department: "Engineering",
    location: "Hà Nội",
    type: "FULL_TIME",
    status: "PUBLISHED",
    description: "Job description text",
    organizationId: "org-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("renders publish mode cards in create mode", () => {
    const setPublishMode = vi.fn();
    render(
      <WizardStepPublish
        mode="create"
        publishMode="publish"
        setPublishMode={setPublishMode}
        jobTitle="Frontend Lead"
        location="Hồ Chí Minh"
        resumeSetting="required"
        screeningQuestionsCount={3}
        isSaving={false}
        onOpenDeleteConfirm={vi.fn()}
        onCancel={vi.fn()}
        onBack={vi.fn()}
        onSaveJob={vi.fn()}
      />
    );

    expect(screen.getByText("Sẵn sàng đăng tuyển")).toBeInTheDocument();
    expect(screen.getAllByText("Đăng tin ngay").length).toBeGreaterThan(0);
    expect(screen.getByText("Lưu bản nháp")).toBeInTheDocument();
    expect(screen.getByText("Frontend Lead")).toBeInTheDocument();
    expect(screen.getByText("Hồ Chí Minh")).toBeInTheDocument();
  });

  it("calls setPublishMode when selecting a different card", () => {
    const setPublishMode = vi.fn();
    render(
      <WizardStepPublish
        mode="create"
        publishMode="publish"
        setPublishMode={setPublishMode}
        jobTitle="Frontend Lead"
        location="Hồ Chí Minh"
        resumeSetting="required"
        screeningQuestionsCount={0}
        isSaving={false}
        onOpenDeleteConfirm={vi.fn()}
        onCancel={vi.fn()}
        onBack={vi.fn()}
        onSaveJob={vi.fn()}
      />
    );

    const draftCard = screen.getByText("Lưu bản nháp");
    fireEvent.click(draftCard);

    expect(setPublishMode).toHaveBeenCalledWith("draft");
  });

  it("renders danger zone in edit mode and triggers onOpenDeleteConfirm", () => {
    const onOpenDeleteConfirm = vi.fn();
    render(
      <WizardStepPublish
        mode="edit"
        initialJob={mockJob}
        publishMode="publish"
        setPublishMode={vi.fn()}
        jobTitle={mockJob.title}
        location={mockJob.location}
        resumeSetting="required"
        screeningQuestionsCount={2}
        isSaving={false}
        onOpenDeleteConfirm={onOpenDeleteConfirm}
        onCancel={vi.fn()}
        onBack={vi.fn()}
        onSaveJob={vi.fn()}
      />
    );

    expect(screen.getByText("Vùng nguy hiểm")).toBeInTheDocument();
    const deleteBtn = screen.getByText("Xóa tin");
    fireEvent.click(deleteBtn);

    expect(onOpenDeleteConfirm).toHaveBeenCalledTimes(1);
  });

  it("triggers onSaveJob when clicking primary submit button", () => {
    const onSaveJob = vi.fn();
    render(
      <WizardStepPublish
        mode="create"
        publishMode="publish"
        setPublishMode={vi.fn()}
        jobTitle="Product Manager"
        location="Đà Nẵng"
        resumeSetting="required"
        screeningQuestionsCount={1}
        isSaving={false}
        onOpenDeleteConfirm={vi.fn()}
        onCancel={vi.fn()}
        onBack={vi.fn()}
        onSaveJob={onSaveJob}
      />
    );

    const saveButtons = screen.getAllByText("Đăng tin ngay");
    const submitBtn = saveButtons.find((el) => el.closest("button"));
    expect(submitBtn).toBeDefined();
    if (submitBtn) {
      fireEvent.click(submitBtn);
      expect(onSaveJob).toHaveBeenCalledTimes(1);
    }
  });

  it("triggers onBack when clicking back button", () => {
    const onBack = vi.fn();
    render(
      <WizardStepPublish
        mode="create"
        publishMode="publish"
        setPublishMode={vi.fn()}
        jobTitle="DevOps Engineer"
        location="Remote"
        resumeSetting="off"
        screeningQuestionsCount={0}
        isSaving={false}
        onOpenDeleteConfirm={vi.fn()}
        onCancel={vi.fn()}
        onBack={onBack}
        onSaveJob={vi.fn()}
      />
    );

    const backBtn = screen.getByText("Quay lại");
    fireEvent.click(backBtn);

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
