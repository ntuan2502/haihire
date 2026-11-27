"use client";

import { Plus, Trash2 } from "lucide-react";
import { CustomSelect } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n";
import type { ScoringCriterion } from "./types";

export function WizardScoringCriterionCard({
  criterion,
  sharePct,
  onUpdateWeight,
  onRemoveCriterion,
}: {
  criterion: ScoringCriterion;
  sharePct: number;
  onUpdateWeight: (id: string, weight: number) => void;
  onRemoveCriterion: (id: string) => void;
}) {
  const { t } = useI18n();

  const categoryLabel =
    criterion.category === "Experience"
      ? t("jobs.wizard.categories.experience")
      : criterion.category === "Technical"
        ? t("jobs.wizard.categories.technical")
        : criterion.category === "Soft Skills"
          ? t("jobs.wizard.categories.softSkills")
          : t("jobs.wizard.categories.custom");

  const badgeClass =
    criterion.category === "Experience"
      ? "bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400"
      : criterion.category === "Technical"
        ? "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
        : criterion.category === "Soft Skills"
          ? "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
          : "bg-secondary text-secondary-foreground";

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground p-4 sm:p-5 shadow-xs space-y-4 hover:border-ring/40 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground">
            {criterion.title}
          </h3>
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${badgeClass}`}
          >
            {categoryLabel}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onRemoveCriterion(criterion.id)}
          className="text-muted-foreground hover:text-destructive p-1 transition-colors cursor-pointer"
          title={t("jobs.wizard.deleteCriterion")}
          aria-label={`${t("jobs.wizard.deleteCriterion")}: ${criterion.title}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        {criterion.description}
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-foreground">
          <span>{t("jobs.wizard.weightLabel")}</span>
          <span className="font-semibold font-mono tabular-nums text-foreground">
            {criterion.weight} ({sharePct}%)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <input
            id={`criterion-weight-${criterion.id}`}
            name={`weight-${criterion.id}`}
            aria-label={`${t("jobs.wizard.weightLabel")} - ${criterion.title}`}
            type="range"
            min="0"
            max="100"
            step="5"
            value={criterion.weight}
            onChange={(e) =>
              onUpdateWeight(criterion.id, Number(e.target.value))
            }
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground pt-1 border-t border-border">
        <span>
          {t("jobs.wizard.maxScoreLabel")}: {criterion.maxScore}
        </span>
        <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px] text-foreground max-w-full break-all">
          {t("jobs.wizard.keyLabel")}: {criterion.key}
        </span>
      </div>
    </div>
  );
}

export function WizardAddCriterionForm({
  newCriterionTitle,
  setNewCriterionTitle,
  newCriterionDesc,
  setNewCriterionDesc,
  newCriterionCategory,
  setNewCriterionCategory,
  onAddCriterion,
  onCancelAdd,
}: {
  newCriterionTitle: string;
  setNewCriterionTitle: (s: string) => void;
  newCriterionDesc: string;
  setNewCriterionDesc: (s: string) => void;
  newCriterionCategory: "Experience" | "Technical" | "Soft Skills" | "Custom";
  setNewCriterionCategory: (
    c: "Experience" | "Technical" | "Soft Skills" | "Custom",
  ) => void;
  onAddCriterion: () => void;
  onCancelAdd: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="p-4 sm:p-5 rounded-xl border border-border bg-muted/30 space-y-4">
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
                val as "Experience" | "Technical" | "Soft Skills" | "Custom",
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
          onClick={onCancelAdd}
          className="h-8 text-xs cursor-pointer"
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onAddCriterion}
          disabled={!newCriterionTitle.trim()}
          className="h-8 px-3 text-xs font-medium gap-1.5 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t("jobs.wizard.addCriterionAction")}</span>
        </Button>
      </div>
    </div>
  );
}
