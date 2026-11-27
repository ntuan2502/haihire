"use client";

import {
  FilterDrawer,
  FilterPillGroup,
  CustomSelect,
} from "@/components/shared";
import type { Job } from "@/types";
import type { SortField, SortDirection } from "../types";
import { useI18n } from "@/i18n";

interface ApplicationsFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: Job[];
  fixedJobId?: string;
  currentJobFilter: string;
  onJobFilterChange: (val: string) => void;
  scoreFilter: string;
  onScoreFilterChange: (val: string) => void;
  sortField: SortField;
  onSortFieldChange: (val: SortField) => void;
  sortDirection: SortDirection;
  onSortDirectionChange: (val: SortDirection) => void;
  onResetFilters: () => void;
}

export function ApplicationsFilterDrawer({
  isOpen,
  onClose,
  jobs,
  fixedJobId,
  currentJobFilter,
  onJobFilterChange,
  scoreFilter,
  onScoreFilterChange,
  sortField,
  onSortFieldChange,
  sortDirection,
  onSortDirectionChange,
  onResetFilters,
}: ApplicationsFilterDrawerProps) {
  const { t } = useI18n();

  const hasActiveFilters =
    (!fixedJobId && currentJobFilter !== "ALL") ||
    scoreFilter !== "ALL" ||
    sortField !== "applied" ||
    sortDirection !== "desc";

  return (
    <FilterDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={t("applications.filters")}
      description={t("jobs.filterJobsDesc")}
      hasActiveFilters={hasActiveFilters}
      onReset={onResetFilters}
      resetLabel={t("jobs.resetAll")}
      doneLabel={t("jobs.done")}
    >
      {/* 1. FILTER BY JOB */}
      {!fixedJobId && (
        <div className="space-y-2.5">
          <h4 className="text-xs font-semibold text-foreground">
            {t("applications.filterByJob")}
          </h4>
          <CustomSelect
            value={currentJobFilter}
            onChange={onJobFilterChange}
            options={[
              { value: "ALL", label: t("applications.allJobs") },
              ...jobs.map((j) => ({ value: j.id, label: j.title })),
            ]}
            className="w-full"
            triggerClassName="h-9 text-xs font-normal"
          />
        </div>
      )}

      {/* 2. MATCH SCORE RANGE */}
      <FilterPillGroup
        label={t("applications.score")}
        options={[
          { value: "ALL", label: t("applications.scoreFilters.all") },
          { value: "80", label: t("applications.scoreFilters.excellent") },
          { value: "60", label: t("applications.scoreFilters.good") },
          {
            value: "BELOW_60",
            label: t("applications.scoreFilters.review"),
          },
        ]}
        selected={scoreFilter}
        onToggle={onScoreFilterChange}
      />

      {/* 3. SORT BY */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-semibold text-foreground">
          {t("jobs.sortByUpper")}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <CustomSelect
            value={sortField}
            onChange={(val) => onSortFieldChange(val as SortField)}
            options={[
              {
                value: "applied",
                label: t("applications.columns.applied"),
              },
              {
                value: "candidate",
                label: t("applications.columns.candidate"),
              },
              { value: "job", label: t("applications.columns.job") },
              { value: "score", label: t("applications.columns.score") },
            ]}
            className="w-full"
            triggerClassName="h-9 text-xs font-normal"
          />

          <CustomSelect
            value={sortDirection}
            onChange={(val) => onSortDirectionChange(val as SortDirection)}
            options={[
              { value: "desc", label: t("jobs.descending") },
              { value: "asc", label: t("jobs.ascending") },
            ]}
            className="w-full"
            triggerClassName="h-9 text-xs font-normal"
          />
        </div>
      </div>
    </FilterDrawer>
  );
}
