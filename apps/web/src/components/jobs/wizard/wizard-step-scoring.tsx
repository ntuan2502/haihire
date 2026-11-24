"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomSelect } from "@/components/shared";
import { useI18n } from "@/i18n";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
import type { ScoringCriterion } from "./types";

interface WizardStepScoringProps {
  mode: "create" | "edit";
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
  onAddCriterion: () => void;
  onCancel: () => void;
  onBack: () => void;
  onSkip?: () => void;
  onContinue: () => void;
}

export function WizardStepScoring({
  mode,
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
  onAddCriterion,
  onCancel,
  onBack,
  onSkip,
  onContinue,
}: WizardStepScoringProps) {
  const { t } = useI18n();

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-semibold text-foreground">
            {t("jobs.wizard.scoringTitle")}
          </h1>
          <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
            {mode === "create"
              ? t("jobs.wizard.compensationOptional")
              : t("jobs.wizard.scoringConfiguredBadge")}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t("jobs.wizard.scoringDesc")}
        </p>
      </div>

      {/* Sub-bar: Back & Configured Badge */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{t("jobs.wizard.backToFormOptions")}</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
            {t("jobs.wizard.writtenByAiBadge")}
          </span>
          <span className="text-xs font-semibold text-foreground">
            {criteria.length} {t("jobs.wizard.criteriaConfiguredCount")}
          </span>
        </div>
      </div>

      {/* Criteria Cards List */}
      <div className="space-y-3.5">
        {criteria.map((crit) => (
          <div
            key={crit.id}
            className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-xs space-y-4 hover:border-ring/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground">
                  {crit.title}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                    crit.category === "Experience"
                      ? "bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400"
                      : crit.category === "Technical"
                        ? "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
                        : crit.category === "Soft Skills"
                          ? "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                          : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {crit.category}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onRemoveCriterion(crit.id)}
                className="text-muted-foreground hover:text-destructive p-1 transition-colors cursor-pointer"
                title={t("jobs.wizard.deleteCriterion")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {crit.description}
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-foreground">
                <span>{t("jobs.wizard.weightLabel")}</span>
                <span className="font-semibold text-foreground">
                  {crit.weight}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  id={`criterion-weight-${crit.id}`}
                  name={`weight-${crit.id}`}
                  aria-label={`${t("jobs.wizard.weightLabel")} - ${crit.title}`}
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={crit.weight}
                  onChange={(e) =>
                    onUpdateWeight(crit.id, Number(e.target.value))
                  }
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1 border-t border-border">
              <span>
                {t("jobs.wizard.maxScoreLabel")}: {crit.maxScore}
              </span>
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px] text-foreground">
                {t("jobs.wizard.keyLabel")}: {crit.key}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Criterion Inline Form */}
      {isAddingCriterion ? (
        <div className="p-5 rounded-xl border border-border bg-muted/30 space-y-4">
          <h4 className="text-xs font-medium text-foreground">
            {t("jobs.wizard.addCustomCriterionTitle")}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-foreground mb-1">
                {t("jobs.wizard.criterionTitleLabel")}
              </label>
              <Input
                type="text"
                placeholder={t("jobs.wizard.placeholders.criterionTitle")}
                value={newCriterionTitle}
                onChange={(e) => setNewCriterionTitle(e.target.value)}
                className="h-9 text-xs bg-background"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-foreground mb-1">
                {t("jobs.wizard.categoryLabel")}
              </label>
              <CustomSelect
                value={newCriterionCategory}
                onChange={(val) =>
                  setNewCriterionCategory(
                    val as
                      "Experience" | "Technical" | "Soft Skills" | "Custom",
                  )
                }
                options={[
                  {
                    value: "Experience",
                    label: t("jobs.wizard.categories.experience"),
                  },
                  {
                    value: "Technical",
                    label: t("jobs.wizard.categories.technical"),
                  },
                  {
                    value: "Soft Skills",
                    label: t("jobs.wizard.categories.softSkills"),
                  },
                  {
                    value: "Custom",
                    label: t("jobs.wizard.categories.custom"),
                  },
                ]}
                className="w-full"
                triggerClassName="w-full h-9 text-xs font-normal bg-background"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-foreground mb-1">
              {t("jobs.wizard.evaluationDescLabel")}
            </label>
            <Textarea
              placeholder={t("jobs.wizard.placeholders.criterionDesc")}
              value={newCriterionDesc}
              onChange={(e) => setNewCriterionDesc(e.target.value)}
              rows={2}
              className="text-xs bg-background"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAddingCriterion(false);
                setNewCriterionTitle("");
                setNewCriterionDesc("");
              }}
              className="h-8 text-xs cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onAddCriterion}
              disabled={!newCriterionTitle.trim()}
              className="h-8 text-xs cursor-pointer"
            >
              {t("jobs.wizard.addCriterionAction")}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsAddingCriterion(true)}
          className="h-10 text-xs font-medium gap-1.5 w-full sm:w-auto cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          {t("jobs.wizard.addCriterionAction")}
        </Button>
      )}

      {/* Automatically Score Card */}
      <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-xs">
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
