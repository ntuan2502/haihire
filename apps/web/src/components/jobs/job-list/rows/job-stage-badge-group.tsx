"use client";

import { useRouter } from "next/navigation";
import { usePipelineStages } from "@/lib/stages";
import type { JobStageCounts } from "../types";

export interface JobStageBadgeGroupProps {
  jobId: string;
  counts: JobStageCounts;
}

export function JobStageBadgeGroup({ jobId, counts }: JobStageBadgeGroupProps) {
  const router = useRouter();
  const pipelineStages = usePipelineStages();
  const totalPipeline = counts.total;

  return (
    <div className="space-y-1.5 max-w-md">
      {/* Multi-segment Progress Bar */}
      <div className="h-1.5 w-full rounded-full bg-slate-200/70 dark:bg-slate-800 flex overflow-hidden">
        {pipelineStages.map((stage) => {
          const count = counts.byStage[stage.id] || 0;
          const pct = totalPipeline > 0 ? (count / totalPipeline) * 100 : 0;
          if (pct <= 0) return null;
          return (
            <div
              key={stage.id}
              style={{ width: `${pct}%` }}
              className={`${stage.barColor} h-full`}
              title={`${stage.label}: ${count}`}
            />
          );
        })}
      </div>

      {/* 6 Stage Metric Pills */}
      <div className="grid grid-cols-6 gap-1">
        {pipelineStages.map((stage) => {
          const count = counts.byStage[stage.id] || 0;
          const displayLabel =
            stage.id === "OFFER" && stage.label.includes("Đề nghị")
              ? "Đề nghị"
              : stage.id === "APPLIED" && stage.label.includes("Đã nộp")
                ? "Đã nộp"
                : stage.id === "HIRED" && stage.label.includes("Đã tuyển")
                  ? "Đã tuyển"
                  : stage.label;

          return (
            <button
              type="button"
              key={stage.id}
              onClick={(e) => {
                e.stopPropagation();
                router.push(
                  `/dashboard/jobs/${jobId}/pipeline?stage=${stage.id}`,
                );
              }}
              className={`flex items-center justify-between px-1.5 py-1 rounded-md ${stage.cardBg} border ${stage.cardBorder} cursor-pointer ${stage.cardHover} transition-all hover:scale-[1.02] text-left`}
              title={`${stage.label}: ${count}`}
              aria-label={`${stage.label}: ${count}`}
            >
              <span
                className={`text-[9px] font-semibold ${stage.textColor} opacity-85 truncate mr-0.5`}
              >
                {displayLabel}
              </span>
              <span
                className={`text-[10.5px] font-black ${stage.textColor} shrink-0`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
