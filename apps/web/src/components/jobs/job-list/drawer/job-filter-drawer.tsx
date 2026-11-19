"use client";

import {
  FilterDrawer,
  FilterPillGroup,
  CustomSelect,
} from "@/components/shared";
import { useI18n } from "@/i18n";
import type { JobFilterCriteria } from "../types";

export interface JobFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  statusFilters: string[];
  typeFilters: string[];
  expFilters: string[];
  workplaceFilters: string[];
  sortBy: "created" | "title" | "applicants";
  sortOrder: "desc" | "asc";
  onToggleFilter: (
    key: "status" | "type" | "exp" | "workplace",
    currentList: string[],
    val: string,
  ) => void;
  onFilterUpdate: (updates: JobFilterCriteria) => void;
  onResetFilters: () => void;
}

export function JobFilterDrawer({
  isOpen,
  onClose,
  statusFilters,
  typeFilters,
  expFilters,
  workplaceFilters,
  sortBy,
  sortOrder,
  onToggleFilter,
  onFilterUpdate,
  onResetFilters,
}: JobFilterDrawerProps) {
  const { t } = useI18n();

  const hasActiveFilters =
    statusFilters.length > 0 ||
    typeFilters.length > 0 ||
    expFilters.length > 0 ||
    workplaceFilters.length > 0 ||
    sortBy !== "created" ||
    sortOrder !== "desc";

  return (
    <FilterDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={t("jobs.filterJobs")}
      description={t("jobs.filterJobsDesc")}
      hasActiveFilters={hasActiveFilters}
      onReset={onResetFilters}
      resetLabel={t("jobs.resetAll")}
      doneLabel={t("jobs.done")}
    >
      {/* 1. STATUS */}
      <FilterPillGroup
        label={t("jobs.statusUpper")}
        options={[
          { value: "PUBLISHED", label: t("jobs.openStatus") },
          { value: "DRAFT", label: t("jobs.draftStatus") },
          { value: "CLOSED", label: t("jobs.closed") },
        ]}
        selected={statusFilters}
        onToggle={(val) => onToggleFilter("status", statusFilters, val)}
      />

      {/* 2. EMPLOYMENT TYPE */}
      <FilterPillGroup
        label={t("jobs.employmentTypeUpper")}
        options={[
          { value: "FULL_TIME", label: t("jobs.fullTime") },
          { value: "PART_TIME", label: t("jobs.partTime") },
          { value: "CONTRACT", label: t("jobs.contract") },
          { value: "INTERNSHIP", label: t("jobs.internship") },
        ]}
        selected={typeFilters}
        onToggle={(val) => onToggleFilter("type", typeFilters, val)}
      />

      {/* 3. EXPERIENCE LEVEL */}
      <FilterPillGroup
        label={t("jobs.experienceLevelUpper")}
        options={[
          { value: "ENTRY_LEVEL", label: t("jobs.experience.junior") },
          { value: "MID_LEVEL", label: t("jobs.experience.mid") },
          { value: "SENIOR_LEVEL", label: t("jobs.experience.senior") },
          { value: "LEAD", label: t("jobs.experience.lead") },
          { value: "EXECUTIVE", label: t("jobs.experience.executive") },
        ]}
        selected={expFilters}
        onToggle={(val) => onToggleFilter("exp", expFilters, val)}
      />

      {/* 4. WORK ARRANGEMENT */}
      <FilterPillGroup
        label={t("jobs.workArrangementUpper")}
        options={[
          { value: "REMOTE", label: t("jobs.workplace.remote") },
          { value: "HYBRID", label: t("jobs.workplace.hybrid") },
          { value: "ON_SITE", label: t("jobs.workplace.onsite") },
        ]}
        selected={workplaceFilters}
        onToggle={(val) => onToggleFilter("workplace", workplaceFilters, val)}
      />

      {/* 5. SORT BY */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
          {t("jobs.sortByUpper")}
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <CustomSelect
            value={sortBy}
            onChange={(val) =>
              onFilterUpdate({
                sortBy: val as "created" | "title" | "applicants",
              })
            }
            options={[
              { value: "created", label: t("jobs.dateCreated") },
              { value: "title", label: t("jobs.jobTitle") },
              { value: "applicants", label: t("jobs.applicants") },
            ]}
            className="w-full"
            triggerClassName="h-9 text-xs font-normal"
          />

          <CustomSelect
            value={sortOrder}
            onChange={(val) =>
              onFilterUpdate({ sortOrder: val as "desc" | "asc" })
            }
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
