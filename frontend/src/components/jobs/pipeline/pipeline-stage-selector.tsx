"use client";

import { Maximize2, Minimize2, Menu } from "lucide-react";
import type { ApplicationStage } from "@/types";
import type { StageConfig } from "@/lib/stages";
import { useI18n } from "@/i18n";

interface PipelineStageSelectorProps {
  stages: StageConfig[];
  stageCounts: Record<string, number>;
  selectedStage: ApplicationStage;
  onSelectStage: (stage: ApplicationStage) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isListCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function PipelineStageSelector({
  stages,
  stageCounts,
  selectedStage,
  onSelectStage,
  isFullscreen,
  onToggleFullscreen,
  isListCollapsed,
  onToggleCollapse,
}: PipelineStageSelectorProps) {
  const { t } = useI18n();

  return (
    <div className="shrink-0 border-b border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xs px-4 py-2 sm:px-6 flex items-center justify-between gap-4 overflow-x-auto scrollbar-none z-10">
      {/* Stage Pills */}
      <div className="flex items-center gap-2">
        {stages.map((stage) => {
          const count = stageCounts[stage.id] || 0;
          const isSelected = selectedStage === stage.id;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => onSelectStage(stage.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer whitespace-nowrap ${
                isSelected
                  ? stage.activePill
                  : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${stage.dotColor}`} />
              <span>{stage.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isSelected
                    ? stage.pillBadge
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Right side tools */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden md:flex h-7 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={isListCollapsed ? t("common.expand") : t("common.collapse")}
        >
          <Menu className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">
            {isListCollapsed ? t("common.expand") : t("common.collapse")}
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleFullscreen}
          className="h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={isFullscreen ? t("common.exitFullscreen") : t("common.fullscreen")}
        >
          {isFullscreen ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
