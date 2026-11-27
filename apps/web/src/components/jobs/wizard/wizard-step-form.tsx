"use client";

import {
  useId,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SCREENING_QUESTION_TYPES } from "@haihire/shared";
import Link from "next/link";
import {
  AlignLeft,
  Brain,
  Calendar,
  Check,
  CheckSquare,
  Circle,
  CircleDot,
  ClipboardPaste,
  FileText,
  FileUp,
  GripVertical,
  Hash,
  Link2,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Square,
  ToggleLeft,
  Trash2,
  X,
} from "lucide-react";
import { useLocalization } from "@/components/providers/localization-provider";
import { CustomSelect } from "@/components/shared";
import { FormModal } from "@/components/shared/form-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useAiStatusQuery,
  useGenerateScreeningQuestionsMutation,
} from "@/hooks/use-ai-setting-queries";
import { useHasPermission } from "@/hooks/use-has-permission";
import { getApiErrorMessage } from "@/lib/api-error";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import type {
  ApplicationFormFieldMode,
  ScreeningQuestion,
  ScreeningQuestionType,
} from "./types";

const MAX_QUESTION_OPTIONS = 20;

const QUESTION_TYPE_ICONS: Record<ScreeningQuestionType, typeof AlignLeft> = {
  short_text: AlignLeft,
  long_text: FileText,
  single_choice: CircleDot,
  multiple_choice: CheckSquare,
  number: Hash,
  date: Calendar,
  url: Link2,
  yes_no: ToggleLeft,
  file_upload: FileUp,
};

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
      className="grid grid-cols-3 w-full sm:w-auto sm:inline-flex rounded-lg bg-muted p-0.5 border border-border shrink-0"
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
              "px-3 py-1 rounded-md text-xs font-medium text-center transition-colors cursor-pointer",
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

interface SortableScreeningQuestionItemProps {
  question: ScreeningQuestion;
  index: number;
  isEditing: boolean;
  typeLabel: string;
  mandatoryLabel: string;
  optionalLabel: string;
  dragLabel: string;
  editLabel: string;
  deleteLabel: string;
  editorContent: ReactNode;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableScreeningQuestionItem({
  question,
  index,
  isEditing,
  typeLabel,
  mandatoryLabel,
  optionalLabel,
  dragLabel,
  editLabel,
  deleteLabel,
  editorContent,
  onEdit,
  onDelete,
}: SortableScreeningQuestionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id, disabled: isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isEditing) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        data-testid={`screening-question-item-${question.id}`}
      >
        {editorContent}
      </div>
    );
  }

  const TypeIcon = QUESTION_TYPE_ICONS[question.type];
  const visibleOptions = question.options?.slice(0, 4) ?? [];
  const hiddenOptionsCount = Math.max(0, (question.options?.length ?? 0) - 4);

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`screening-question-item-${question.id}`}
      className={cn(
        "group flex items-start gap-2.5 sm:gap-3 p-3.5 rounded-xl border border-border bg-background transition-colors",
        "hover:border-border/90 hover:bg-muted/20",
        isDragging && "opacity-60 shadow-md ring-1 ring-primary/35 z-10",
      )}
    >
      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={dragLabel}
          title={dragLabel}
          className="p-1 -ml-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted cursor-grab active:cursor-grabbing touch-none transition-colors"
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground tabular-nums">
          {index + 1}
        </span>
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-sm font-medium text-foreground leading-snug break-words">
          {question.text}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium text-muted-foreground">
            <TypeIcon className="h-3 w-3" aria-hidden="true" />
            {typeLabel}
          </span>
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold",
              question.required
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            {question.required ? mandatoryLabel : optionalLabel}
          </span>
        </div>

        {visibleOptions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {visibleOptions.map((opt, optIdx) => (
              <span
                key={`${question.id}-opt-${optIdx}`}
                className="inline-flex items-center px-2 py-0.5 rounded-md border border-border/70 bg-muted/30 text-[11px] text-muted-foreground max-w-full sm:max-w-[180px] truncate"
                title={opt}
              >
                {opt}
              </span>
            ))}
            {hiddenOptionsCount > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted text-[11px] font-medium text-muted-foreground">
                {`+${hiddenOptionsCount}`}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onEdit}
          aria-label={editLabel}
          title={editLabel}
          className="h-8 w-8 sm:h-7 sm:w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={deleteLabel}
          title={deleteLabel}
          className="h-8 w-8 sm:h-7 sm:w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

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
    <div
      data-testid="screening-question-editor"
      className="rounded-xl border border-primary/35 bg-card shadow-sm ring-1 ring-primary/10 overflow-hidden"
    >
      {/* Editor Header */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2.5 bg-muted/35 border-b border-border/70">
        <span className="text-xs font-semibold text-foreground">
          {editingId
            ? t("jobs.wizard.editQuestionTitle")
            : t("jobs.wizard.newQuestionTitle")}
        </span>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">
              {t("jobs.wizard.questionRequiredToggle")}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={draftRequired}
              aria-label={t("jobs.wizard.questionRequiredToggle")}
              onClick={() => setDraftRequired((prev) => !prev)}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors cursor-pointer",
                draftRequired ? "bg-primary" : "bg-muted-foreground/30",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-xs transition-transform",
                  draftRequired ? "translate-x-4" : "translate-x-0",
                )}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={resetEditor}
            aria-label={t("common.cancel")}
            title={t("common.cancel")}
            className="h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="p-4 space-y-4">
        <div>
          <label
            htmlFor={questionInputId}
            className="block text-xs font-medium text-foreground mb-1.5"
          >
            {t("jobs.wizard.questionPromptLabel")}
          </label>
          <Input
            id={questionInputId}
            type="text"
            placeholder={t("jobs.wizard.placeholders.screeningQuestion")}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            className="h-9 text-sm bg-background"
            autoFocus
          />
        </div>

        <div>
          <span className="block text-xs font-medium text-foreground mb-1.5">
            {t("jobs.wizard.questionTypeLabel")}
          </span>
          <CustomSelect
            value={draftType}
            onChange={(val) =>
              handleSelectDraftType(val as ScreeningQuestionType)
            }
            options={questionTypeOptions}
            aria-label={t("jobs.wizard.questionTypeLabel")}
          />
          {draftType === "file_upload" && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <FileUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{t("jobs.wizard.resumeCvDesc")}</span>
            </p>
          )}
        </div>

        {isChoiceType && (
          <div className="space-y-2.5 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
              <span className="text-xs font-medium text-foreground">
                {t("jobs.wizard.questionOptionsLabel")}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {t("jobs.wizard.questionOptionsHint")}
              </span>
            </div>

            <div className="space-y-2">
              {draftOptions.map((opt, idx) => {
                const OptionMarker =
                  draftType === "single_choice" ? Circle : Square;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <OptionMarker
                      className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0"
                      aria-hidden="true"
                    />
                    <Input
                      type="text"
                      value={opt}
                      onChange={(e) => handleChangeOption(idx, e.target.value)}
                      onKeyDown={(e) => handleOptionInputKeyDown(e, idx)}
                      placeholder={t("jobs.wizard.optionPlaceholder", {
                        index: idx + 1,
                      })}
                      className="h-8 text-xs bg-background"
                    />
                    {draftOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOptionRow(idx)}
                        aria-label={t("jobs.wizard.removeOption")}
                        title={t("jobs.wizard.removeOption")}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {draftOptions.length < MAX_QUESTION_OPTIONS && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddOptionRow}
                className="h-8 text-xs text-primary hover:text-primary hover:bg-primary/8 gap-1.5 px-2.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                {t("jobs.wizard.addOptionAction")}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Editor Footer */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 bg-muted/20 border-t border-border/70">
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
          className="h-8 text-xs gap-1.5 cursor-pointer"
        >
          {editingId ? (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {editingId
            ? t("jobs.wizard.saveQuestionAction")
            : t("jobs.wizard.addQuestionAction")}
        </Button>
      </div>
    </div>
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
      <div className="space-y-4 bg-card text-card-foreground p-4 sm:p-6 rounded-xl border border-border shadow-xs">
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

        {/* Inline Add New Question Editor */}
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

      {/* Generate Screening Questions with AI Modal */}
      <FormModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onSubmit={handleConfirmAiSuggestions}
        title={t("jobs.wizard.aiModalTitle")}
        description={t("jobs.wizard.aiModalDesc")}
        icon={<Sparkles className="h-4 w-4 text-primary" />}
        size="md"
        footer={
          isQuestionsAiEnabled && aiSuggestions.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void runAiGeneration()}
                disabled={generateAiMutation.isPending}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                {t("jobs.wizard.aiRegenerateBtn")}
              </Button>
              <div className="flex flex-wrap items-center gap-2 ml-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAiModalOpen(false)}
                  className="h-8 text-xs cursor-pointer"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={selectedAiIndices.length === 0}
                  className="h-8 text-xs gap-1.5 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("jobs.wizard.aiAddSelectedBtn", {
                    count: selectedAiIndices.length,
                  })}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAiModalOpen(false)}
              className="text-xs cursor-pointer"
            >
              {t("common.close")}
            </Button>
          )
        }
      >
        {!isQuestionsAiEnabled ? (
          <div className="py-4 text-center space-y-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-primary">
              <Brain className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">
                {t("jobs.wizard.aiNotConfiguredTitle")}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                {t("jobs.wizard.aiNotConfiguredDesc")}
              </p>
            </div>
            {canManageIntegrations && (
              <Link
                href="/settings/integrations/ai"
                className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 h-8 text-xs font-semibold hover:bg-primary/90 transition-colors"
              >
                {t("jobs.wizard.aiOpenSettingsBtn")}
              </Link>
            )}
          </div>
        ) : generateAiMutation.isPending ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2.5 text-center">
            <Loader2
              className="h-6 w-6 animate-spin text-primary"
              aria-hidden="true"
            />
            <p className="text-xs text-muted-foreground">
              {t("jobs.wizard.aiGenerating")}
            </p>
          </div>
        ) : aiError ? (
          <div className="space-y-3">
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs"
            >
              {aiError}
            </div>
            {hasJobDetailsForAi && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void runAiGeneration()}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                {t("jobs.wizard.aiRegenerateBtn")}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {aiSuggestions.map((item, idx) => {
              const isChecked = selectedAiIndices.includes(idx);
              return (
                <label
                  key={idx}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    isChecked
                      ? "border-primary/50 bg-primary/5"
                      : "border-border bg-background hover:bg-muted/30",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleAiSuggestion(idx)}
                    className="mt-0.5 h-4 w-4 rounded border-input accent-primary cursor-pointer shrink-0"
                  />
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-medium text-foreground leading-snug">
                      {item.text}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex px-2 py-0.5 rounded bg-muted text-[10px] font-medium text-muted-foreground">
                        {t(`jobs.wizard.questionTypes.${item.type}`)}
                      </span>
                      <span className="inline-flex px-2 py-0.5 rounded bg-muted text-[10px] font-medium text-muted-foreground">
                        {item.required
                          ? t("jobs.wizard.mandatoryBadge")
                          : t("jobs.wizard.optionalBadge")}
                      </span>
                    </div>
                    {item.options && item.options.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {item.options.map((opt, optIdx) => (
                          <span
                            key={optIdx}
                            className="px-1.5 py-0.5 rounded border border-border/70 bg-muted/30 text-[10px] text-muted-foreground"
                          >
                            {opt}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </FormModal>
    </div>
  );
}
