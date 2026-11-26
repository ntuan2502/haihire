"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  HelpCircle,
  Loader2,
  RefreshCw,
  Settings,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAiStatusQuery } from "@/hooks/use-ai-setting-queries";
import {
  useApplication,
  useTriggerAiScoreMutation,
} from "@/hooks/use-application-queries";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { AiCriterionEvaluation, Application } from "@/types";

export interface AiScoreCardProps {
  application: Application;
  canScore: boolean;
  variant?: "full" | "compact";
}

function getScoreTextColorClass(pct: number): string {
  if (pct >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function getScoreBarColorClass(pct: number): string {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 60) return "bg-amber-500";
  return "bg-rose-500";
}

function getConfidenceTextColorClass(
  level: AiCriterionEvaluation["confidenceLevel"],
): string {
  if (level === "high") return "text-emerald-600 dark:text-emerald-400";
  if (level === "medium") return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

function formatScoredTimestamp(scoredAt: string, locale: string): string {
  return new Date(scoredAt).toLocaleString(locale === "en" ? "en-US" : "vi-VN");
}

function formatCategoryBadge(
  category: AiCriterionEvaluation["category"],
  t: (key: string) => string,
): string {
  if (category === "Experience") return t("jobs.wizard.categories.experience");
  if (category === "Technical") return t("jobs.wizard.categories.technical");
  if (category === "Soft Skills") return t("jobs.wizard.categories.softSkills");
  return t("jobs.wizard.categories.custom");
}

function getUnscoredBodyClassName(isCompact: boolean): string {
  return cn(
    "border-t border-border",
    isCompact ? "-mx-4 px-4 pt-3" : "-mx-5 px-5 pt-3.5",
  );
}

export function AiScoreCard({
  application,
  canScore,
  variant = "full",
}: AiScoreCardProps) {
  const { t, locale } = useI18n();
  const [showQuestions, setShowQuestions] = useState(false);
  const [isCardCollapsed, setIsCardCollapsed] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [pollingActive, setPollingActive] = useState(false);
  const [optimisticPending, setOptimisticPending] = useState(false);
  const prevEvalUpdatedAtRef = useRef<string | null>(null);

  const { data: aiStatus } = useAiStatusQuery();
  const canManageIntegrations = useHasPermission(
    "settings:manage_integrations",
  );
  const scoreMutation = useTriggerAiScoreMutation();

  const propEvaluation = application.aiEvaluation ?? null;
  const propStatus =
    propEvaluation?.status ?? application.aiScoreStatus ?? null;
  const propScore =
    propEvaluation?.overallScore ?? application.matchScore ?? null;
  const propHasScore = typeof propScore === "number";

  const shouldHydrateDetail =
    Boolean(application.id) &&
    (pollingActive ||
      propStatus === "PENDING" ||
      propStatus === "PROCESSING" ||
      (!propEvaluation &&
        (propHasScore ||
          propStatus === "COMPLETED" ||
          propStatus === "FAILED")));

  const isStatusPolling =
    pollingActive || propStatus === "PENDING" || propStatus === "PROCESSING";

  const { data: detailedApplication } = useApplication(
    shouldHydrateDetail ? application.id : null,
    undefined,
    { refetchInterval: isStatusPolling ? 2500 : false },
  );

  const evaluation = detailedApplication?.aiEvaluation ?? propEvaluation;
  const effectiveStatus = optimisticPending
    ? "PENDING"
    : (evaluation?.status ??
      detailedApplication?.aiScoreStatus ??
      application.aiScoreStatus ??
      null);
  const effectiveScore =
    evaluation?.overallScore ??
    detailedApplication?.matchScore ??
    application.matchScore ??
    null;
  const isInFlight =
    effectiveStatus === "PENDING" || effectiveStatus === "PROCESSING";
  const isFailed = effectiveStatus === "FAILED";
  const hasScore = typeof effectiveScore === "number";
  const isUnscored = !hasScore && !isInFlight && !isFailed;
  const isCompact = variant === "compact";
  const isAiEnabled = Boolean(aiStatus?.enabled);
  const criteriaResults = evaluation?.criteriaResults ?? null;

  useEffect(() => {
    setPollingActive(false);
    setOptimisticPending(false);
    prevEvalUpdatedAtRef.current = null;
  }, [application.id]);

  useEffect(() => {
    const detailEval = detailedApplication?.aiEvaluation;
    if (!detailEval) return;

    if (detailEval.status === "PENDING" || detailEval.status === "PROCESSING") {
      if (optimisticPending) {
        setOptimisticPending(false);
      }
      return;
    }

    if (
      (pollingActive || optimisticPending) &&
      (detailEval.status === "COMPLETED" || detailEval.status === "FAILED") &&
      detailEval.updatedAt !== prevEvalUpdatedAtRef.current
    ) {
      setOptimisticPending(false);
      setPollingActive(false);
    }
  }, [detailedApplication?.aiEvaluation, optimisticPending, pollingActive]);

  useEffect(() => {
    setExpandedKeys([]);
  }, [application.id, evaluation?.id, evaluation?.scoredAt]);

  const handleRunScore = async () => {
    prevEvalUpdatedAtRef.current = evaluation?.updatedAt ?? null;
    try {
      await scoreMutation.mutateAsync(application.id);
      setOptimisticPending(true);
      setPollingActive(true);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t, "errors.GENERIC_ERROR"));
    }
  };

  const renderTriggerButton = (label: string, icon: "run" | "rescore") => {
    if (!canScore || !isAiEnabled) return null;
    const isPending = scoreMutation.isPending;
    return (
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={handleRunScore}
        disabled={isPending || isInFlight}
        className="h-8 px-3 text-xs font-medium gap-1.5 cursor-pointer shrink-0"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : icon === "rescore" ? (
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        <span>
          {isPending ? t("applications.aiEvaluation.scoringButton") : label}
        </span>
      </Button>
    );
  };

  if (!canScore && !hasScore && !isInFlight && !isFailed) {
    return null;
  }

  const warningText =
    evaluation?.warningCode === "NO_CV" ||
    evaluation?.warningCode === "CV_UNREADABLE_SCANNED" ||
    evaluation?.warningCode === "CV_TRUNCATED"
      ? t(`applications.aiEvaluation.warnings.${evaluation.warningCode}`)
      : null;

  const legacyBreakdownEntries =
    !criteriaResults && evaluation?.breakdown
      ? ([
          ["skills", evaluation.breakdown.skills],
          ["experience", evaluation.breakdown.experience],
          ["screening", evaluation.breakdown.screening],
          ["presentation", evaluation.breakdown.presentation],
        ] as const)
      : [];

  const allExpanded = Boolean(
    criteriaResults &&
    criteriaResults.length > 0 &&
    criteriaResults.every((item) => expandedKeys.includes(item.key)),
  );

  const toggleExpandAll = () => {
    if (!criteriaResults) return;
    if (allExpanded) {
      setExpandedKeys([]);
    } else {
      setExpandedKeys(criteriaResults.map((item) => item.key));
    }
  };

  const toggleCriterion = (key: string) => {
    setExpandedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  return (
    <div
      data-testid="ai-score-card"
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-xs",
        isCompact ? "p-4 space-y-3" : "p-4 sm:p-5 space-y-4",
      )}
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Brain className="h-4 w-4" aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold text-foreground">
            {t("applications.aiEvaluation.title")}
          </span>

          {isUnscored && (
            <span className="text-xs text-muted-foreground">
              {t("applications.aiEvaluation.notRunYet")}
            </span>
          )}

          {hasScore && (
            <>
              <span className="font-mono tabular-nums text-sm font-bold">
                <span className={getScoreTextColorClass(effectiveScore)}>
                  {effectiveScore}
                </span>
                <span className="text-muted-foreground font-normal text-xs">
                  /100
                </span>
              </span>

              {!isCompact && (
                <div className="h-2 w-24 sm:w-32 bg-muted rounded-full overflow-hidden shrink-0">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-500",
                      getScoreBarColorClass(effectiveScore),
                    )}
                    style={{
                      width: `${Math.max(0, Math.min(100, effectiveScore))}%`,
                    }}
                  />
                </div>
              )}

              {criteriaResults && criteriaResults.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {t("applications.aiEvaluation.criteriaCount", {
                    count: criteriaResults.length,
                  })}
                </span>
              )}
            </>
          )}

          {evaluation?.isStale && (
            <span
              title={t("applications.aiEvaluation.staleHint")}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 shrink-0"
            >
              {t("applications.aiEvaluation.staleBadge")}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 max-w-full">
          {!isCompact &&
            criteriaResults &&
            criteriaResults.length > 0 &&
            !isCardCollapsed && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleExpandAll}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
              >
                <ChevronsUpDown className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {allExpanded
                    ? t("applications.aiEvaluation.collapseAll")
                    : t("applications.aiEvaluation.expandAll")}
                </span>
              </Button>
            )}

          {hasScore &&
            !isInFlight &&
            renderTriggerButton(
              t("applications.aiEvaluation.rescoreButton"),
              "rescore",
            )}

          {isUnscored &&
            (aiStatus && !isAiEnabled
              ? canManageIntegrations && (
                  <Link
                    href="/settings/integrations/ai"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline shrink-0"
                  >
                    <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {t("applications.aiEvaluation.configureAiLink")}
                    </span>
                  </Link>
                )
              : renderTriggerButton(
                  t("applications.aiEvaluation.scoreButton"),
                  "run",
                ))}

          {!isCompact && (hasScore || isUnscored) && (
            <button
              type="button"
              onClick={() => setIsCardCollapsed((prev) => !prev)}
              aria-label={
                isCardCollapsed
                  ? t("applications.aiEvaluation.expandAll")
                  : t("applications.aiEvaluation.collapseAll")
              }
              className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
            >
              {isCardCollapsed ? (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Compact bar */}
      {isCompact && hasScore && (
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500",
              getScoreBarColorClass(effectiveScore),
            )}
            style={{
              width: `${Math.max(0, Math.min(100, effectiveScore))}%`,
            }}
          />
        </div>
      )}

      {/* Pending / Processing State */}
      {isInFlight && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-primary">
          <Loader2
            className="h-3.5 w-3.5 animate-spin shrink-0"
            aria-hidden="true"
          />
          <span>{t("applications.aiEvaluation.scoringInProgress")}</span>
        </div>
      )}

      {/* Failed State */}
      {isFailed && !isInFlight && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <span className="min-w-0 break-words sm:truncate">
            {evaluation?.errorMessage || t("errors.GENERIC_ERROR")}
          </span>
          {renderTriggerButton(
            t("applications.aiEvaluation.retryButton"),
            "rescore",
          )}
        </div>
      )}

      {/* Unscored State */}
      {isUnscored && !isCardCollapsed && (
        <div className={getUnscoredBodyClassName(isCompact)}>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {aiStatus && !isAiEnabled
              ? t("applications.aiEvaluation.notConfiguredHint")
              : t("applications.aiEvaluation.unscoredHint")}
          </p>
        </div>
      )}

      {!isCardCollapsed && (
        <>
          {evaluation?.isStale && !isInFlight && (
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              {t("applications.aiEvaluation.staleHint")}
            </p>
          )}

          {warningText && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200">
              <AlertTriangle
                className="h-3.5 w-3.5 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>{warningText}</span>
            </div>
          )}

          {/* Compact summary & chips */}
          {isCompact && evaluation?.summary && (
            <p className="text-xs text-foreground/90 leading-relaxed">
              {evaluation.summary}
            </p>
          )}

          {isCompact && criteriaResults && criteriaResults.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {criteriaResults.map((crit) => {
                const pct =
                  crit.maxScore > 0
                    ? Math.round((crit.score / crit.maxScore) * 100)
                    : 0;
                return (
                  <span
                    key={crit.key}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-[11px]"
                  >
                    <span className="truncate max-w-[140px] text-foreground">
                      {crit.title}
                    </span>
                    <span
                      className={cn(
                        "font-mono font-semibold tabular-nums",
                        getScoreTextColorClass(pct),
                      )}
                    >
                      {crit.score}/{crit.maxScore}
                    </span>
                  </span>
                );
              })}
            </div>
          )}

          {/* Full View: Per-Criterion Accordion List (matching reference screenshot) */}
          {!isCompact && criteriaResults && criteriaResults.length > 0 && (
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
                      onClick={() => toggleCriterion(item.key)}
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
                            <span
                              className={cn("font-semibold", confidenceColor)}
                            >
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
          )}

          {/* Legacy 4-bucket fallback if historical evaluation has no criteriaResults */}
          {!isCompact && legacyBreakdownEntries.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {legacyBreakdownEntries.map(([key, item]) => (
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
          )}

          {/* Executive Summary in Full Mode */}
          {!isCompact && evaluation?.summary && (
            <div className="rounded-lg border border-border bg-background/50 p-3 space-y-1">
              <div className="text-[11px] font-semibold text-muted-foreground">
                {t("applications.aiEvaluation.summaryLabel")}
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed">
                {evaluation.summary}
              </p>
            </div>
          )}

          {/* Legacy top strengths & gaps when only legacy breakdown exists */}
          {!isCompact &&
            !criteriaResults &&
            ((evaluation?.strengths?.length ?? 0) > 0 ||
              (evaluation?.gaps?.length ?? 0) > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(evaluation?.strengths?.length ?? 0) > 0 && (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                      <span>
                        {t("applications.aiEvaluation.strengthsLabel")}
                      </span>
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
            )}

          {/* Suggested Interview Questions */}
          {!isCompact && (evaluation?.suggestedQuestions?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-border bg-background/60">
              <button
                type="button"
                onClick={() => setShowQuestions((prev) => !prev)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-foreground hover:bg-accent/50 transition-colors cursor-pointer rounded-lg"
              >
                <span className="flex items-center gap-1.5">
                  <HelpCircle
                    className="h-3.5 w-3.5 text-primary"
                    aria-hidden="true"
                  />
                  <span>
                    {t("applications.aiEvaluation.toggleQuestions", {
                      count: evaluation?.suggestedQuestions?.length ?? 0,
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
                  {evaluation?.suggestedQuestions?.map((q, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {q}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Footer: Provider · Model · Timestamp */}
          {evaluation?.modelId && (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground pt-0.5">
              <span>
                {evaluation.provider
                  ? `${evaluation.provider.toLowerCase()} · ${evaluation.modelId}`
                  : t("applications.aiEvaluation.scoredWith", {
                      model: evaluation.modelId,
                    })}
              </span>
              {evaluation.scoredAt && (
                <span>
                  {formatScoredTimestamp(evaluation.scoredAt, locale)}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
