"use client";

import { useRef, useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import {
  CalendarDays,
  List,
  Columns3,
  SlidersHorizontal,
  RotateCcw,
  X,
} from "lucide-react";
import { SearchInput } from "@/components/shared/search-input";
import { SegmentedTabs } from "@/components/shared/segmented-tabs";
import type { Job } from "@/types";

export type ViewMode = "table" | "calendar";
export type SortOption = "upcoming" | "newest" | "name";

export interface InterviewsFilterBarProps {
  // Segmented Tabs
  tabs: Array<{ id: string; label: string; count?: number }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;

  // View Mode
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;

  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;

  // Columns (Table view only)
  visibleColumns: {
    candidate: boolean;
    job: boolean;
    schedule: boolean;
    interviewer: boolean;
    status: boolean;
    rating: boolean;
  };
  onToggleColumn: (
    columnId:
      "candidate" | "job" | "schedule" | "interviewer" | "status" | "rating",
  ) => void;

  // Filter Drawer & Chips
  onOpenFilterDrawer: () => void;
  selectedJobFilter: string;
  sortBy: SortOption;
  jobs: Job[];
  onResetFilters: () => void;
  onClearJobFilter: () => void;
  onClearSortFilter: () => void;
}

export function InterviewsFilterBar({
  tabs,
  activeTab,
  onTabChange,
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  visibleColumns,
  onToggleColumn,
  onOpenFilterDrawer,
  selectedJobFilter,
  sortBy,
  jobs,
  onResetFilters,
  onClearJobFilter,
  onClearSortFilter,
}: InterviewsFilterBarProps) {
  const { t } = useI18n();
  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const columnsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        columnsRef.current &&
        !columnsRef.current.contains(event.target as Node)
      ) {
        setIsColumnsOpen(false);
      }
    }
    if (isColumnsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isColumnsOpen]);

  const secondaryFiltersCount =
    (selectedJobFilter !== "ALL" ? 1 : 0) + (sortBy !== "upcoming" ? 1 : 0);
  const hasSecondaryFilters = secondaryFiltersCount > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Quick Status Tabs using SegmentedTabs */}
        <SegmentedTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={onTabChange}
        />

        {/* Right: View Mode Switcher + Search Box + Columns Dropdown + Filters Button */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto">
          {/* View Mode Switcher (Table / Calendar) */}
          <div className="flex items-center p-0.5 rounded-lg bg-muted border border-border shrink-0">
            <button
              type="button"
              onClick={() => onViewModeChange("table")}
              className={`h-8 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-card text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={t("interviews.tableTitle")}
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("interviews.table")}</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("calendar")}
              className={`h-8 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                viewMode === "calendar"
                  ? "bg-card text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={t("interviews.calendarTitle")}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {t("interviews.calendar")}
              </span>
            </button>
          </div>

          {/* Search Input */}
          <div className="flex-1 sm:w-64 md:w-72 sm:flex-initial">
            <SearchInput
              placeholder={t("interviews.searchPlaceholder")}
              aria-label={t("interviews.searchPlaceholder")}
              value={searchQuery}
              onChange={onSearchChange}
            />
          </div>

          {/* Columns Dropdown (Table View Only) */}
          {viewMode === "table" && (
            <div className="relative shrink-0" ref={columnsRef}>
              <button
                type="button"
                onClick={() => setIsColumnsOpen((prev) => !prev)}
                className={`h-9 px-3 rounded-md border border-input bg-background text-xs font-semibold text-foreground hover:bg-accent hover:text-accent-foreground shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors ${
                  isColumnsOpen ? "ring-2 ring-ring/20 border-ring" : ""
                }`}
              >
                <Columns3 className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{t("common.columns")}</span>
              </button>

              {isColumnsOpen && (
                <div className="absolute right-0 mt-1.5 w-44 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl p-2 z-50">
                  <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase select-none">
                    {t("interviews.toggleColumns")}
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {[
                      {
                        id: "candidate" as const,
                        label: t("interviews.columns.candidate"),
                        locked: true,
                      },
                      {
                        id: "job" as const,
                        label: t("interviews.columns.job"),
                      },
                      {
                        id: "schedule" as const,
                        label: t("interviews.columns.schedule"),
                      },
                      {
                        id: "interviewer" as const,
                        label: t("interviews.columns.interviewer"),
                      },
                      {
                        id: "status" as const,
                        label: t("interviews.columns.status"),
                      },
                      {
                        id: "rating" as const,
                        label: t("interviews.columns.rating"),
                      },
                    ].map((col) => {
                      const isChecked = visibleColumns[col.id];
                      const isLocked = col.locked;
                      return (
                        <label
                          key={col.id}
                          className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs font-semibold select-none transition-colors ${
                            isLocked
                              ? "opacity-60 cursor-not-allowed text-muted-foreground"
                              : "text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
                          }`}
                        >
                          <input
                            type="checkbox"
                            name={`col-${col.id}`}
                            aria-label={col.label}
                            checked={isChecked}
                            disabled={isLocked}
                            onChange={() => onToggleColumn(col.id)}
                            className="h-3.5 w-3.5 rounded border-input text-primary focus:ring-ring accent-primary cursor-pointer disabled:cursor-not-allowed"
                          />
                          <span>{col.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Filters Button */}
          <button
            type="button"
            onClick={onOpenFilterDrawer}
            className="h-9 px-3.5 rounded-md border border-input bg-background text-xs font-semibold text-foreground flex items-center gap-1.5 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer shadow-xs shrink-0"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{t("common.filter")}</span>
            {secondaryFiltersCount > 0 && (
              <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {secondaryFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      {hasSecondaryFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
          <span className="text-muted-foreground font-medium text-[11px]">
            {t("common.filter")}:
          </span>
          {selectedJobFilter !== "ALL" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground border border-border text-xs font-medium">
              <span>
                {jobs.find((j) => j.id === selectedJobFilter)?.title ||
                  selectedJobFilter}
              </span>
              <button
                type="button"
                onClick={onClearJobFilter}
                className="hover:text-foreground cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {sortBy !== "upcoming" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground border border-border text-xs font-medium">
              <span>
                {sortBy === "newest"
                  ? t("interviews.sortNewest")
                  : t("interviews.sortName")}
              </span>
              <button
                type="button"
                onClick={onClearSortFilter}
                className="hover:text-foreground cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-muted-foreground hover:text-foreground text-xs font-medium cursor-pointer transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span>{t("jobs.resetAll")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
