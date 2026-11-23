"use client";

import {
  Check,
  HelpCircle,
  ThumbsDown,
  ThumbsUp,
  type LucideIcon,
} from "lucide-react";
import { useI18n, type TranslationKey } from "@/i18n";

export type ScorecardRecommendation =
  "STRONG_YES" | "YES" | "NEUTRAL" | "NO" | "STRONG_NO";

interface RecommendationOption {
  value: ScorecardRecommendation;
  labelKey: TranslationKey;
  descKey: TranslationKey;
  Icon: LucideIcon;
  activeClassName: string;
  textClassName: string;
  checkClassName: string;
}

const RECOMMENDATION_OPTIONS: RecommendationOption[] = [
  {
    value: "STRONG_YES",
    labelKey: "interviews.recommendations.strongYes",
    descKey: "interviews.recommendations.strongYesDesc",
    Icon: ThumbsUp,
    activeClassName:
      "bg-emerald-50/80 border-emerald-500 dark:bg-emerald-950/40 dark:border-emerald-500 ring-2 ring-emerald-500/20",
    textClassName: "text-emerald-700 dark:text-emerald-400",
    checkClassName: "text-emerald-600 dark:text-emerald-400",
  },
  {
    value: "YES",
    labelKey: "interviews.recommendations.yes",
    descKey: "interviews.recommendations.yesDesc",
    Icon: ThumbsUp,
    activeClassName: "bg-primary/10 border-primary ring-2 ring-primary/20",
    textClassName: "text-primary",
    checkClassName: "text-primary",
  },
  {
    value: "NEUTRAL",
    labelKey: "interviews.recommendations.neutral",
    descKey: "interviews.recommendations.neutralDesc",
    Icon: HelpCircle,
    activeClassName:
      "bg-amber-50/80 border-amber-500 dark:bg-amber-950/40 dark:border-amber-500 ring-2 ring-amber-500/20",
    textClassName: "text-amber-700 dark:text-amber-400",
    checkClassName: "text-amber-600 dark:text-amber-400",
  },
  {
    value: "NO",
    labelKey: "interviews.recommendations.no",
    descKey: "interviews.recommendations.noDesc",
    Icon: ThumbsDown,
    activeClassName:
      "bg-rose-50/80 border-rose-500 dark:bg-rose-950/40 dark:border-rose-500 ring-2 ring-rose-500/20",
    textClassName: "text-rose-700 dark:text-rose-400",
    checkClassName: "text-rose-600 dark:text-rose-400",
  },
  {
    value: "STRONG_NO",
    labelKey: "interviews.recommendations.strongNo",
    descKey: "interviews.recommendations.strongNoDesc",
    Icon: ThumbsDown,
    activeClassName:
      "bg-rose-100/90 border-rose-600 dark:bg-rose-950/70 dark:border-rose-500 ring-2 ring-rose-600/25",
    textClassName: "text-rose-800 dark:text-rose-300",
    checkClassName: "text-rose-700 dark:text-rose-300",
  },
];

interface ScorecardRecommendationPickerProps {
  value: ScorecardRecommendation;
  disabled: boolean;
  onChange: (value: ScorecardRecommendation) => void;
}

/**
 * Data-driven 5-option hiring recommendation radio picker for interview scorecards.
 */
export function ScorecardRecommendationPicker({
  value,
  disabled,
  onChange,
}: ScorecardRecommendationPickerProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-2.5">
      <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
        <span>{t("interviews.hiringRecommendation")}</span>
        <span className="text-rose-500">*</span>
      </label>
      <div
        role="radiogroup"
        aria-label={t("interviews.hiringRecommendation")}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5"
      >
        {RECOMMENDATION_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          const Icon = option.Icon;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              aria-pressed={isSelected}
              onClick={() => onChange(option.value)}
              className={`p-3 rounded-xl border text-left transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${
                !disabled ? "cursor-pointer" : "cursor-default opacity-80"
              } ${
                isSelected
                  ? option.activeClassName
                  : "bg-card border-border hover:border-ring/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-bold flex items-center gap-1.5 ${option.textClassName}`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {t(option.labelKey)}
                </span>
                {isSelected && (
                  <Check
                    className={`h-3.5 w-3.5 ${option.checkClassName}`}
                    aria-hidden="true"
                  />
                )}
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {t(option.descKey)}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
