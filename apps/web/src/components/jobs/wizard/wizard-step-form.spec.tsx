import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  within,
  waitFor,
} from "@testing-library/react";
import { WizardStepForm } from "./wizard-step-form";
import type { ApplicationFormFieldMode, ScreeningQuestion } from "./types";

let mockAiStatus = { configured: true, enabled: true };
let mockCanManageIntegrations = true;
const mockGenerateMutateAsync = vi.fn();

vi.mock("@/hooks/use-has-permission", () => ({
  useHasPermission: () => mockCanManageIntegrations,
}));

vi.mock("@/hooks/use-ai-setting-queries", () => ({
  useAiStatusQuery: () => ({ data: mockAiStatus }),
  useGenerateScreeningQuestionsMutation: () => ({
    mutateAsync: mockGenerateMutateAsync,
    isPending: false,
  }),
}));

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
        "jobs.wizard.questionTypes.short_text": "Short Text",
        "jobs.wizard.questionTypes.long_text": "Long Text",
        "jobs.wizard.questionTypes.single_choice": "Single Select",
        "jobs.wizard.questionTypes.multiple_choice": "Multi Select",
        "jobs.wizard.questionTypes.number": "Number",
        "jobs.wizard.questionTypes.date": "Date",
        "jobs.wizard.questionTypes.url": "URL",
        "jobs.wizard.questionTypes.yes_no": "Checkbox (Yes/No)",
        "jobs.wizard.questionTypes.file_upload": "File Upload",
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
        "jobs.wizard.aiGenerateBtn": "Generate with AI",
        "jobs.wizard.aiSafetyBanner": "AI drafts questions safely.",
        "jobs.wizard.aiModalTitle": "Generate screening questions with AI",
        "jobs.wizard.aiModalDesc": "Select generated questions.",
        "jobs.wizard.aiGenerating": "Generating...",
        "jobs.wizard.aiRegenerateBtn": "Regenerate",
        "jobs.wizard.aiAddSelectedBtn": `Add ${params?.count ?? 0} selected`,
        "jobs.wizard.aiNotConfiguredTitle": "AI provider is not configured yet",
        "jobs.wizard.aiNotConfiguredDesc": "Configure AI in Integrations.",
        "jobs.wizard.aiOpenSettingsBtn": "Configure AI settings",
        "jobs.wizard.aiMissingJobDetails": "Missing title or description.",
        "jobs.wizard.optionalBadge": "Optional",
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
  beforeEach(() => {
    vi.clearAllMocks();
    mockAiStatus = { configured: true, enabled: true };
    mockCanManageIntegrations = true;
    mockGenerateMutateAsync.mockResolvedValue({
      questions: [
        {
          text: "How many years of TypeScript experience do you have?",
          type: "number",
          required: true,
        },
        {
          text: "Share your portfolio link",
          type: "url",
          required: false,
        },
      ],
      provider: "GEMINI",
      modelId: "gemini-2.5-flash",
    });
  });

  const renderStepForm = (
    overrides: Partial<{
      jobTitle: string;
      description: string;
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
      within(addEditor).getByRole("button", { name: "Answer type" }),
    );
    expect(screen.getByRole("option", { name: "Number" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Date" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "URL" })).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Checkbox (Yes/No)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "File Upload" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: "Single Select" }));

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

  it("removes Question templates and supports Generate with AI modal (configured & unconfigured states)", async () => {
    const onBulkAddQuestions = vi.fn();

    renderStepForm({
      jobTitle: "Senior Backend Engineer",
      description: "<p>NestJS and Postgres microservices.</p>",
      onBulkAddQuestions,
    });

    expect(
      screen.queryByRole("button", { name: "Question templates" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Generate with AI" }));

    await waitFor(() => {
      expect(mockGenerateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Senior Backend Engineer",
          description: "NestJS and Postgres microservices.",
        }),
      );
    });

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText(
        "How many years of TypeScript experience do you have?",
      ),
    ).toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Add 2 selected" }),
    );
    expect(onBulkAddQuestions).toHaveBeenCalledWith([
      {
        text: "How many years of TypeScript experience do you have?",
        type: "number",
        required: true,
      },
      {
        text: "Share your portfolio link",
        type: "url",
        required: false,
      },
    ]);

    // Unconfigured AI prompts admin to configure Integrations -> AI
    mockAiStatus = { configured: false, enabled: false };
    fireEvent.click(screen.getByRole("button", { name: "Generate with AI" }));
    const setupDialog = screen.getByRole("dialog");
    expect(
      within(setupDialog).getByText("AI provider is not configured yet"),
    ).toBeInTheDocument();
    expect(
      within(setupDialog).getByRole("link", { name: "Configure AI settings" }),
    ).toHaveAttribute("href", "/settings/integrations/ai");
  });
});
