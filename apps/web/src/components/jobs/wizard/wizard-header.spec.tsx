import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WizardHeader } from "./wizard-header";
import type { StepId } from "./types";

// Mock i18n
vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "jobs.title": "Danh sách việc làm",
        "jobs.wizard.backToPipeline": "Quay lại Pipeline",
        "jobs.wizard.autoSaved": "Đã tự động lưu nháp",
        "jobs.wizard.candidatePreview": "Xem trước với tư cách ứng viên",
        "jobs.wizard.saveAndPublish": "Lưu & Tiếp tục",
        "jobs.wizard.saveChanges": "Lưu thay đổi",
        "jobs.wizard.saving": "Đang lưu...",
        "jobs.wizard.comingSoon": "Sắp ra mắt",
      };
      return translations[key] || key;
    },
  }),
}));

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("WizardHeader Component Tests", () => {
  const steps = [
    { id: 1 as StepId, label: "Chi tiết", implemented: true },
    { id: 2 as StepId, label: "Cấu hình form", implemented: false },
    { id: 3 as StepId, label: "Tiêu chí AI", implemented: false },
    { id: 4 as StepId, label: "Xuất bản", implemented: true },
  ];

  it("renders back link and steps in create mode", () => {
    render(
      <WizardHeader
        mode="create"
        currentStep={1}
        steps={steps}
        draftSavedAt={null}
        isSaving={false}
        isStep1Valid={true}
        onStepClick={vi.fn()}
        onOpenPreview={vi.fn()}
        onSaveJob={vi.fn()}
      />
    );

    expect(screen.getByText("Danh sách việc làm")).toBeInTheDocument();
    expect(screen.getByText("Chi tiết")).toBeInTheDocument();
    expect(screen.getByText("Xuất bản")).toBeInTheDocument();
  });

  it("renders autosaved badge when draftSavedAt is provided", () => {
    render(
      <WizardHeader
        mode="create"
        currentStep={1}
        steps={steps}
        draftSavedAt="21:45"
        isSaving={false}
        isStep1Valid={true}
        onStepClick={vi.fn()}
        onOpenPreview={vi.fn()}
        onSaveJob={vi.fn()}
      />
    );

    expect(screen.getByText("Đã tự động lưu nháp")).toBeInTheDocument();
  });

  it("triggers onOpenPreview when clicking preview button", () => {
    const onOpenPreview = vi.fn();
    render(
      <WizardHeader
        mode="create"
        currentStep={1}
        steps={steps}
        draftSavedAt={null}
        isSaving={false}
        isStep1Valid={true}
        onStepClick={vi.fn()}
        onOpenPreview={onOpenPreview}
        onSaveJob={vi.fn()}
      />
    );

    const previewBtn = screen.getByText("Xem trước với tư cách ứng viên");
    fireEvent.click(previewBtn);

    expect(onOpenPreview).toHaveBeenCalledTimes(1);
  });

  it("triggers onSaveJob when clicking top-right save button", () => {
    const onSaveJob = vi.fn();
    render(
      <WizardHeader
        mode="create"
        currentStep={1}
        steps={steps}
        draftSavedAt={null}
        isSaving={false}
        isStep1Valid={true}
        onStepClick={vi.fn()}
        onOpenPreview={vi.fn()}
        onSaveJob={onSaveJob}
      />
    );

    const saveBtn = screen.getByText("Lưu & Tiếp tục");
    fireEvent.click(saveBtn);

    expect(onSaveJob).toHaveBeenCalledTimes(1);
  });

  it("disables save button when step 1 is invalid", () => {
    render(
      <WizardHeader
        mode="create"
        currentStep={1}
        steps={steps}
        draftSavedAt={null}
        isSaving={false}
        isStep1Valid={false}
        onStepClick={vi.fn()}
        onOpenPreview={vi.fn()}
        onSaveJob={vi.fn()}
      />
    );

    const saveBtn = screen.getByText("Lưu & Tiếp tục").closest("button");
    expect(saveBtn).toBeDisabled();
  });
});
