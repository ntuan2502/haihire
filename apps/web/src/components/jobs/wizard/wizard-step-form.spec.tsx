import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { WizardStepForm } from "./wizard-step-form";
import type { ApplicationFormFieldMode, ScreeningQuestion } from "./types";

vi.mock("@/components/providers/localization-provider", () => ({
  useLocalization: () => ({
    localization: { nameDisplayOrder: "FIRST_LAST" },
  }),
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const dict: Record<string, string> = {
        "jobs.wizard.customizeFormTitle": "CUSTOMIZE YOUR APPLICATION FORM",
        "jobs.wizard.customizeFormDesc": "Configure fields and questions.",
        "jobs.wizard.personalInfoTitle": "Personal information",
        "jobs.wizard.firstNameLabel": "First name",
        "jobs.wizard.lastNameLabel": "Last name",
        "jobs.wizard.emailLabel": "Email",
        "jobs.wizard.phoneLabel": "Phone",
        "jobs.wizard.phoneChooseHint": "Choose visibility.",
        "jobs.wizard.mandatoryBadge": "Mandatory",
        "jobs.wizard.optionalBadge": "Optional",
        "jobs.wizard.hiddenOption": "Hidden",
        "jobs.wizard.optionalOption": "Optional",
        "jobs.wizard.requiredOption": "Required",
        "jobs.wizard.documentsTitle": "Documents",
        "jobs.wizard.resumeCvTitle": "Resume / CV",
        "jobs.wizard.resumeCvDesc": "PDF only up to 10 MB",
        "jobs.wizard.coverLetterTitle": "Cover letter",
        "jobs.wizard.coverLetterDesc": "Free text field",
        "jobs.wizard.screeningQuestionsTitle": "Screening questions",
        "jobs.wizard.screeningQuestionsDesc": "Add custom questions",
        "jobs.wizard.noScreeningQuestions": "No screening questions added yet.",
        "jobs.wizard.addFirstQuestion": "Add first question",
        "jobs.wizard.addQuestionAction": "Add question",
        "jobs.wizard.saveQuestionAction": "Save question",
        "jobs.wizard.questionTypeLabel": "Answer type",
        "jobs.wizard.questionTypes.short_text": "Short answer",
        "jobs.wizard.questionTypes.long_text": "Long answer",
        "jobs.wizard.questionTypes.yes_no": "Yes / No",
        "jobs.wizard.questionTypes.single_choice": "Single choice",
        "jobs.wizard.questionTypes.multiple_choice": "Multiple choice",
        "jobs.wizard.questionRequiredToggle": "Required question",
        "jobs.wizard.questionOptionsLabel": "Answer options",
        "jobs.wizard.questionOptionsHint": "Enter at least 2 distinct options.",
        "jobs.wizard.editQuestion": "Edit question",
        "jobs.wizard.deleteQuestion": "Delete question",
        "jobs.wizard.moveQuestionUp": "Move up",
        "jobs.wizard.moveQuestionDown": "Move down",
        "jobs.wizard.pasteExistingBtn": "Paste existing",
        "jobs.wizard.pasteModalTitle": "Paste screening questions",
        "jobs.wizard.pasteModalDesc": "One per line.",
        "jobs.wizard.pasteModalPlaceholder": "Paste here...",
        "jobs.wizard.pasteModalImportBtn": `Add ${params?.count ?? 0} question(s)`,
        "jobs.wizard.questionTemplatesBtn": "Question templates",
        "jobs.wizard.questionTemplatesTitle": "Add from screening templates",
        "jobs.wizard.questionTemplatesDesc": "Pick a template.",
        "jobs.wizard.templateWorkAuth": "Authorized to work?",
        "jobs.wizard.templateNoticePeriod": "Notice period?",
        "jobs.wizard.templateWorkArrangement": "Work mode?",
        "jobs.wizard.templateWorkArrangementOpt1": "On-site",
        "jobs.wizard.templateWorkArrangementOpt2": "Hybrid",
        "jobs.wizard.templateWorkArrangementOpt3": "Remote",
        "jobs.wizard.templateExperienceYears": "Years of experience?",
        "jobs.wizard.placeholders.screeningQuestion": "Enter your question...",
        "jobs.wizard.continueToPublish": "Save & continue",
        "common.cancel": "Cancel",
        "common.back": "Back",
        "common.close": "Close",
      };
      return dict[key] || key;
    },
  }),
}));

describe("WizardStepForm Component", () => {
  const renderStepForm = (
    overrides: Partial<{
      phoneSetting: ApplicationFormFieldMode;
      resumeSetting: ApplicationFormFieldMode;
      coverLetterSetting: ApplicationFormFieldMode;
      screeningQuestions: ScreeningQuestion[];
      setPhoneSetting: (v: ApplicationFormFieldMode) => void;
      setResumeSetting: (v: ApplicationFormFieldMode) => void;
      setCoverLetterSetting: (v: ApplicationFormFieldMode) => void;
      onAddQuestion: (q: Omit<ScreeningQuestion, "id">) => void;
      onUpdateQuestion: (id: string, q: Omit<ScreeningQuestion, "id">) => void;
      onBulkAddQuestions: (items: Array<Omit<ScreeningQuestion, "id">>) => void;
      onMoveQuestion: (id: string, dir: "up" | "down") => void;
      onRemoveQuestion: (id: string) => void;
    }> = {},
  ) => {
    const props = {
      phoneSetting: "optional" as ApplicationFormFieldMode,
      setPhoneSetting: vi.fn(),
      resumeSetting: "required" as ApplicationFormFieldMode,
      setResumeSetting: vi.fn(),
      coverLetterSetting: "hidden" as ApplicationFormFieldMode,
      setCoverLetterSetting: vi.fn(),
      screeningQuestions: [] as ScreeningQuestion[],
      onAddQuestion: vi.fn(),
      onUpdateQuestion: vi.fn(),
      onBulkAddQuestions: vi.fn(),
      onMoveQuestion: vi.fn(),
      onRemoveQuestion: vi.fn(),
      onCancel: vi.fn(),
      onBack: vi.fn(),
      onContinue: vi.fn(),
      ...overrides,
    };
    render(<WizardStepForm {...props} />);
    return props;
  };

  it("renders locked mandatory personal fields and 3-way toggles for phone, resume, and cover letter", () => {
    const setPhoneSetting = vi.fn();
    const setResumeSetting = vi.fn();
    const setCoverLetterSetting = vi.fn();

    renderStepForm({
      setPhoneSetting,
      setResumeSetting,
      setCoverLetterSetting,
    });

    expect(screen.getByText("First name")).toBeInTheDocument();
    expect(screen.getByText("Last name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();

    const phoneGroup = screen.getByRole("group", { name: "Phone" });
    fireEvent.click(
      within(phoneGroup).getByRole("button", { name: "Required" }),
    );
    expect(setPhoneSetting).toHaveBeenCalledWith("required");

    const resumeGroup = screen.getByRole("group", { name: "Resume / CV" });
    fireEvent.click(
      within(resumeGroup).getByRole("button", { name: "Optional" }),
    );
    expect(setResumeSetting).toHaveBeenCalledWith("optional");

    const coverGroup = screen.getByRole("group", { name: "Cover letter" });
    fireEvent.click(
      within(coverGroup).getByRole("button", { name: "Required" }),
    );
    expect(setCoverLetterSetting).toHaveBeenCalledWith("required");
  });

  it("supports adding a choice question, pasting multi-line questions, and reordering/editing", () => {
    const onAddQuestion = vi.fn();
    const onBulkAddQuestions = vi.fn();
    const onMoveQuestion = vi.fn();

    renderStepForm({
      onAddQuestion,
      onBulkAddQuestions,
      onMoveQuestion,
      screeningQuestions: [
        {
          id: "q1",
          text: "First question",
          type: "short_text",
          required: true,
        },
        { id: "q2", text: "Second question", type: "yes_no", required: false },
      ],
    });

    // Move second question up
    const q2Row = screen.getByTestId("screening-question-item-q2");
    fireEvent.click(within(q2Row).getByRole("button", { name: "Move up" }));
    expect(onMoveQuestion).toHaveBeenCalledWith("q2", "up");

    // Add single_choice question with 2 options
    fireEvent.click(screen.getByRole("button", { name: "Add question" }));
    fireEvent.change(screen.getByPlaceholderText("Enter your question..."), {
      target: { value: "Preferred work model?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Answer type" }));
    fireEvent.click(screen.getByRole("option", { name: "Single choice" }));

    fireEvent.change(
      screen.getByPlaceholderText("Enter at least 2 distinct options."),
      { target: { value: "Remote\nHybrid" } },
    );

    const editor = screen.getByTestId("screening-question-editor");
    fireEvent.click(
      within(editor).getByRole("button", { name: "Add question" }),
    );
    expect(onAddQuestion).toHaveBeenCalledWith({
      text: "Preferred work model?",
      type: "single_choice",
      required: true,
      options: ["Remote", "Hybrid"],
    });

    // Paste existing bulk questions
    fireEvent.click(screen.getByRole("button", { name: "Paste existing" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByPlaceholderText("Paste here..."), {
      target: { value: "Question A\n\nQuestion B" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Add 2 question(s)" }),
    );
    expect(onBulkAddQuestions).toHaveBeenCalledWith([
      { text: "Question A", type: "short_text", required: true },
      { text: "Question B", type: "short_text", required: true },
    ]);
  });
});
