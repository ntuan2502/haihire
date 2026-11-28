"use client";

import type { KeyboardEvent } from "react";
import type { AlignLeft } from "lucide-react";
import { Check, Circle, FileUp, Plus, Square, X } from "lucide-react";
import { CustomSelect } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import type { ScreeningQuestionType } from "./types";
import { MAX_QUESTION_OPTIONS } from "./wizard-form-question-item";

interface WizardQuestionEditorCardProps {
  questionInputId: string;
  editingId: string | null;
  draftText: string;
  setDraftText: (val: string) => void;
  draftType: ScreeningQuestionType;
  onSelectDraftType: (nextType: ScreeningQuestionType) => void;
  draftRequired: boolean;
  setDraftRequired: (updater: (prev: boolean) => boolean) => void;
  draftOptions: string[];
  onChangeOption: (index: number, value: string) => void;
  onRemoveOptionRow: (index: number) => void;
  onAddOptionRow: () => void;
  onOptionInputKeyDown: (
    e: KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => void;
  questionTypeOptions: Array<{
    value: ScreeningQuestionType;
    label: string;
    icon: typeof AlignLeft;
  }>;
  isChoiceType: boolean;
  isDraftValid: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export function WizardQuestionEditorCard({
  questionInputId,
  editingId,
  draftText,
  setDraftText,
  draftType,
  onSelectDraftType,
  draftRequired,
  setDraftRequired,
  draftOptions,
  onChangeOption,
  onRemoveOptionRow,
  onAddOptionRow,
  onOptionInputKeyDown,
  questionTypeOptions,
  isChoiceType,
  isDraftValid,
  onCancel,
  onSave,
}: WizardQuestionEditorCardProps) {
  const { t } = useI18n();

  return (
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
            onClick={onCancel}
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
            onChange={(val) => onSelectDraftType(val as ScreeningQuestionType)}
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
                      onChange={(e) => onChangeOption(idx, e.target.value)}
                      onKeyDown={(e) => onOptionInputKeyDown(e, idx)}
                      placeholder={t("jobs.wizard.optionPlaceholder", {
                        index: idx + 1,
                      })}
                      className="h-8 text-xs bg-background"
                    />
                    {draftOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => onRemoveOptionRow(idx)}
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
                onClick={onAddOptionRow}
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
          onClick={onCancel}
          className="h-8 text-xs cursor-pointer"
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onSave}
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
}
