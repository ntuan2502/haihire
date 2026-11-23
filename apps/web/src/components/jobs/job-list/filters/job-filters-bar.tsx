"use client";

import { SlidersHorizontal, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/shared/search-input";
import { SegmentedTabs } from "@/components/shared/segmented-tabs";
import { ColumnPicker } from "@/components/shared/column-picker";
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
    <div className="space-y-3">
      {/* Modern Unified Responsive Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Quick Status Tabs */}
        <SegmentedTabs
          multiSelect
          tabs={statusTabs}
          activeTabs={statusFilters}
          onToggleTab={onToggleStatusTab}
          onClearAll={onClearStatusTabs}
        />

        {/* Right: Search Box + Columns Dropdown + Filters Button */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <div className="flex-1 min-w-[180px] sm:w-64 md:w-72 sm:flex-initial">
            <SearchInput
              placeholder={t("jobs.searchJobs")}
              aria-label={t("jobs.searchJobs")}
              value={search}
              onChange={onSearchChange}
            />
          </div>

          <ColumnPicker
            columns={[
              {
                key: "title",
                label: t("jobs.columns.title"),
                checked: visibleColumns.title,
                disabled: true,
              },
              {
                key: "pipeline",
                label: t("jobs.columns.pipeline"),
                checked: visibleColumns.pipeline,
              },
              {
                key: "status",
                label: t("jobs.columns.status"),
                checked: visibleColumns.status,
              },
            ]}
            onToggle={(key) => onToggleColumn(key as keyof VisibleColumns)}
            label={t("common.columns")}
            menuTitle={t("jobs.toggleColumns")}
            align="end"
          />

          {/* Filters Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenFiltersDrawer}
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
          {typeFilters.map((tf) => (
            <span
              key={tf}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground border border-border text-xs font-medium"
            >
              <span>{getJobTypeLabel(tf, t)}</span>
              <button
                type="button"
                onClick={() => onToggleFilter("type", typeFilters, tf)}
                className="hover:text-foreground hover:bg-accent cursor-pointer p-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                title={t("common.removeFilter")}
                aria-label={t("common.removeSpecificFilter", {
                  label: getJobTypeLabel(tf, t),
                })}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
          {expFilters.map((ef) => (
            <span
              key={ef}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground border border-border text-xs font-medium"
            >
              <span>{getExperienceLevelLabel(ef, t)}</span>
              <button
                type="button"
                onClick={() => onToggleFilter("exp", expFilters, ef)}
                className="hover:text-foreground hover:bg-accent cursor-pointer p-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                title={t("common.removeFilter")}
                aria-label={t("common.removeSpecificFilter", {
                  label: getExperienceLevelLabel(ef, t),
                })}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
          {workplaceFilters.map((wf) => (
            <span
              key={wf}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground border border-border text-xs font-medium"
            >
              <span>{getWorkplaceLabel(wf, t)}</span>
              <button
                type="button"
                onClick={() =>
                  onToggleFilter("workplace", workplaceFilters, wf)
                }
                className="hover:text-foreground hover:bg-accent cursor-pointer p-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                title={t("common.removeFilter")}
                aria-label={t("common.removeSpecificFilter", {
                  label: getWorkplaceLabel(wf, t),
                })}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-muted-foreground hover:text-foreground text-xs font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            <span>{t("jobs.resetAll")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
