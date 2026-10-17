"use client";

import type { RefObject } from "react";
import { Columns3, SlidersHorizontal, X } from "lucide-react";
import { SearchInput } from "@/components/shared/search-input";
import { SegmentedTabs } from "@/components/shared/segmented-tabs";
import { useI18n } from "@/i18n";
import {
  getJobTypeLabel,
  getWorkplaceLabel,
  getExperienceLevelLabel,
} from "@/lib/jobs";
import type { VisibleColumns } from "../types";

export interface JobFiltersBarProps {
  statusTabs: Array<{ id: string; label: string; count?: number }>;
  statusFilters: string[];
  onToggleStatusTab: (tabId: string) => void;
  onClearStatusTabs: () => void;
  search: string;
  onSearchChange: (val: string) => void;
  isColumnsOpen: boolean;
  onToggleColumnsOpen: () => void;
  columnsRef: RefObject<HTMLDivElement | null>;
  visibleColumns: VisibleColumns;
  onToggleColumn: (col: keyof VisibleColumns) => void;
  onOpenFiltersDrawer: () => void;
  secondaryFiltersCount: number;
  hasSecondaryFilters: boolean;
  typeFilters: string[];
  expFilters: string[];
  workplaceFilters: string[];
  onToggleFilter: (
    key: "status" | "type" | "exp" | "workplace",
    currentList: string[],
    val: string,
  ) => void;
  onResetFilters: () => void;
}

export function JobFiltersBar({
  statusTabs,
  statusFilters,
  onToggleStatusTab,
  onClearStatusTabs,
  search,
  onSearchChange,
  isColumnsOpen,
  onToggleColumnsOpen,
  columnsRef,
  visibleColumns,
  onToggleColumn,
  onOpenFiltersDrawer,
  secondaryFiltersCount,
  hasSecondaryFilters,
  typeFilters,
  expFilters,
  workplaceFilters,
  onToggleFilter,
  onResetFilters,
}: JobFiltersBarProps) {
  const { t } = useI18n();

  return (
    <>
      {/* Modern Unified Responsive Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Quick Status Tabs */}
        <SegmentedTabs
          multiSelect
          tabs={statusTabs}
          activeTabs={statusFilters}
          onToggleTab={onToggleStatusTab}
          onClearAll={onClearStatusTabs}
        />

        {/* Right: Search Box + Columns Dropdown + Filters Button */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="flex-1 sm:w-64 md:w-72 sm:flex-initial">
            <SearchInput
              placeholder={t("jobs.searchJobs")}
              aria-label={t("jobs.searchJobs")}
              value={search}
              onChange={onSearchChange}
            />
          </div>

          {/* Columns Dropdown (Persisted in localStorage) */}
          <div className="relative shrink-0" ref={columnsRef}>
            <button
              type="button"
              onClick={onToggleColumnsOpen}
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
                  {t("jobs.toggleColumns")}
                </div>
                <div className="space-y-0.5 mt-1">
                  {[
                    {
                      id: "title",
                      label: t("jobs.columns.title"),
                      locked: true,
                    },
                    { id: "status", label: t("jobs.columns.status") },
                    { id: "pipeline", label: t("jobs.columns.pipeline") },
                    { id: "applicants", label: t("jobs.columns.applicants") },
                  ].map((col) => {
                    const isChecked =
                      visibleColumns[col.id as keyof VisibleColumns];
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
                            onToggleColumn(col.id as keyof VisibleColumns)
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
            onClick={onOpenFiltersDrawer}
            className="h-9 px-3.5 rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs shrink-0"
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
          {typeFilters.map((tf) => (
            <span
              key={tf}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60 text-xs font-medium"
            >
              <span>{getJobTypeLabel(tf, t)}</span>
              <button
                type="button"
                onClick={() => onToggleFilter("type", typeFilters, tf)}
                className="hover:text-blue-900 dark:hover:text-blue-100 cursor-pointer p-0.5 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                title="Remove filter"
                aria-label={`${t("common.remove")} ${getJobTypeLabel(tf, t)} ${t("common.filter")}`}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
          {expFilters.map((ef) => (
            <span
              key={ef}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/60 text-xs font-medium"
            >
              <span>{getExperienceLevelLabel(ef, t)}</span>
              <button
                type="button"
                onClick={() => onToggleFilter("exp", expFilters, ef)}
                className="hover:text-indigo-900 dark:hover:text-indigo-100 cursor-pointer p-0.5 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                title="Remove filter"
                aria-label={`${t("common.remove")} ${getExperienceLevelLabel(ef, t)} ${t("common.filter")}`}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
          {workplaceFilters.map((wf) => (
            <span
              key={wf}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200/60 dark:border-teal-900/60 text-xs font-medium"
            >
              <span>{getWorkplaceLabel(wf, t)}</span>
              <button
                type="button"
                onClick={() =>
                  onToggleFilter("workplace", workplaceFilters, wf)
                }
                className="hover:text-teal-900 dark:hover:text-teal-100 cursor-pointer p-0.5 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-500"
                title="Remove filter"
                aria-label={`${t("common.remove")} ${getWorkplaceLabel(wf, t)} ${t("common.filter")}`}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={onResetFilters}
            className="text-xs font-semibold text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 underline cursor-pointer ml-1"
          >
            {t("jobs.resetAll")}
          </button>
        </div>
      )}
    </>
  );
}
