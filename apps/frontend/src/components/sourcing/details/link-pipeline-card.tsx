"use client";

import { useI18n } from "@/i18n";
import type { PipelineStageBreakdown } from "@haihire/shared";
import { useStageInfo } from "@/lib/stages";
import type { ApplicationStage } from "@/types";
import { GitCommit } from "lucide-react";

interface LinkPipelineCardProps {
  breakdown: PipelineStageBreakdown[];
  totalApplications: number;
}

function PipelineStageRow({ item }: { item: PipelineStageBreakdown }) {
  // Normalize stage string if it's "NEW" to "APPLIED"
  const normalizedStage = (
    item.stage === "NEW" ? "APPLIED" : item.stage
  ) as ApplicationStage;
  const stageInfo = useStageInfo(normalizedStage);

  return (
    <div className="space-y-1.5 py-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${stageInfo.dotColor}`} />
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {stageInfo.label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 font-medium">
            {item.percentage}%
          </span>
          <span className="font-bold text-slate-900 dark:text-white w-6 text-right">
            {item.count}
          </span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            item.count > 0 ? stageInfo.barColor : "bg-transparent"
          }`}
          style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
        />
      </div>
    </div>
  );
}

export function LinkPipelineCard({
  breakdown,
  totalApplications,
}: LinkPipelineCardProps) {
  const { t } = useI18n();

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <GitCommit className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {t("sourcing.details.pipelineTitle")}
          </h3>
        </div>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {t("sourcing.details.pipelineTotal", { count: totalApplications })}
        </span>
      </div>

      {/* Stage list */}
      <div className="space-y-2.5 divide-y divide-slate-100/70 dark:divide-slate-800/50">
        {breakdown.map((item) => (
          <PipelineStageRow key={item.stage} item={item} />
        ))}
      </div>
    </div>
  );
}
