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
      <span className="text-slate-400 font-medium text-[11px]">
        {t("common.filter")}:
      </span>
      {selectedJobId !== "ALL" && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60 text-xs font-medium">
          <span>
            {jobs.find((j) => j.id === selectedJobId)?.title || selectedJobId}
          </span>
          <button
            type="button"
            onClick={onClearJobFilter}
            className="hover:text-blue-900 dark:hover:text-blue-100 cursor-pointer"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      )}
      <button
        type="button"
        onClick={onResetAllFilters}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-medium cursor-pointer transition-colors"
      >
        <RotateCcw className="h-3 w-3" />
        <span>{t("jobs.resetAll")}</span>
      </button>
    </div>
  );
}
