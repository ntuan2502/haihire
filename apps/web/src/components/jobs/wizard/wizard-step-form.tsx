"use client";

import { useState, type FormEvent } from "react";
import { SCREENING_QUESTION_TYPES } from "@haihire/shared";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  ClipboardPaste,
  FileText,
  FileUp,
  Lock,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useLocalization } from "@/components/providers/localization-provider";
import { FormModal } from "@/components/shared/form-modal";
import { CustomSelect } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import type {
  ApplicationFormFieldMode,
  ScreeningQuestion,
  ScreeningQuestionType,
} from "./types";

interface FieldModeSegmentedControlProps {
  value: ApplicationFormFieldMode;
  onChange: (next: ApplicationFormFieldMode) => void;
  ariaLabel: string;
  labels: {
    hidden: string;
    optional: string;
    required: string;
  };
}

function FieldModeSegmentedControl({
  value,
  onChange,
  ariaLabel,
  labels,
}: FieldModeSegmentedControlProps) {
  const options: Array<{ value: ApplicationFormFieldMode; label: string }> = [
    { value: "hidden", label: labels.hidden },
    { value: "optional", label: labels.optional },
    { value: "required", label: labels.required },
  ];

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg bg-muted p-0.5 border border-border shrink-0"
    >
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
              isActive
                ? opt.value === "required"
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

interface WizardStepFormProps {
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
  onMoveQuestion: (id: string, direction: "up" | "down") => void;
  onRemoveQuestion: (id: string) => void;
  onCancel: () => void;
  onBack: () => void;
  onContinue: () => void;
}

export function WizardStepForm({
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
  onMoveQuestion,
  onRemoveQuestion,
  onCancel,
  onBack,
  onContinue,
}: WizardStepFormProps) {
  const { t } = useI18n();
  const { localization } = useLocalization();
  const isLastFirst = localization.nameDisplayOrder === "LAST_FIRST";

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [draftType, setDraftType] =
    useState<ScreeningQuestionType>("short_text");
  const [draftRequired, setDraftRequired] = useState(true);
  const [draftOptionsText, setDraftOptionsText] = useState("");

  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);

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
  }));

  const isChoiceType =
    draftType === "single_choice" || draftType === "multiple_choice";

  const parsedDraftOptions = Array.from(
    new Set(
      draftOptionsText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  );

  const isDraftValid =
    draftText.trim().length > 0 &&
    (!isChoiceType || parsedDraftOptions.length >= 2);

  const resetEditor = () => {
    setIsEditorOpen(false);
    setEditingId(null);
    setDraftText("");
    setDraftType("short_text");
    setDraftRequired(true);
    setDraftOptionsText("");
  };

  const openAddEditor = () => {
    setEditingId(null);
    setDraftText("");
    setDraftType("short_text");
    setDraftRequired(true);
    setDraftOptionsText("");
    setIsEditorOpen(true);
  };

  const openEditEditor = (question: ScreeningQuestion) => {
    setEditingId(question.id);
    setDraftText(question.text);
    setDraftType(question.type);
    setDraftRequired(question.required);
    setDraftOptionsText((question.options ?? []).join("\n"));
    setIsEditorOpen(true);
  };

  const handleSaveEditor = () => {
    if (!isDraftValid) return;
    const payload: Omit<ScreeningQuestion, "id"> = {
      text: draftText.trim(),
      type: draftType,
      required: draftRequired,
      ...(isChoiceType ? { options: parsedDraftOptions } : {}),
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

  const templatePresets: Array<Omit<ScreeningQuestion, "id">> = [
    {
      text: t("jobs.wizard.templateWorkAuth"),
      type: "yes_no",
      required: true,
    },
    {
      text: t("jobs.wizard.templateNoticePeriod"),
      type: "short_text",
      required: true,
    },
    {
      text: t("jobs.wizard.templateWorkArrangement"),
      type: "single_choice",
      required: true,
      options: [
        t("jobs.wizard.templateWorkArrangementOpt1"),
        t("jobs.wizard.templateWorkArrangementOpt2"),
        t("jobs.wizard.templateWorkArrangementOpt3"),
      ],
    },
    {
      text: t("jobs.wizard.templateExperienceYears"),
      type: "short_text",
      required: true,
    },
  ];

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
      <div className="space-y-4 bg-card text-card-foreground p-6 rounded-xl border border-border shadow-xs">
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

          {/* Phone Field Configuration */}
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
      <div className="space-y-4 bg-card text-card-foreground p-6 rounded-xl border border-border shadow-xs">
        <h3 className="text-xs font-semibold text-foreground">
          {t("jobs.wizard.documentsTitle")}
        </h3>

        <div className="space-y-3">
          {/* Resume / CV Setting (3-way: Hidden | Optional | Required) */}
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

          {/* Cover Letter Setting (3-way: Hidden | Optional | Required) */}
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
      <div className="space-y-4 bg-card text-card-foreground p-6 rounded-xl border border-border shadow-xs">
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
              onClick={() => setIsTemplatesModalOpen(true)}
              className="h-8 text-xs gap-1.5 cursor-pointer"
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              {t("jobs.wizard.questionTemplatesBtn")}
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

        {screeningQuestions.length === 0 && !isEditorOpen ? (
          <div className="py-6 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-center px-4 space-y-2">
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
          <div className="space-y-2.5">
            {screeningQuestions.map((q, idx) => (
              <div
                key={q.id}
                data-testid={`screening-question-item-${q.id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-border bg-background"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-semibold text-foreground break-words">
                      {q.text}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-muted text-[10px] font-medium text-muted-foreground">
                        {t(`jobs.wizard.questionTypes.${q.type}`)}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-semibold",
                          q.required
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {q.required
                          ? t("jobs.wizard.mandatoryBadge")
                          : t("jobs.wizard.optionalBadge")}
                      </span>
                      {q.options && q.options.length > 0 && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[240px]">
                          {q.options.join(" · ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => onMoveQuestion(q.id, "up")}
                    aria-label={t("jobs.wizard.moveQuestionUp")}
                    title={t("jobs.wizard.moveQuestionUp")}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed p-1 transition-colors cursor-pointer"
                  >
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === screeningQuestions.length - 1}
                    onClick={() => onMoveQuestion(q.id, "down")}
                    aria-label={t("jobs.wizard.moveQuestionDown")}
                    title={t("jobs.wizard.moveQuestionDown")}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed p-1 transition-colors cursor-pointer"
                  >
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditEditor(q)}
                    aria-label={t("jobs.wizard.editQuestion")}
                    title={t("jobs.wizard.editQuestion")}
                    className="text-muted-foreground hover:text-foreground p-1 transition-colors cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveQuestion(q.id)}
                    aria-label={t("jobs.wizard.deleteQuestion")}
                    title={t("jobs.wizard.deleteQuestion")}
                    className="text-muted-foreground hover:text-destructive p-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Inline Add / Edit Question Form */}
        {isEditorOpen && (
          <div
            data-testid="screening-question-editor"
            className="p-4 rounded-lg border border-border bg-muted/40 space-y-3"
          >
            <Input
              type="text"
              placeholder={t("jobs.wizard.placeholders.screeningQuestion")}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              className="h-9 text-xs bg-background"
              autoFocus
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  {t("jobs.wizard.questionTypeLabel")}
                </label>
                <CustomSelect
                  value={draftType}
                  onChange={(val) => setDraftType(val as ScreeningQuestionType)}
                  options={questionTypeOptions}
                  aria-label={t("jobs.wizard.questionTypeLabel")}
                />
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-medium text-foreground h-9 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={draftRequired}
                  onChange={(e) => setDraftRequired(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                />
                <span>{t("jobs.wizard.questionRequiredToggle")}</span>
              </label>
            </div>

            {isChoiceType && (
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  {t("jobs.wizard.questionOptionsLabel")}
                </label>
                <Textarea
                  rows={3}
                  value={draftOptionsText}
                  onChange={(e) => setDraftOptionsText(e.target.value)}
                  placeholder={t("jobs.wizard.questionOptionsHint")}
                  className="text-xs bg-background resize-none"
                />
                <p className="text-[11px] text-muted-foreground">
                  {t("jobs.wizard.questionOptionsHint")}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetEditor}
                className="h-8 text-xs cursor-pointer"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveEditor}
                disabled={!isDraftValid}
                className="h-8 text-xs cursor-pointer"
              >
                {editingId
                  ? t("jobs.wizard.saveQuestionAction")
                  : t("jobs.wizard.addQuestionAction")}
              </Button>
            </div>
          </div>
        )}

        {!isEditorOpen && screeningQuestions.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openAddEditor}
            className="h-9 text-xs font-medium gap-1.5 w-full sm:w-auto cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />
            {t("jobs.wizard.addQuestionAction")}
          </Button>
        )}
      </div>

      {/* Bottom Step 2 Actions */}
      <div className="flex items-center justify-between pt-2">
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

      {/* Paste Existing Questions Modal */}
      <FormModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        onSubmit={handleImportPaste}
        title={t("jobs.wizard.pasteModalTitle")}
        description={t("jobs.wizard.pasteModalDesc")}
        icon={<ClipboardPaste className="h-4 w-4 text-primary" />}
        size="md"
        submitDisabled={parsedPasteLines.length === 0}
        submitLabel={t("jobs.wizard.pasteModalImportBtn", {
          count: parsedPasteLines.length,
        })}
      >
        <Textarea
          rows={6}
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder={t("jobs.wizard.pasteModalPlaceholder")}
          className="text-xs bg-background"
          autoFocus
        />
      </FormModal>

      {/* Screening Question Templates Modal */}
      <FormModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        onSubmit={(e) => {
          e.preventDefault();
          setIsTemplatesModalOpen(false);
        }}
        title={t("jobs.wizard.questionTemplatesTitle")}
        description={t("jobs.wizard.questionTemplatesDesc")}
        icon={<BookOpen className="h-4 w-4 text-primary" />}
        size="md"
        footer={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsTemplatesModalOpen(false)}
            className="text-xs cursor-pointer"
          >
            {t("common.close")}
          </Button>
        }
      >
        <div className="space-y-2.5">
          {templatePresets.map((preset, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border bg-background"
            >
              <div className="space-y-1 min-w-0">
                <p className="text-xs font-medium text-foreground">
                  {preset.text}
                </p>
                <span className="inline-flex px-2 py-0.5 rounded bg-muted text-[10px] font-medium text-muted-foreground">
                  {t(`jobs.wizard.questionTypes.${preset.type}`)}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  onAddQuestion(preset);
                  setIsTemplatesModalOpen(false);
                }}
                className="h-7 px-2.5 text-xs gap-1 shrink-0 cursor-pointer"
              >
                <Plus className="h-3 w-3" aria-hidden="true" />
                {t("jobs.wizard.addQuestionAction")}
              </Button>
            </div>
          ))}
        </div>
      </FormModal>
    </div>
  );
}
