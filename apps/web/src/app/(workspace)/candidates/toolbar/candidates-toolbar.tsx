"use client";

import { SlidersHorizontal } from "lucide-react";
import {
  SegmentedTabs,
  type TabItem,
} from "@/components/shared/segmented-tabs";
import { SearchInput } from "@/components/shared/search-input";
import { useI18n } from "@/i18n";
import type { Job } from "@/types";
import {
  CandidatesColumnPicker,
  type CandidateVisibleColumns,
} from "./candidates-column-picker";
import { CandidatesActiveFilters } from "./candidates-active-filters";

export interface CandidatesToolbarProps {
  candidateTabs: TabItem[];
  candidateFilter: string[];
  onToggleTab: (filterId: string) => void;
  onClearTabs: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  visibleColumns: CandidateVisibleColumns;
  toggleColumn: (key: keyof CandidateVisibleColumns) => void;
  onOpenFilterDrawer: () => void;
  secondaryFiltersCount: number;
  hasSecondaryFilters: boolean;
  jobs: Job[];
  selectedJobId: string;
  onClearJobFilter: () => void;
  onResetAllFilters: () => void;
}

export function CandidatesToolbar({
  candidateTabs,
  candidateFilter,
  onToggleTab,
  onClearTabs,
  search,
  onSearchChange,
  visibleColumns,
  toggleColumn,
  onOpenFilterDrawer,
  secondaryFiltersCount,
  hasSecondaryFilters,
  jobs,
  selectedJobId,
  onClearJobFilter,
  onResetAllFilters,
}: CandidatesToolbarProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Quick Filter Tabs (Swipeable horizontally on mobile/tablet) */}
        <SegmentedTabs
          multiSelect
          tabs={candidateTabs}
          activeTabs={candidateFilter}
          onToggleTab={onToggleTab}
          onClearAll={onClearTabs}
        />

        {/* Right: Search Box + Columns Dropdown + Filter Button */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto">
          <div className="flex-1 sm:w-64 md:w-72 sm:flex-initial">
            <SearchInput
              placeholder={t("candidates.searchCandidates")}
              aria-label={t("candidates.searchCandidates")}
              value={search}
              onChange={onSearchChange}
            />
          </div>

          {/* Columns Dropdown */}
          <CandidatesColumnPicker
            visibleColumns={visibleColumns}
            toggleColumn={toggleColumn}
          />

          {/* Filters Button */}
          <button
            type="button"
            onClick={onOpenFilterDrawer}
            className="h-9 px-3.5 rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs shrink-0"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
            <span>{t("common.filter")}</span>
            {secondaryFiltersCount > 0 && (
              <span className="h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                {secondaryFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      <CandidatesActiveFilters
        jobs={jobs}
        selectedJobId={selectedJobId}
        hasSecondaryFilters={hasSecondaryFilters}
        onClearJobFilter={onClearJobFilter}
        onResetAllFilters={onResetAllFilters}
      />
    </div>
  );
}
