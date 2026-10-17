"use client";

import { SlidersHorizontal, X, RotateCcw, Columns3 } from "lucide-react";
import { SearchInput } from "@/components/shared/search-input";
import { SegmentedTabs } from "@/components/shared/segmented-tabs";
import type { Job } from "@/types";
import { useI18n } from "@/i18n";
import { type RefObject } from "react";

interface ApplicationsTableToolbarProps {
  stageTabs: Array<{ id: string; label: string; count?: number }>;
  stageFilters: string[];
  toggleStage: (stageId: string) => void;
  handleClearStages: () => void;
  search: string;
  onSearchChangeHandler: (val: string) => void;
  isColumnsOpen: boolean;
  setIsColumnsOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  columnsRef: RefObject<HTMLDivElement | null>;
  visibleColumns: {
    candidate: boolean;
    email: boolean;
    job: boolean;
    status: boolean;
    score: boolean;
    applied: boolean;
  };
  toggleColumn: (
    col: keyof ApplicationsTableToolbarProps["visibleColumns"],
  ) => void;
  setIsFilterOpen: (val: boolean) => void;
  secondaryFiltersCount: number;
  hasSecondaryFilters: boolean;
  fixedJobId?: string;
  currentJobFilter: string;
  jobs: Job[];
  setJobFilter: (val: string) => void;
  scoreFilter: string;
  setScoreFilter: (val: string) => void;
  handleResetFilters: () => void;
}

export function ApplicationsTableToolbar({
  stageTabs,
  stageFilters,
  toggleStage,
  handleClearStages,
  search,
  onSearchChangeHandler,
  isColumnsOpen,
  setIsColumnsOpen,
  columnsRef,
  visibleColumns,
  toggleColumn,
  setIsFilterOpen,
  secondaryFiltersCount,
  hasSecondaryFilters,
  fixedJobId,
  currentJobFilter,
  jobs,
  setJobFilter,
  scoreFilter,
  setScoreFilter,
  handleResetFilters,
}: ApplicationsTableToolbarProps) {
  const { t } = useI18n();

  return (
    <>
      {/* Modern Unified Responsive Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Quick Stage Tabs with MultiSelect */}
        <SegmentedTabs
          multiSelect
          tabs={stageTabs}
          activeTabs={stageFilters}
          onToggleTab={toggleStage}
          onClearAll={handleClearStages}
        />

        {/* Right: Search Box + Columns Dropdown */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto">
          <div className="flex-1 sm:w-64 md:w-72 sm:flex-initial">
            <SearchInput
              placeholder={t("applications.searchApplications")}
              aria-label={t("applications.searchApplications")}
              value={search}
              onChange={onSearchChangeHandler}
            />
          </div>

          {/* Columns Dropdown */}
          <div className="relative shrink-0" ref={columnsRef}>
            <button
              type="button"
              onClick={() => setIsColumnsOpen((prev) => !prev)}
              className={`h-9 px-3 rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors ${
                isColumnsOpen ? "ring-2 ring-blue-500/20 border-blue-500" : ""
              }`}
            >
              <Columns3
                className="h-3.5 w-3.5 text-slate-500"
                aria-hidden="true"
              />
              <span>{t("common.columns")}</span>
            </button>

            {isColumnsOpen && (
              <div className="absolute right-0 mt-1.5 w-44 rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xl p-2 z-50">
                <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase select-none">
                  {t("applications.columnsToggle")}
                </div>
                <div className="space-y-0.5 mt-1">
                  {[
                    {
                      id: "candidate",
                      label: t("applications.columns.candidate"),
                      locked: true,
                    },
                    { id: "email", label: t("applications.columns.email") },
                    { id: "job", label: t("applications.columns.job") },
                    { id: "status", label: t("applications.columns.status") },
                    { id: "score", label: t("applications.columns.score") },
                    { id: "applied", label: t("applications.columns.applied") },
                  ].map((col) => {
                    const isChecked =
                      visibleColumns[col.id as keyof typeof visibleColumns];
                    const isLocked = col.locked;
                    return (
                      <label
                        key={col.id}
                        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-xl text-xs font-semibold select-none transition-colors ${
                          isLocked
                            ? "opacity-60 cursor-not-allowed text-slate-500 dark:text-slate-400"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer"
                        }`}
                      >
                        <input
                          type="checkbox"
                          name={`col-${col.id}`}
                          aria-label={col.label}
                          checked={isChecked}
                          disabled={isLocked}
                          onChange={() =>
                            toggleColumn(col.id as keyof typeof visibleColumns)
                          }
                          className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <span>{col.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Filters Button */}
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className="h-9 px-3.5 rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <SlidersHorizontal
              className="h-3.5 w-3.5 text-slate-500"
              aria-hidden="true"
            />
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
      {hasSecondaryFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
          <span className="text-slate-400 font-medium text-[11px]">
            {t("common.filter")}:
          </span>
          {!fixedJobId && currentJobFilter !== "ALL" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60 text-xs font-medium">
              <span>
                {jobs.find((j) => j.id === currentJobFilter)?.title ||
                  currentJobFilter}
              </span>
              <button
                type="button"
                onClick={() => setJobFilter("ALL")}
                aria-label={`${t("common.delete")} ${jobs.find((j) => j.id === currentJobFilter)?.title || currentJobFilter} ${t("common.filter")}`}
                className="hover:text-blue-900 dark:hover:text-blue-100 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          )}
          {scoreFilter !== "ALL" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60 text-xs font-medium">
              <span>
                {scoreFilter === "80"
                  ? t("applications.scoreFilters.excellent")
                  : scoreFilter === "60"
                    ? t("applications.scoreFilters.good")
                    : t("applications.scoreFilters.review")}
              </span>
              <button
                type="button"
                onClick={() => setScoreFilter("ALL")}
                aria-label={`${t("common.delete")} ${t("applications.columns.score")} ${t("common.filter")}`}
                className="hover:text-blue-900 dark:hover:text-blue-100 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            <span>{t("jobs.resetAll")}</span>
          </button>
        </div>
      )}
    </>
  );
}
