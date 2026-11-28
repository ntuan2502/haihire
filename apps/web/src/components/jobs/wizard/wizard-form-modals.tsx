"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import {
  Brain,
  ClipboardPaste,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { FormModal } from "@/components/shared/form-modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import type { ScreeningQuestion } from "./types";

export function WizardPasteQuestionsModal({
  isOpen,
  onClose,
  pasteText,
  setPasteText,
  parsedCount,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  pasteText: string;
  setPasteText: (v: string) => void;
  parsedCount: number;
  onSubmit: (e: FormEvent) => void;
}) {
  const { t } = useI18n();

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={onSubmit}
      title={t("jobs.wizard.pasteModalTitle")}
      description={t("jobs.wizard.pasteModalDesc")}
      icon={<ClipboardPaste className="h-4 w-4 text-primary" />}
      size="md"
      submitDisabled={parsedCount === 0}
      submitLabel={t("jobs.wizard.pasteModalImportBtn", {
        count: parsedCount,
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
  );
}

export function WizardAiQuestionsModal({
  isOpen,
  onClose,
  onSubmit,
  isQuestionsAiEnabled,
  canManageIntegrations,
  isGenerating,
  aiError,
  hasJobDetailsForAi,
  aiSuggestions,
  selectedAiIndices,
  onToggleSuggestion,
  onRegenerate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  isQuestionsAiEnabled: boolean;
  canManageIntegrations: boolean;
  isGenerating: boolean;
  aiError: string | null;
  hasJobDetailsForAi: boolean;
  aiSuggestions: Array<Omit<ScreeningQuestion, "id">>;
  selectedAiIndices: number[];
  onToggleSuggestion: (index: number) => void;
  onRegenerate: () => void;
}) {
  const { t } = useI18n();

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={onSubmit}
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
              onClick={onRegenerate}
              disabled={isGenerating}
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
                onClick={onClose}
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
            onClick={onClose}
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
      ) : isGenerating ? (
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
              onClick={onRegenerate}
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
                  onChange={() => onToggleSuggestion(idx)}
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
  );
}
