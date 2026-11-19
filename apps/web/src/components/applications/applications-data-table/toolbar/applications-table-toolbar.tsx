"use client";

import { SlidersHorizontal, X, RotateCcw } from "lucide-react";
import { SearchInput } from "@/components/shared/search-input";
import { SegmentedTabs } from "@/components/shared/segmented-tabs";
import { ColumnPicker } from "@/components/shared/column-picker";
import type { Job } from "@/types";
import { useI18n } from "@/i18n";

interface ApplicationsTableToolbarProps {
  stageTabs: Array<{ id: string; label: string; count?: number }>;
  stageFilters: string[];
  toggleStage: (stageId: string) => void;
  handleClearStages: () => void;
  search: string;
  onSearchChangeHandler: (val: string) => void;
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
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <div className="flex-1 min-w-[180px] sm:w-64 md:w-72 sm:flex-initial">
            <SearchInput
              placeholder={t("applications.searchApplications")}
              aria-label={t("applications.searchApplications")}
              value={search}
              onChange={onSearchChangeHandler}
            />
          </div>

          <ColumnPicker
            columns={[
              {
                key: "candidate",
                label: t("applications.columns.candidate"),
                checked: visibleColumns.candidate,
                disabled: true,
              },
              {
                key: "email",
                label: t("applications.columns.email"),
                checked: visibleColumns.email,
              },
              {
                key: "job",
                label: t("applications.columns.job"),
                checked: visibleColumns.job,
              },
              {
                key: "status",
                label: t("applications.columns.status"),
                checked: visibleColumns.status,
              },
              {
                key: "score",
                label: t("applications.columns.score"),
                checked: visibleColumns.score,
              },
              {
                key: "applied",
                label: t("applications.columns.applied"),
                checked: visibleColumns.applied,
              },
            ]}
            onToggle={(key) =>
              toggleColumn(
                key as keyof ApplicationsTableToolbarProps["visibleColumns"],
              )
            }
            label={t("common.columns")}
            menuTitle={t("applications.columnsToggle")}
            align="end"
          />

          {/* Filters Button */}
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className="h-9 px-3.5 rounded-md border border-input bg-background text-xs font-semibold text-foreground flex items-center gap-1.5 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer shadow-xs shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <SlidersHorizontal
              className="h-3.5 w-3.5 text-muted-foreground"
              aria-hidden="true"
            />
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
          {!fixedJobId && currentJobFilter !== "ALL" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground border border-border text-xs font-medium">
              <span>
                {jobs.find((j) => j.id === currentJobFilter)?.title ||
                  currentJobFilter}
              </span>
              <button
                type="button"
                onClick={() => setJobFilter("ALL")}
                aria-label={`${t("common.delete")} ${jobs.find((j) => j.id === currentJobFilter)?.title || currentJobFilter} ${t("common.filter")}`}
                className="hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          )}
          {scoreFilter !== "ALL" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground border border-border text-xs font-medium">
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
                className="hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-muted-foreground hover:text-foreground text-xs font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            <span>{t("jobs.resetAll")}</span>
          </button>
        </div>
      )}
    </>
  );
}
