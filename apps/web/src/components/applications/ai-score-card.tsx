"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Loader2,
  RefreshCw,
  Settings,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAiStatusQuery } from "@/hooks/use-ai-setting-queries";
import { useTriggerAiScoreMutation } from "@/hooks/use-application-queries";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { Application } from "@/types";

export interface AiScoreCardProps {
  application: Application;
  canScore: boolean;
  variant?: "full" | "compact";
}

function getScoreTextColorClass(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function getScoreBarColorClass(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-rose-500";
}

export function AiScoreCard({
  application,
  canScore,
  variant = "full",
}: AiScoreCardProps) {
  const { t } = useI18n();
  const [showQuestions, setShowQuestions] = useState(false);

  const { data: aiStatus } = useAiStatusQuery();
  const canManageIntegrations = useHasPermission(
    "settings:manage_integrations",
  );
  const scoreMutation = useTriggerAiScoreMutation();

  const evaluation = application.aiEvaluation ?? null;
  const effectiveStatus =
    evaluation?.status ?? application.aiScoreStatus ?? null;
  const effectiveScore =
    evaluation?.overallScore ?? application.matchScore ?? null;
  const isInFlight =
    effectiveStatus === "PENDING" || effectiveStatus === "PROCESSING";
  const isFailed = effectiveStatus === "FAILED";
  const hasScore = typeof effectiveScore === "number";
  const isCompact = variant === "compact";
  const isAiEnabled = Boolean(aiStatus?.enabled);

  const handleRunScore = async () => {
    try {
      await scoreMutation.mutateAsync(application.id);
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
        variant="outline"
        size="sm"
        onClick={handleRunScore}
        disabled={isPending || isInFlight}
        className="h-7 px-2.5 text-xs gap-1.5 cursor-pointer shrink-0"
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        ) : icon === "rescore" ? (
          <RefreshCw className="h-3 w-3" aria-hidden="true" />
        ) : (
          <Sparkles className="h-3 w-3" aria-hidden="true" />
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

  const breakdownEntries = evaluation?.breakdown
    ? ([
        ["skills", evaluation.breakdown.skills],
        ["experience", evaluation.breakdown.experience],
        ["screening", evaluation.breakdown.screening],
        ["presentation", evaluation.breakdown.presentation],
      ] as const)
    : [];

  return (
    <div
      data-testid="ai-score-card"
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-xs",
        isCompact ? "p-4 space-y-3" : "p-5 space-y-4",
      )}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles
            className="h-4 w-4 text-primary shrink-0"
            aria-hidden="true"
          />
          <span className="text-xs font-semibold text-foreground truncate">
            {t("applications.aiEvaluation.title")}
          </span>
          {evaluation?.isStale && (
            <span
              title={t("applications.aiEvaluation.staleHint")}
              className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 shrink-0"
            >
              {t("applications.aiEvaluation.staleBadge")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasScore && (
            <span
              className={cn(
                "text-sm font-semibold font-mono tabular-nums",
                getScoreTextColorClass(effectiveScore),
              )}
            >
              {effectiveScore}%
            </span>
          )}
          {hasScore &&
            !isInFlight &&
            renderTriggerButton(
              t("applications.aiEvaluation.rescoreButton"),
              "rescore",
            )}
        </div>
      </div>

      {/* Progress Bar when score exists */}
      {hasScore && (
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
          <span className="min-w-0 truncate">
            {evaluation?.errorMessage || t("errors.GENERIC_ERROR")}
          </span>
          {renderTriggerButton(
            t("applications.aiEvaluation.retryButton"),
            "rescore",
          )}
        </div>
      )}

      {/* Unscored State */}
      {!hasScore && !isInFlight && !isFailed && (
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {aiStatus && !isAiEnabled ? (
            <>
              <p className="text-xs text-muted-foreground">
                {t("applications.aiEvaluation.notConfiguredHint")}
              </p>
              {canManageIntegrations && (
                <Link
                  href="/settings/integrations/ai"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline shrink-0"
                >
                  <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t("applications.aiEvaluation.configureAiLink")}</span>
                </Link>
              )}
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {t("applications.aiEvaluation.unscoredHint")}
              </p>
              {renderTriggerButton(
                t("applications.aiEvaluation.scoreButton"),
                "run",
              )}
            </>
          )}
        </div>
      )}

      {/* Stale Hint or Warning Banner */}
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

      {/* Summary */}
      {evaluation?.summary && (
        <div className="space-y-1">
          {!isCompact && (
            <div className="text-[11px] font-medium text-muted-foreground">
              {t("applications.aiEvaluation.summaryLabel")}
            </div>
          )}
          <p className="text-xs text-foreground/90 leading-relaxed">
            {evaluation.summary}
          </p>
        </div>
      )}

      {/* Full Variant Breakdown, Strengths/Gaps, Interview Questions */}
      {!isCompact && breakdownEntries.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {breakdownEntries.map(([key, item]) => (
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

      {!isCompact &&
        ((evaluation?.strengths?.length ?? 0) > 0 ||
          (evaluation?.gaps?.length ?? 0) > 0) && (
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
        )}

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

      {evaluation?.modelId && (
        <div className="text-[10px] text-muted-foreground pt-0.5">
          {t("applications.aiEvaluation.scoredWith", {
            model: evaluation.modelId,
          })}
        </div>
      )}
    </div>
  );
}
