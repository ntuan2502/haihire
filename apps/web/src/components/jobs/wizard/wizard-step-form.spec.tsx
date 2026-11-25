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
        "jobs.wizard.newQuestionTitle": "New screening question",
        "jobs.wizard.editQuestionTitle": "Edit screening question",
        "jobs.wizard.questionPromptLabel": "Question",
        "jobs.wizard.addOptionAction": "Add option",
        "jobs.wizard.optionPlaceholder": `Option ${params?.index ?? 1}`,
        "jobs.wizard.removeOption": "Remove option",
        "jobs.wizard.dragToReorder": "Drag to reorder",
        "jobs.wizard.editQuestion": "Edit question",
        "jobs.wizard.deleteQuestion": "Delete question",
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
      onReorderQuestions: (activeId: string, overId: string) => void;
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
      onReorderQuestions: vi.fn(),
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

  it("renders drag handles, supports interactive single-choice creation, in-place editing, and paste import", () => {
    const onAddQuestion = vi.fn();
    const onUpdateQuestion = vi.fn();
    const onBulkAddQuestions = vi.fn();

    renderStepForm({
      onAddQuestion,
      onUpdateQuestion,
      onBulkAddQuestions,
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

    // Each card renders a drag handle button for sorting
    const q1Row = screen.getByTestId("screening-question-item-q1");
    const q2Row = screen.getByTestId("screening-question-item-q2");
    expect(
      within(q1Row).getByRole("button", { name: "Drag to reorder" }),
    ).toBeInTheDocument();
    expect(
      within(q2Row).getByRole("button", { name: "Drag to reorder" }),
    ).toBeInTheDocument();

    // Edit second question in-place
    fireEvent.click(
      within(q2Row).getByRole("button", { name: "Edit question" }),
    );
    const editContainer = within(q2Row).getByTestId(
      "screening-question-editor",
    );
    expect(
      within(editContainer).getByText("Edit screening question"),
    ).toBeInTheDocument();

    const requiredSwitch = within(editContainer).getByRole("switch", {
      name: "Required question",
    });
    expect(requiredSwitch).toHaveAttribute("aria-checked", "false");
    fireEvent.click(requiredSwitch);
    expect(requiredSwitch).toHaveAttribute("aria-checked", "true");

    fireEvent.change(
      within(editContainer).getByPlaceholderText("Enter your question..."),
      { target: { value: "Second question updated" } },
    );
    fireEvent.click(
      within(editContainer).getByRole("button", { name: "Save question" }),
    );
    expect(onUpdateQuestion).toHaveBeenCalledWith("q2", {
      text: "Second question updated",
      type: "yes_no",
      required: true,
    });

    // Add single_choice question using visual radio chips and individual option rows
    fireEvent.click(screen.getByRole("button", { name: "Add question" }));
    const addEditor = screen.getByTestId("screening-question-editor");
    expect(
      within(addEditor).getByText("New screening question"),
    ).toBeInTheDocument();

    fireEvent.change(
      within(addEditor).getByPlaceholderText("Enter your question..."),
      { target: { value: "Preferred work model?" } },
    );
    fireEvent.click(
      within(addEditor).getByRole("radio", { name: "Single choice" }),
    );

    fireEvent.change(within(addEditor).getByPlaceholderText("Option 1"), {
      target: { value: "Remote" },
    });
    fireEvent.change(within(addEditor).getByPlaceholderText("Option 2"), {
      target: { value: "Hybrid" },
    });
    fireEvent.click(
      within(addEditor).getByRole("button", { name: "Add option" }),
    );
    fireEvent.change(within(addEditor).getByPlaceholderText("Option 3"), {
      target: { value: "On-site" },
    });

    fireEvent.click(
      within(addEditor).getByRole("button", { name: "Add question" }),
    );
    expect(onAddQuestion).toHaveBeenCalledWith({
      text: "Preferred work model?",
      type: "single_choice",
      required: true,
      options: ["Remote", "Hybrid", "On-site"],
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
