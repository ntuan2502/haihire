"use client";

import type { ApplicationStage } from "@/types";
import { useStageInfo } from "@/lib/stages";

export interface StageBadgeProps {
  stage?: ApplicationStage | string | null;
  className?: string;
}

export function StageBadge({ stage, className = "" }: StageBadgeProps) {
  const stageInfo = useStageInfo(stage);
  return (
    <span
      className={`px-2 py-0.5 rounded-md text-xs font-medium border shrink-0 ${stageInfo.badgeBg} ${className}`}
    >
      {stageInfo.label}
    </span>
  );
}
