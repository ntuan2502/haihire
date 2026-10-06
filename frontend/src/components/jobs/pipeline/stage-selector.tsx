"use client";

import { useMemo } from "react";
import type { ApplicationStage } from "@haihire/shared";
import {
  usePipelineStages,
  canTransition,
  getTransitionDisabledReason,
} from "@/lib/stages";
import { useI18n } from "@/i18n";

export interface StageSelectorProps {
  currentStage: ApplicationStage;
  onSelectStage: (targetStage: ApplicationStage) => void | Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  variant?: "dropdown" | "buttons";
}

/**
 * StageSelector Component
 *
 * Enforces the recruitment workflow state machine in the UI.
 * Prevents invalid stage transitions by filtering / disabling disallowed stages
 * and providing contextual tooltip feedback.
 */
export function StageSelector({
  currentStage,
  onSelectStage,
  disabled = false,
  isLoading = false,
  className = "",
  variant = "dropdown",
}: StageSelectorProps) {
  const { t } = useI18n();
  const pipelineStages = usePipelineStages();

  const stageOptions = useMemo(() => {
    return pipelineStages.map((stage) => {
      const allowed = canTransition(currentStage, stage.id);
      const isCurrent = currentStage === stage.id;
      const reason = !allowed && !isCurrent
        ? getTransitionDisabledReason(currentStage, stage.id, t)
        : "";
      return {
        ...stage,
        allowed,
        isCurrent,
        reason,
      };
    });
  }, [currentStage, pipelineStages, t]);

  const handleStageClick = (targetStage: ApplicationStage) => {
    if (disabled || isLoading) return;
    if (!canTransition(currentStage, targetStage)) {
      return;
    }
    onSelectStage(targetStage);
  };

  if (variant === "dropdown") {
    // In dropdown mode, filter to only valid next stages (excluding current and invalid stages)
    const validNextStages = stageOptions.filter(
      (opt) => !opt.isCurrent && opt.allowed,
    );

    return (
      <div className={`relative inline-block ${className}`}>
        <select
          aria-label={t("pipeline.switchStageHint")}
          value=""
          disabled={disabled || isLoading || validNextStages.length === 0}
          onChange={(e) => {
            const next = e.target.value as ApplicationStage;
            if (next) {
              handleStageClick(next);
            }
          }}
          className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        >
          <option value="" disabled>
            {t("pipeline.switchStageHint")}
          </option>
          {validNextStages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.actionLabel}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // variant === "buttons"
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {stageOptions
        .filter((stage) => !stage.isCurrent)
        .map((stage) => {
          const isButtonDisabled = disabled || isLoading || !stage.allowed;
          return (
            <button
              key={stage.id}
              type="button"
              disabled={isButtonDisabled}
              title={stage.reason || stage.actionLabel}
              onClick={() => handleStageClick(stage.id)}
              className={`h-8 px-3.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors ${
                stage.allowed
                  ? `${stage.btnBg} ${stage.btnHover} text-white cursor-pointer disabled:opacity-50`
                  : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed opacity-50 shadow-none border border-slate-200 dark:border-slate-800"
              }`}
            >
              <span>{stage.actionLabel}</span>
              <span
                className={`h-4 w-4 rounded-full text-[10px] flex items-center justify-center ${
                  stage.allowed ? "bg-white/20" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                }`}
              >
                {stage.stepNumber}
              </span>
            </button>
          );
        })}
    </div>
  );
}
