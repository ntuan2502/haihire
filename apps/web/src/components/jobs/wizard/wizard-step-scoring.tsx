"use client";

import { useMemo } from "react";
import Link from "next/link";
import { extractPlainTextFromHtml } from "@haihire/shared";
import { ArrowLeft, Loader2, Plus, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useAiStatusQuery,
  useGenerateScoringCriteriaMutation,
} from "@/hooks/use-ai-setting-queries";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/lib/toast";
import type { ScoringCriterion } from "./types";
import {
  WizardAddCriterionForm,
  WizardScoringCriterionCard,
} from "./wizard-scoring-forms";

interface WizardStepScoringProps {
  mode: "create" | "edit";
  jobTitle: string;
  department: string;
  experienceLevel: string;
  workplace: string;
  description: string;
  criteria: ScoringCriterion[];
  autoScoreApplicants: boolean;
  setAutoScoreApplicants: (b: boolean) => void;
  isAddingCriterion: boolean;
  setIsAddingCriterion: (b: boolean) => void;
  newCriterionTitle: string;
  setNewCriterionTitle: (s: string) => void;
  newCriterionDesc: string;
  setNewCriterionDesc: (s: string) => void;
  newCriterionCategory: "Experience" | "Technical" | "Soft Skills" | "Custom";
  setNewCriterionCategory: (
    c: "Experience" | "Technical" | "Soft Skills" | "Custom",
  ) => void;
  onUpdateWeight: (id: string, weight: number) => void;
  onRemoveCriterion: (id: string) => void;
  onClearCriteria: () => void;
  onReplaceCriteria: (criteria: ScoringCriterion[]) => void;
  onAddCriterion: () => void;
  onCancel: () => void;
  onBack: () => void;
  onSkip?: () => void;
  onContinue: () => void;
}

export function WizardStepScoring({
  mode,
  jobTitle,
  department,
  experienceLevel,
  workplace,
  description,
  criteria,
  autoScoreApplicants,
  setAutoScoreApplicants,
  isAddingCriterion,
  setIsAddingCriterion,
  newCriterionTitle,
  setNewCriterionTitle,
  newCriterionDesc,
  setNewCriterionDesc,
  newCriterionCategory,
  setNewCriterionCategory,
  onUpdateWeight,
  onRemoveCriterion,
  onClearCriteria,
  onReplaceCriteria,
  onAddCriterion,
  onCancel,
  onBack,
  onSkip,
  onContinue,
}: WizardStepScoringProps) {
  const { t, locale } = useI18n();
  const { data: aiStatus } = useAiStatusQuery();
  const isCriteriaAiEnabled = Boolean(
    aiStatus?.features?.SCORING_CRITERIA?.enabled ?? aiStatus?.enabled,
  );
  const canManageIntegrations = useHasPermission(
    "settings:manage_integrations",
  );
  const generateMutation = useGenerateScoringCriteriaMutation();

  const totalWeight = useMemo(
    () => criteria.reduce((sum, c) => sum + Math.max(0, c.weight), 0),
    [criteria],
  );

  const handleGenerateWithAi = async () => {
    const plainDesc = extractPlainTextFromHtml(description);
    if (!jobTitle.trim() || !plainDesc) {
      toast.error(t("jobs.wizard.aiMissingJobDetails"));
      return;
    }

    try {
      const res = await generateMutation.mutateAsync({
        title: jobTitle.trim(),
        description,
        ...(department.trim() ? { department: department.trim() } : {}),
        ...(experienceLevel ? { experienceLevel } : {}),
        ...(workplace ? { workplace } : {}),
        language: locale === "en" ? "en" : "vi",
        count: 5,
        existingTitles: [],
      });
      onReplaceCriteria(res.criteria);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t, "errors.GENERIC_ERROR"));
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl font-semibold text-foreground">
              {t("jobs.wizard.scoringTitle")}
            </h1>
            <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground shrink-0">
              {mode === "create"
                ? t("jobs.wizard.compensationOptional")
                : t("jobs.wizard.scoringConfiguredBadge")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("jobs.wizard.scoringDesc")}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isCriteriaAiEnabled ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateWithAi}
              disabled={generateMutation.isPending}
              className="h-8 px-3 text-xs font-medium gap-1.5 cursor-pointer"
            >
              {generateMutation.isPending ? (
                <Loader2
                  className="h-3.5 w-3.5 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Sparkles
                  className="h-3.5 w-3.5 text-primary"
                  aria-hidden="true"
                />
              )}
              <span>
                {generateMutation.isPending
                  ? t("jobs.wizard.generatingCriteria")
                  : t("jobs.wizard.generateCriteriaAiBtn")}
              </span>
            </Button>
          ) : (
            aiStatus &&
            canManageIntegrations && (
              <Link
                href="/settings/integrations/ai"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-primary hover:bg-accent transition-colors"
              >
                <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t("jobs.wizard.aiOpenSettingsBtn")}</span>
              </Link>
            )
          )}
        </div>
      </div>

      {/* Sub-bar: Back, Count & Clear All */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t("jobs.wizard.backToFormOptions")}</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-foreground">
            {criteria.length} {t("jobs.wizard.criteriaConfiguredCount")}
          </span>
          {criteria.length > 0 && (
            <button
              type="button"
              onClick={onClearCriteria}
              className="text-xs font-medium text-destructive hover:underline cursor-pointer"
            >
              {t("jobs.wizard.clearAllCriteria")}
            </button>
          )}
        </div>
      </div>

      {/* Criteria Cards List or Empty State */}
      {criteria.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center space-y-3">
          <Sparkles
            className="h-6 w-6 text-primary mx-auto"
            aria-hidden="true"
          />
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-sm font-semibold text-foreground">
              {t("jobs.wizard.noCriteriaTitle")}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("jobs.wizard.noCriteriaDesc")}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {criteria.map((crit) => {
            const sharePct =
              totalWeight > 0
                ? Math.round((Math.max(0, crit.weight) / totalWeight) * 100)
                : Math.round(100 / criteria.length);
            return (
              <WizardScoringCriterionCard
                key={crit.id}
                criterion={crit}
                sharePct={sharePct}
                onUpdateWeight={onUpdateWeight}
                onRemoveCriterion={onRemoveCriterion}
              />
            );
          })}
        </div>
      )}

      {/* Add Criterion Inline Form */}
      {isAddingCriterion ? (
        <WizardAddCriterionForm
          newCriterionTitle={newCriterionTitle}
          setNewCriterionTitle={setNewCriterionTitle}
          newCriterionDesc={newCriterionDesc}
          setNewCriterionDesc={setNewCriterionDesc}
          newCriterionCategory={newCriterionCategory}
          setNewCriterionCategory={setNewCriterionCategory}
          onAddCriterion={onAddCriterion}
          onCancelAdd={() => {
            setIsAddingCriterion(false);
            setNewCriterionTitle("");
            setNewCriterionDesc("");
          }}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsAddingCriterion(true)}
          className="h-8 px-3 text-xs font-medium gap-1.5 border-dashed w-full sm:w-auto cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          {t("jobs.wizard.addCriterionAction")}
        </Button>
      )}

      {/* Automatically Score Card */}
      <div className="rounded-xl border border-border bg-card text-card-foreground p-4 sm:p-5 shadow-xs">
        <label
          htmlFor="auto-score-applicants-checkbox"
          className="flex items-start gap-3 cursor-pointer"
        >
          <input
            id="auto-score-applicants-checkbox"
            name="autoScoreApplicants"
            aria-label={t("jobs.wizard.autoScoreTitle")}
            type="checkbox"
            checked={autoScoreApplicants}
            onChange={(e) => setAutoScoreApplicants(e.target.checked)}
            className="rounded border-input accent-primary h-4 w-4 mt-0.5"
          />
          <div className="space-y-1">
            <span className="text-xs font-semibold text-foreground">
              {t("jobs.wizard.autoScoreTitle")}
            </span>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t("jobs.wizard.autoScoreDesc")}
            </p>
          </div>
        </label>
      </div>

      {/* Bottom Step 3 Actions */}
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
          {mode === "create" && onSkip && (
            <Button
              type="button"
              variant="ghost"
              onClick={onSkip}
              className="text-xs cursor-pointer"
            >
              {t("jobs.wizard.skipForNow")}
            </Button>
          )}
          <Button
            type="button"
            onClick={onContinue}
            className="text-xs font-semibold px-6 cursor-pointer"
          >
            {t("jobs.wizard.continueToPublish")}
          </Button>
        </div>
      </div>
    </div>
  );
}
