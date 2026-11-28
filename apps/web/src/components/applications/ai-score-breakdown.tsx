"use client";

import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  XCircle,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import type { AiCriterionEvaluation, ApplicationAiEvaluation } from "@/types";
import {
  formatCategoryBadge,
  getConfidenceTextColorClass,
  getScoreBarColorClass,
  getScoreTextColorClass,
} from "./ai-score-helpers";

interface AiScoreCriteriaAccordionProps {
  criteriaResults: AiCriterionEvaluation[];
  expandedKeys: string[];
  onToggleCriterion: (key: string) => void;
}

export function AiScoreCriteriaAccordion({
  criteriaResults,
  expandedKeys,
  onToggleCriterion,
}: AiScoreCriteriaAccordionProps) {
  const { t } = useI18n();

  return (
    <div className="divide-y divide-border rounded-xl border border-border bg-background/40 overflow-hidden">
      {criteriaResults.map((item) => {
        const isOpen = expandedKeys.includes(item.key);
        const pct =
          item.maxScore > 0
            ? Math.round((item.score / item.maxScore) * 100)
            : 0;
        const confidenceColor = getConfidenceTextColorClass(
          item.confidenceLevel,
        );

        return (
          <div key={item.key}>
            <button
              type="button"
              onClick={() => onToggleCriterion(item.key)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-accent/40 transition-colors cursor-pointer"
            >
              <span className="text-xs sm:text-sm font-semibold text-foreground truncate min-w-0">
                {item.title}
              </span>

              <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full border border-border bg-card text-[10px] font-medium text-muted-foreground">
                  {formatCategoryBadge(item.category, t)}
                </span>
                <div className="h-2 w-14 sm:w-24 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      getScoreBarColorClass(pct),
                    )}
                    style={{
                      width: `${Math.max(0, Math.min(100, pct))}%`,
                    }}
                  />
                </div>
                <span
                  className={cn(
                    "text-xs font-bold font-mono tabular-nums min-w-10 text-right",
                    getScoreTextColorClass(pct),
                  )}
                >
                  {item.score}/{item.maxScore}
                </span>
                {isOpen ? (
                  <ChevronUp
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                ) : (
                  <ChevronDown
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
              </div>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 pt-1 space-y-3 bg-card/50 border-t border-border/60">
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {t("applications.aiEvaluation.confidenceLabel")}{" "}
                    <span className={cn("font-semibold", confidenceColor)}>
                      {t(
                        `applications.aiEvaluation.confidenceLevels.${item.confidenceLevel}`,
                      )}{" "}
                      ({item.confidence}%)
                    </span>
                  </span>
                  <span>
                    {t("applications.aiEvaluation.weightLabel", {
                      weight: item.normalizedWeight,
                    })}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("applications.aiEvaluation.evidenceLabel")}
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    {item.evidence}
                  </p>
                </div>

                {item.strengths.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      {t("applications.aiEvaluation.strengthsLabel")}
                    </div>
                    <ul className="space-y-1">
                      {item.strengths.map((str, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-1.5 text-xs text-foreground/90"
                        >
                          <Check
                            className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {item.gaps.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                      {t("applications.aiEvaluation.gapsLabel")}
                    </div>
                    <ul className="space-y-1">
                      {item.gaps.map((gap, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-1.5 text-xs text-foreground/90"
                        >
                          <XCircle
                            className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          <span>{gap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface AiScoreLegacyBreakdownProps {
  entries: ReadonlyArray<readonly [string, { score: number; note: string }]>;
}

export function AiScoreLegacyBreakdown({
  entries,
}: AiScoreLegacyBreakdownProps) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
      {entries.map(([key, item]) => (
        <div
          key={key}
          className="rounded-lg border border-border bg-background/60 p-3 space-y-1.5"
        >
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-foreground truncate">
              {t(`applications.aiEvaluation.criteria.${key}`)}
            </span>
            <span
              className={cn(
                "font-semibold font-mono tabular-nums shrink-0",
                getScoreTextColorClass(item.score),
              )}
            >
              {item.score}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full",
                getScoreBarColorClass(item.score),
              )}
              style={{
                width: `${Math.max(0, Math.min(100, item.score))}%`,
              }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            {item.note}
          </p>
        </div>
      ))}
    </div>
  );
}

export function AiScoreLegacyStrengthsGaps({
  evaluation,
}: {
  evaluation: ApplicationAiEvaluation | null;
}) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {(evaluation?.strengths?.length ?? 0) > 0 && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t("applications.aiEvaluation.strengthsLabel")}</span>
          </div>
          <ul className="space-y-1 text-[11px] text-foreground/90 list-disc pl-4">
            {evaluation?.strengths?.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {(evaluation?.gaps?.length ?? 0) > 0 && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t("applications.aiEvaluation.gapsLabel")}</span>
          </div>
          <ul className="space-y-1 text-[11px] text-foreground/90 list-disc pl-4">
            {evaluation?.gaps?.map((g, idx) => (
              <li key={idx}>{g}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function AiScoreQuestionsToggle({
  questions,
  showQuestions,
  onToggle,
}: {
  questions: string[];
  showQuestions: boolean;
  onToggle: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="rounded-lg border border-border bg-background/60">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-foreground hover:bg-accent/50 transition-colors cursor-pointer rounded-lg"
      >
        <span className="flex items-center gap-1.5">
          <HelpCircle className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span>
            {t("applications.aiEvaluation.toggleQuestions", {
              count: questions.length,
            })}
          </span>
        </span>
        {showQuestions ? (
          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>
      {showQuestions && (
        <ul
          aria-label={t("applications.aiEvaluation.questionsLabel")}
          className="px-4 pb-3 pt-1 space-y-1.5 text-xs text-foreground/90 list-decimal list-inside border-t border-border"
        >
          {questions.map((q, idx) => (
            <li key={idx} className="leading-relaxed">
              {q}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
