"use client";

import { useI18n } from "@/i18n";
import {
  CalendarDays,
  List,
  SlidersHorizontal,
  RotateCcw,
  X,
} from "lucide-react";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { SegmentedTabs } from "@/components/shared/segmented-tabs";
import { ColumnPicker } from "@/components/shared/column-picker";
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

  const isCalendar = viewMode === "calendar";
  const secondaryFiltersCount =
    (selectedJobFilter !== "ALL" ? 1 : 0) +
    (!isCalendar && sortBy !== "upcoming" ? 1 : 0);
  const hasSecondaryFilters = secondaryFiltersCount > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Quick Status Tabs using SegmentedTabs */}
        {!isCalendar && (
          <SegmentedTabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={onTabChange}
          />
        )}

        {/* Right: View Mode Switcher + Search Box + Columns Dropdown + Filters Button */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto lg:ml-auto">
          {/* View Mode Switcher (Table / Calendar) */}
          <div className="h-9 flex items-center p-0.5 rounded-lg bg-muted border border-border shrink-0">
            <button
              type="button"
              onClick={() => onViewModeChange("table")}
              className={`h-full px-2.5 rounded-md flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-card text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={t("interviews.tableTitle")}
            >
              <List className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{t("interviews.table")}</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("calendar")}
              className={`h-full px-2.5 rounded-md flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "calendar"
                  ? "bg-card text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={t("interviews.calendarTitle")}
            >
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">
                {t("interviews.calendar")}
              </span>
            </button>
          </div>

          {/* Search Input */}
          <div className="flex-1 min-w-[160px] sm:w-64 md:w-72 sm:flex-initial">
            <SearchInput
              placeholder={t("interviews.searchPlaceholder")}
              aria-label={t("interviews.searchPlaceholder")}
              value={searchQuery}
              onChange={onSearchChange}
            />
          </div>

          {/* Columns Dropdown (Table View Only) */}
          {viewMode === "table" && (
            <ColumnPicker
              columns={[
                {
                  key: "candidate",
                  label: t("interviews.columns.candidate"),
                  checked: visibleColumns.candidate,
                  disabled: true,
                },
                {
                  key: "job",
                  label: t("interviews.columns.job"),
                  checked: visibleColumns.job,
                },
                {
                  key: "schedule",
                  label: t("interviews.columns.schedule"),
                  checked: visibleColumns.schedule,
                },
                {
                  key: "interviewer",
                  label: t("interviews.columns.interviewer"),
                  checked: visibleColumns.interviewer,
                },
                {
                  key: "status",
                  label: t("interviews.columns.status"),
                  checked: visibleColumns.status,
                },
                {
                  key: "rating",
                  label: t("interviews.columns.rating"),
                  checked: visibleColumns.rating,
                },
              ]}
              onToggle={(key) =>
                onToggleColumn(
                  key as keyof InterviewsFilterBarProps["visibleColumns"],
                )
              }
              label={t("common.columns")}
              menuTitle={t("interviews.toggleColumns")}
              align="end"
            />
          )}

          {/* Filters Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenFilterDrawer}
            className="h-9 px-3.5 text-xs font-semibold gap-1.5 shrink-0 cursor-pointer"
          >
            <SlidersHorizontal
              className="h-3.5 w-3.5 text-muted-foreground"
              aria-hidden="true"
            />
            <span>{t("common.filter")}</span>
            {secondaryFiltersCount > 0 && (
              <span className="h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {secondaryFiltersCount}
              </span>
            )}
          </Button>
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
          {!isCalendar && sortBy !== "upcoming" && (
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
