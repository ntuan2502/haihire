"use client";

import {
  FilterDrawer,
  FilterPillGroup,
  CustomSelect,
} from "@/components/shared";
import { useI18n } from "@/i18n";
import type { Job } from "@/types";
import type {
  SortField,
  SortDirection,
} from "../hooks/use-candidates-filter-sort";

export interface CandidatesFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: Job[];
  selectedJobId: string;
  onJobChange: (jobId: string) => void;
  candidateFilter: string[];
  onToggleFilter: (filterId: string) => void;
  sortField: SortField;
  onSortFieldChange: (field: SortField) => void;
  sortDirection: SortDirection;
  onSortDirectionChange: (dir: SortDirection) => void;
  onResetFilters: () => void;
}

export function CandidatesFilterDrawer({
  isOpen,
  onClose,
  jobs,
  selectedJobId,
  onJobChange,
  candidateFilter,
  onToggleFilter,
  sortField,
  onSortFieldChange,
  sortDirection,
  onSortDirectionChange,
  onResetFilters,
}: CandidatesFilterDrawerProps) {
  const { t } = useI18n();

  const hasActiveFilters =
    selectedJobId !== "ALL" ||
    candidateFilter.length > 0 ||
    sortField !== "added" ||
    sortDirection !== "desc";

  return (
    <FilterDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={t("candidates.filters")}
      description={t("jobs.filterJobsDesc")}
      hasActiveFilters={hasActiveFilters}
      onReset={onResetFilters}
      resetLabel={t("jobs.resetAll")}
      doneLabel={t("jobs.done")}
    >
      {/* 1. FILTER BY JOB */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
          {t("applications.filterByJob")}
        </h4>
        <CustomSelect
          value={selectedJobId}
          onChange={onJobChange}
          options={[
            { value: "ALL", label: t("applications.allJobs") },
            ...jobs.map((j) => ({ value: j.id, label: j.title })),
          ]}
          className="w-full"
          triggerClassName="h-9 text-xs font-normal"
        />
      </div>

      {/* 2. PROFILE STATUS */}
      <FilterPillGroup
        label={t("jobs.statusUpper")}
        options={[
          { value: "WITH_RESUME", label: t("candidates.withCv") },
          {
            value: "HAS_APPLICATIONS",
            label: t("candidates.hasApplications"),
          },
          { value: "UNASSIGNED", label: t("candidates.unassigned") },
        ]}
        selected={candidateFilter}
        onToggle={onToggleFilter}
      />

      {/* 3. SORT BY */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
          {t("jobs.sortByUpper")}
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <CustomSelect
            value={sortField}
            onChange={(val) => onSortFieldChange(val as SortField)}
            options={[
              { value: "added", label: t("candidates.columns.added") },
              { value: "name", label: t("candidates.columns.name") },
              { value: "email", label: t("candidates.columns.email") },
              { value: "phone", label: t("candidates.columns.phone") },
              {
                value: "applications",
                label: t("candidates.columns.applications"),
              },
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
