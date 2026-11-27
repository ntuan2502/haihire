"use client";

import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlignLeft,
  Calendar,
  CheckSquare,
  CircleDot,
  FileText,
  FileUp,
  GripVertical,
  Hash,
  Link2,
  Pencil,
  ToggleLeft,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ApplicationFormFieldMode,
  ScreeningQuestion,
  ScreeningQuestionType,
} from "./types";

export const MAX_QUESTION_OPTIONS = 20;

export const QUESTION_TYPE_ICONS: Record<
  ScreeningQuestionType,
  typeof AlignLeft
> = {
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

export function FieldModeSegmentedControl({
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

export function SortableScreeningQuestionItem({
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
