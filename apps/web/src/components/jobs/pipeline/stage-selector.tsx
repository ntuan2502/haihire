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
      const reason =
        !allowed && !isCurrent
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
      <div className={`relative inline-block max-w-full ${className}`}>
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
          className="h-8 w-full max-w-full truncate px-3 rounded-md border border-input bg-background text-xs font-medium text-foreground cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs focus:outline-none focus:ring-2 focus:ring-ring"
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
              className={`h-8 px-3.5 rounded-md text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors ${
                stage.allowed
                  ? `${stage.btnBg} ${stage.btnHover} text-white cursor-pointer disabled:opacity-50`
                  : "bg-muted text-muted-foreground cursor-not-allowed opacity-50 shadow-none border border-border"
              }`}
            >
              <span>{stage.actionLabel}</span>
              <span
                className={`h-4 w-4 rounded-full text-[10px] flex items-center justify-center ${
                  stage.allowed
                    ? "bg-white/20"
                    : "bg-background/80 text-muted-foreground"
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
