"use client";

import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SCREENING_QUESTION_TYPES } from "@haihire/shared";
import {
  ClipboardPaste,
  FileText,
  FileUp,
  Lock,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useLocalization } from "@/components/providers/localization-provider";
import { Button } from "@/components/ui/button";
import {
  useAiStatusQuery,
  useGenerateScreeningQuestionsMutation,
} from "@/hooks/use-ai-setting-queries";
import { useHasPermission } from "@/hooks/use-has-permission";
import { getApiErrorMessage } from "@/lib/api-error";
import { useI18n } from "@/i18n";
import type {
  ApplicationFormFieldMode,
  ScreeningQuestion,
  ScreeningQuestionType,
} from "./types";
import {
  FieldModeSegmentedControl,
  MAX_QUESTION_OPTIONS,
  QUESTION_TYPE_ICONS,
  SortableScreeningQuestionItem,
} from "./wizard-form-question-item";
import { WizardQuestionEditorCard } from "./wizard-form-question-editor";
import {
  WizardAiQuestionsModal,
  WizardPasteQuestionsModal,
} from "./wizard-form-modals";

interface WizardStepFormProps {
  jobTitle?: string;
  department?: string;
  experienceLevel?: string;
  workplace?: string;
  description?: string;
  phoneSetting: ApplicationFormFieldMode;
  setPhoneSetting: (s: ApplicationFormFieldMode) => void;
  resumeSetting: ApplicationFormFieldMode;
  setResumeSetting: (s: ApplicationFormFieldMode) => void;
  coverLetterSetting: ApplicationFormFieldMode;
  setCoverLetterSetting: (s: ApplicationFormFieldMode) => void;
  screeningQuestions: ScreeningQuestion[];
  onAddQuestion: (q: Omit<ScreeningQuestion, "id">) => void;
  onUpdateQuestion: (id: string, patch: Omit<ScreeningQuestion, "id">) => void;
  onBulkAddQuestions: (items: Array<Omit<ScreeningQuestion, "id">>) => void;
  onReorderQuestions: (activeId: string, overId: string) => void;
  onRemoveQuestion: (id: string) => void;
  onCancel: () => void;
  onBack: () => void;
  onContinue: () => void;
}

export function WizardStepForm({
  jobTitle = "",
  department = "",
  experienceLevel = "",
  workplace = "",
  description = "",
  phoneSetting,
  setPhoneSetting,
  resumeSetting,
  setResumeSetting,
  coverLetterSetting,
  setCoverLetterSetting,
  screeningQuestions,
  onAddQuestion,
  onUpdateQuestion,
  onBulkAddQuestions,
  onReorderQuestions,
  onRemoveQuestion,
  onCancel,
  onBack,
  onContinue,
}: WizardStepFormProps) {
  const { t, locale } = useI18n();
  const { localization } = useLocalization();
  const isLastFirst = localization.nameDisplayOrder === "LAST_FIRST";
  const dndContextId = useId();
  const questionInputId = useId();
  const canManageIntegrations = useHasPermission(
    "settings:manage_integrations",
  );
  const { data: aiStatus } = useAiStatusQuery();
  const generateAiMutation = useGenerateScreeningQuestionsMutation();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [draftType, setDraftType] =
    useState<ScreeningQuestionType>("short_text");
  const [draftRequired, setDraftRequired] = useState(true);
  const [draftOptions, setDraftOptions] = useState<string[]>(["", ""]);

  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<
    Array<Omit<ScreeningQuestion, "id">>
  >([]);
  const [selectedAiIndices, setSelectedAiIndices] = useState<number[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorderQuestions(String(active.id), String(over.id));
  };

  const nameFieldRows = isLastFirst
    ? [
        { key: "lastName", label: t("jobs.wizard.lastNameLabel") },
        { key: "firstName", label: t("jobs.wizard.firstNameLabel") },
      ]
    : [
        { key: "firstName", label: t("jobs.wizard.firstNameLabel") },
        { key: "lastName", label: t("jobs.wizard.lastNameLabel") },
      ];

  const fieldModeLabels = {
    hidden: t("jobs.wizard.hiddenOption"),
    optional: t("jobs.wizard.optionalOption"),
    required: t("jobs.wizard.requiredOption"),
  };

  const questionTypeOptions = SCREENING_QUESTION_TYPES.map((typeKey) => ({
    value: typeKey,
    label: t(`jobs.wizard.questionTypes.${typeKey}`),
    icon: QUESTION_TYPE_ICONS[typeKey],
  }));

  const isChoiceType =
    draftType === "single_choice" || draftType === "multiple_choice";

  const cleanedDraftOptions = Array.from(
    new Set(draftOptions.map((opt) => opt.trim()).filter(Boolean)),
  );

  const isDraftValid =
    draftText.trim().length > 0 &&
    (!isChoiceType || cleanedDraftOptions.length >= 2);

  const resetEditor = () => {
    setIsEditorOpen(false);
    setEditingId(null);
    setDraftText("");
    setDraftType("short_text");
    setDraftRequired(true);
    setDraftOptions(["", ""]);
  };

  const openAddEditor = () => {
    setEditingId(null);
    setDraftText("");
    setDraftType("short_text");
    setDraftRequired(true);
    setDraftOptions(["", ""]);
    setIsEditorOpen(true);
  };

  const openEditEditor = (question: ScreeningQuestion) => {
    setEditingId(question.id);
    setDraftText(question.text);
    setDraftType(question.type);
    setDraftRequired(question.required);
    setDraftOptions(
      question.options && question.options.length >= 2
        ? [...question.options]
        : question.options && question.options.length === 1
          ? [...question.options, ""]
          : ["", ""],
    );
    setIsEditorOpen(true);
  };

  const handleSelectDraftType = (nextType: ScreeningQuestionType) => {
    setDraftType(nextType);
    if (
      (nextType === "single_choice" || nextType === "multiple_choice") &&
      draftOptions.length < 2
    ) {
      setDraftOptions(["", ""]);
    }
  };

  const handleChangeOption = (index: number, value: string) => {
    setDraftOptions((prev) =>
      prev.map((item, idx) => (idx === index ? value : item)),
    );
  };

  const handleAddOptionRow = () => {
    setDraftOptions((prev) =>
      prev.length >= MAX_QUESTION_OPTIONS ? prev : [...prev, ""],
    );
  };

  const handleRemoveOptionRow = (index: number) => {
    setDraftOptions((prev) => {
      if (prev.length <= 2) return prev;
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleOptionInputKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (
      e.key === "Enter" &&
      index === draftOptions.length - 1 &&
      draftOptions.length < MAX_QUESTION_OPTIONS
    ) {
      e.preventDefault();
      handleAddOptionRow();
    }
  };

  const handleSaveEditor = () => {
    if (!isDraftValid) return;
    const payload: Omit<ScreeningQuestion, "id"> = {
      text: draftText.trim(),
      type: draftType,
      required: draftRequired,
      ...(isChoiceType ? { options: cleanedDraftOptions } : {}),
    };
    if (editingId) {
      onUpdateQuestion(editingId, payload);
    } else {
      onAddQuestion(payload);
    }
    resetEditor();
  };

  const parsedPasteLines = pasteText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const handleImportPaste = (e: FormEvent) => {
    e.preventDefault();
    if (parsedPasteLines.length === 0) return;
    onBulkAddQuestions(
      parsedPasteLines.map((line) => ({
        text: line,
        type: "short_text",
        required: true,
      })),
    );
    setPasteText("");
    setIsPasteModalOpen(false);
  };

  const plainDescription = description
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const hasJobDetailsForAi =
    jobTitle.trim().length > 0 && plainDescription.length > 0;

  const runAiGeneration = async () => {
    if (!hasJobDetailsForAi) {
      setAiError(t("jobs.wizard.aiMissingJobDetails"));
      return;
    }
    setAiError(null);
    setAiSuggestions([]);
    setSelectedAiIndices([]);
    try {
      const res = await generateAiMutation.mutateAsync({
        title: jobTitle.trim(),
        description: plainDescription,
        ...(department.trim() ? { department: department.trim() } : {}),
        ...(experienceLevel.trim()
          ? { experienceLevel: experienceLevel.trim() }
          : {}),
        ...(workplace.trim() ? { workplace: workplace.trim() } : {}),
        language: locale === "en" ? "en" : "vi",
        count: 5,
        existingQuestions: screeningQuestions.map((q) => q.text),
      });
      setAiSuggestions(res.questions);
      setSelectedAiIndices(res.questions.map((_, i) => i));
    } catch (err: unknown) {
      setAiError(getApiErrorMessage(err, t, "errors.AI_GENERATION_FAILED"));
    }
  };

  const isQuestionsAiEnabled = Boolean(
    aiStatus?.features?.SCREENING_QUESTIONS?.enabled ?? aiStatus?.enabled,
  );

  const handleOpenAiModal = () => {
    setIsAiModalOpen(true);
    if (isQuestionsAiEnabled) {
      void runAiGeneration();
    }
  };

  const handleToggleAiSuggestion = (index: number) => {
    setSelectedAiIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  const handleConfirmAiSuggestions = (e: FormEvent) => {
    e.preventDefault();
    const chosen = selectedAiIndices
      .map((i) => aiSuggestions[i])
      .filter(Boolean);
    if (chosen.length === 0) return;
    onBulkAddQuestions(chosen);
    setIsAiModalOpen(false);
    setAiSuggestions([]);
    setSelectedAiIndices([]);
    setAiError(null);
  };

  const renderQuestionEditor = () => (
    <WizardQuestionEditorCard
      questionInputId={questionInputId}
      editingId={editingId}
      draftText={draftText}
      setDraftText={setDraftText}
      draftType={draftType}
      onSelectDraftType={handleSelectDraftType}
      draftRequired={draftRequired}
      setDraftRequired={setDraftRequired}
      draftOptions={draftOptions}
      onChangeOption={handleChangeOption}
      onRemoveOptionRow={handleRemoveOptionRow}
      onAddOptionRow={handleAddOptionRow}
      onOptionInputKeyDown={handleOptionInputKeyDown}
      questionTypeOptions={questionTypeOptions}
      isChoiceType={isChoiceType}
      isDraftValid={isDraftValid}
      onCancel={resetEditor}
      onSave={handleSaveEditor}
    />
  );

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[11px] font-semibold text-muted-foreground">
          {t("jobs.wizard.customizeFormTitle")}
        </span>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {t("jobs.wizard.customizeFormDesc")}
        </p>
      </div>

      {/* Section 1: Personal Information */}
      <div className="space-y-4 bg-card text-card-foreground p-4 sm:p-6 rounded-xl border border-border shadow-xs">
        <h3 className="text-xs font-semibold text-foreground">
          {t("jobs.wizard.personalInfoTitle")}
        </h3>

        <div className="space-y-2.5">
          {nameFieldRows.map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/40"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <span>{row.label}</span>
                <Lock
                  className="h-3 w-3 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-semibold">
                {t("jobs.wizard.mandatoryBadge")}
              </span>
            </div>
          ))}

          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/40">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <span>{t("jobs.wizard.emailLabel")}</span>
              <Lock
                className="h-3 w-3 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-semibold">
              {t("jobs.wizard.mandatoryBadge")}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-border bg-background">
            <div>
              <span className="text-xs font-semibold text-foreground">
                {t("jobs.wizard.phoneLabel")}
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t("jobs.wizard.phoneChooseHint")}
              </p>
            </div>

            <FieldModeSegmentedControl
              value={phoneSetting}
              onChange={setPhoneSetting}
              ariaLabel={t("jobs.wizard.phoneLabel")}
              labels={fieldModeLabels}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Documents */}
      <div className="space-y-4 bg-card text-card-foreground p-4 sm:p-6 rounded-xl border border-border shadow-xs">
        <h3 className="text-xs font-semibold text-foreground">
          {t("jobs.wizard.documentsTitle")}
        </h3>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-border bg-background">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground shrink-0">
                <FileUp className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <span className="text-xs font-semibold text-foreground">
                  {t("jobs.wizard.resumeCvTitle")}
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t("jobs.wizard.resumeCvDesc")}
                </p>
              </div>
            </div>

            <FieldModeSegmentedControl
              value={resumeSetting}
              onChange={setResumeSetting}
              ariaLabel={t("jobs.wizard.resumeCvTitle")}
              labels={fieldModeLabels}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-border bg-background">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground shrink-0">
                <FileText className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <span className="text-xs font-semibold text-foreground">
                  {t("jobs.wizard.coverLetterTitle")}
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t("jobs.wizard.coverLetterDesc")}
                </p>
              </div>
            </div>

            <FieldModeSegmentedControl
              value={coverLetterSetting}
              onChange={setCoverLetterSetting}
              ariaLabel={t("jobs.wizard.coverLetterTitle")}
              labels={fieldModeLabels}
            />
          </div>
        </div>
      </div>

      {/* Section 3: Screening Questions */}
      <div className="space-y-4 bg-card text-card-foreground p-4 sm:p-6 rounded-xl border border-border shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold text-foreground">
              {t("jobs.wizard.screeningQuestionsTitle")}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t("jobs.wizard.screeningQuestionsDesc")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenAiModal}
              className="h-8 text-xs gap-1.5 cursor-pointer"
            >
              <Sparkles
                className="h-3.5 w-3.5 text-primary"
                aria-hidden="true"
              />
              {t("jobs.wizard.aiGenerateBtn")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPasteModalOpen(true)}
              className="h-8 text-xs gap-1.5 cursor-pointer"
            >
              <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
              {t("jobs.wizard.pasteExistingBtn")}
            </Button>
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-lg border border-border/80 bg-muted/35 px-3.5 py-2.5 text-xs text-muted-foreground">
          <ShieldCheck
            className="h-4 w-4 text-primary shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="leading-relaxed">{t("jobs.wizard.aiSafetyBanner")}</p>
        </div>

        {screeningQuestions.length === 0 && !isEditorOpen ? (
          <div className="py-6 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center px-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              {t("jobs.wizard.noScreeningQuestions")}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openAddEditor}
              className="text-xs font-medium gap-1.5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {t("jobs.wizard.addFirstQuestion")}
            </Button>
          </div>
        ) : (
          screeningQuestions.length > 0 && (
            <DndContext
              id={dndContextId}
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={screeningQuestions.map((q) => q.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2.5">
                  {screeningQuestions.map((q, idx) => (
                    <SortableScreeningQuestionItem
                      key={q.id}
                      question={q}
                      index={idx}
                      isEditing={isEditorOpen && editingId === q.id}
                      typeLabel={t(`jobs.wizard.questionTypes.${q.type}`)}
                      mandatoryLabel={t("jobs.wizard.mandatoryBadge")}
                      optionalLabel={t("jobs.wizard.optionalBadge")}
                      dragLabel={t("jobs.wizard.dragToReorder")}
                      editLabel={t("jobs.wizard.editQuestion")}
                      deleteLabel={t("jobs.wizard.deleteQuestion")}
                      editorContent={
                        isEditorOpen && editingId === q.id
                          ? renderQuestionEditor()
                          : null
                      }
                      onEdit={() => openEditEditor(q)}
                      onDelete={() => {
                        if (editingId === q.id) resetEditor();
                        onRemoveQuestion(q.id);
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )
        )}

        {isEditorOpen && editingId === null && renderQuestionEditor()}

        {!isEditorOpen && screeningQuestions.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openAddEditor}
            className="h-8 px-3 text-xs font-medium gap-1.5 w-full sm:w-auto cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {t("jobs.wizard.addQuestionAction")}
          </Button>
        )}
      </div>

      {/* Bottom Step 2 Actions */}
      <div className="hidden sm:flex flex-wrap items-center justify-between gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="text-xs cursor-pointer"
        >
          {t("common.cancel")}
        </Button>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="text-xs cursor-pointer"
          >
            {t("common.back")}
          </Button>
          <Button
            type="button"
            onClick={onContinue}
            className="text-xs font-semibold px-6 cursor-pointer"
          >
            {t("jobs.wizard.continueToPublish")}
          </Button>
        </div>
      </div>

      <WizardPasteQuestionsModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        pasteText={pasteText}
        setPasteText={setPasteText}
        parsedCount={parsedPasteLines.length}
        onSubmit={handleImportPaste}
      />

      <WizardAiQuestionsModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onSubmit={handleConfirmAiSuggestions}
        isQuestionsAiEnabled={isQuestionsAiEnabled}
        canManageIntegrations={canManageIntegrations}
        isGenerating={generateAiMutation.isPending}
        aiError={aiError}
        hasJobDetailsForAi={hasJobDetailsForAi}
        aiSuggestions={aiSuggestions}
        selectedAiIndices={selectedAiIndices}
        onToggleSuggestion={handleToggleAiSuggestion}
        onRegenerate={() => void runAiGeneration()}
      />
    </div>
  );
}
