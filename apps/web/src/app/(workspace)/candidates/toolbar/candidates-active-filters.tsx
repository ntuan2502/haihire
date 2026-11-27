"use client";

import { X, RotateCcw } from "lucide-react";
import { useI18n } from "@/i18n";
import type { Job } from "@/types";

export interface CandidatesActiveFiltersProps {
  jobs: Job[];
  selectedJobId: string;
  hasSecondaryFilters: boolean;
  onClearJobFilter: () => void;
  onResetAllFilters: () => void;
}

export function CandidatesActiveFilters({
  jobs,
  selectedJobId,
  hasSecondaryFilters,
  onClearJobFilter,
  onResetAllFilters,
}: CandidatesActiveFiltersProps) {
  const { t } = useI18n();

  if (!hasSecondaryFilters) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
      <span className="text-muted-foreground font-medium text-[11px]">
        {t("common.filter")}:
      </span>
      {selectedJobId !== "ALL" && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground border border-border text-xs font-medium max-w-full">
          <span className="truncate">
            {jobs.find((j) => j.id === selectedJobId)?.title || selectedJobId}
          </span>
          <button
            type="button"
            onClick={onClearJobFilter}
            className="hover:text-foreground cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </span>
      )}
      <button
        type="button"
        onClick={onResetAllFilters}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-muted-foreground hover:text-foreground text-xs font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <RotateCcw className="h-3 w-3" aria-hidden="true" />
        <span>{t("jobs.resetAll")}</span>
      </button>
    </div>
  );
}
