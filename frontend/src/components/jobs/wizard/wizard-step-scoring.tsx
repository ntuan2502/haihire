"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomSelect } from "@/components/shared";
import { useI18n } from "@/i18n";
import { ArrowLeft, Sparkles, Trash2, Plus } from "lucide-react";
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("jobs.wizard.scoringTitle")}
          </h1>
          <span className="rounded-md bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400">
            {mode === "create"
              ? t("jobs.wizard.compensationOptional")
              : t("jobs.wizard.scoringConfiguredBadge")}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-3xl">
          {t("jobs.wizard.scoringDesc")}
        </p>
      </div>

      {/* Sub-bar: Back & Configured Badge */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{t("jobs.wizard.backToFormOptions")}</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
            <Sparkles className="h-3 w-3" />
            {t("jobs.wizard.writtenByAiBadge")}
          </span>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {criteria.length} {t("jobs.wizard.criteriaConfiguredCount")}
          </span>
        </div>
      </div>

      {/* Criteria Cards List */}
      <div className="space-y-3.5">
        {criteria.map((crit) => (
          <div
            key={crit.id}
            className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {crit.title}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    crit.category === "Experience"
                      ? "bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400"
                      : crit.category === "Technical"
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                        : crit.category === "Soft Skills"
                          ? "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {crit.category}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onRemoveCriterion(crit.id)}
                className="text-slate-400 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                title={t("jobs.wizard.deleteCriterion")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {crit.description}
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>{t("jobs.wizard.weightLabel")}</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {crit.weight}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={crit.weight}
                  onChange={(e) =>
                    onUpdateWeight(crit.id, Number(e.target.value))
                  }
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <span>
                {t("jobs.wizard.maxScoreLabel")}: {crit.maxScore}
              </span>
              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-600 dark:text-slate-300">
                {t("jobs.wizard.keyLabel")}: {crit.key}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Criterion Inline Form */}
      {isAddingCriterion ? (
        <div className="p-5 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 space-y-4">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            {t("jobs.wizard.addCustomCriterionTitle")}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("jobs.wizard.criterionTitleLabel")}
              </label>
              <Input
                type="text"
                placeholder={t("jobs.wizard.placeholders.criterionTitle")}
                value={newCriterionTitle}
                onChange={(e) => setNewCriterionTitle(e.target.value)}
                className="h-9 text-xs bg-white dark:bg-slate-900"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("jobs.wizard.categoryLabel")}
              </label>
              <CustomSelect
                value={newCriterionCategory}
                onChange={(val) =>
                  setNewCriterionCategory(
                    val as
                      | "Experience"
                      | "Technical"
                      | "Soft Skills"
                      | "Custom",
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
                triggerClassName="w-full h-9 text-xs font-normal bg-white dark:bg-slate-900 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("jobs.wizard.evaluationDescLabel")}
            </label>
            <Textarea
              placeholder={t("jobs.wizard.placeholders.criterionDesc")}
              value={newCriterionDesc}
              onChange={(e) => setNewCriterionDesc(e.target.value)}
              rows={2}
              className="text-xs bg-white dark:bg-slate-900"
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
              className="h-8 text-xs"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onAddCriterion}
              disabled={!newCriterionTitle.trim()}
              className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
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
          className="h-10 text-xs font-bold text-slate-800 dark:text-slate-200 gap-1.5 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          {t("jobs.wizard.addCriterionAction")}
        </Button>
      )}

      {/* Automatically Score Card */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoScoreApplicants}
            onChange={(e) => setAutoScoreApplicants(e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 mt-0.5"
          />
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {t("jobs.wizard.autoScoreTitle")}
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
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
          className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
        >
          {t("common.cancel")}
        </Button>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            {t("jobs.wizard.backAction")}
          </Button>
          {mode === "create" && onSkip && (
            <Button
              type="button"
              variant="ghost"
              onClick={onSkip}
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
            >
              {t("jobs.wizard.skipForNow")}
            </Button>
          )}
          <Button
            type="button"
            onClick={onContinue}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2 rounded-xl shadow-xs cursor-pointer"
          >
            {t("jobs.wizard.continueToPublish")}
          </Button>
        </div>
      </div>
    </div>
  );
}
