import { cn } from "@/lib/utils";
import type { AiCriterionEvaluation } from "@/types";

export function getScoreTextColorClass(pct: number): string {
  if (pct >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

export function getScoreBarColorClass(pct: number): string {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 60) return "bg-amber-500";
  return "bg-rose-500";
}

export function getConfidenceTextColorClass(
  level: AiCriterionEvaluation["confidenceLevel"],
): string {
  if (level === "high") return "text-emerald-600 dark:text-emerald-400";
  if (level === "medium") return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

export function formatScoredTimestamp(
  scoredAt: string,
  locale: string,
): string {
  return new Date(scoredAt).toLocaleString(locale === "en" ? "en-US" : "vi-VN");
}

export function formatCategoryBadge(
  category: AiCriterionEvaluation["category"],
  t: (key: string) => string,
): string {
  if (category === "Experience") return t("jobs.wizard.categories.experience");
  if (category === "Technical") return t("jobs.wizard.categories.technical");
  if (category === "Soft Skills") return t("jobs.wizard.categories.softSkills");
  return t("jobs.wizard.categories.custom");
}

export function getUnscoredBodyClassName(isCompact: boolean): string {
  return cn(
    "border-t border-border",
    isCompact ? "-mx-4 px-4 pt-3" : "-mx-5 px-5 pt-3.5",
  );
}
