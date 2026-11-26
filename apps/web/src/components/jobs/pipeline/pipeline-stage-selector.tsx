"use client";

import type { ReactNode } from "react";
import { Maximize2, Minimize2, Menu } from "lucide-react";
import type { ApplicationStage } from "@/types";
import type { StageConfig } from "@/lib/stages";
import { useI18n } from "@/i18n";

interface PipelineStageSelectorProps {
  stages: StageConfig[];
  stageCounts: Record<string, number>;
  selectedStage: ApplicationStage;
  onSelectStage: (stage: ApplicationStage) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  isListCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onDropCandidate?: (
    candidateId: string,
    fromStage: ApplicationStage,
    toStage: ApplicationStage,
  ) => void;
  extraActions?: ReactNode;
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
  onDropCandidate,
  extraActions,
}: PipelineStageSelectorProps) {
  const { t } = useI18n();

  return (
    <div className="shrink-0 border-b border-border bg-card/80 backdrop-blur-xs px-4 py-2 sm:px-6 flex items-center justify-between gap-4 overflow-x-auto scrollbar-none z-10">
      {/* Stage Pills */}
      <div className="flex items-center gap-2">
        {stages.map((stage) => {
          const count = stageCounts[stage.id] || 0;
          const isSelected = selectedStage === stage.id;
          return (
            <button
              key={stage.id}
              data-testid={`stage-pill-${stage.id}`}
              type="button"
              onClick={() => onSelectStage(stage.id)}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                try {
                  const raw = e.dataTransfer.getData("application/json");
                  if (!raw) return;
                  const parsed = JSON.parse(raw);
                  if (parsed.id && parsed.stage && onDropCandidate) {
                    onDropCandidate(parsed.id, parsed.stage, stage.id);
                  }
                } catch {
                  // Ignore
                }
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 border transition-colors cursor-pointer whitespace-nowrap ${
                isSelected
                  ? stage.activePill
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${stage.dotColor}`} />
              <span>{stage.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  isSelected
                    ? stage.pillBadge
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {(extraActions || (onToggleCollapse && onToggleFullscreen)) && (
        <div className="flex items-center gap-2 shrink-0">
          {extraActions}
          {onToggleCollapse && onToggleFullscreen && (
            <>
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden md:flex h-7 px-2.5 rounded-md border border-input bg-background text-xs font-medium text-muted-foreground items-center gap-1.5 hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                title={
                  isListCollapsed ? t("common.expand") : t("common.collapse")
                }
              >
                <Menu className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">
                  {isListCollapsed ? t("common.expand") : t("common.collapse")}
                </span>
              </button>

              <button
                type="button"
                onClick={onToggleFullscreen}
                className="h-7 w-7 rounded-md border border-input bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                title={
                  isFullscreen
                    ? t("common.exitFullscreen")
                    : t("common.fullscreen")
                }
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
