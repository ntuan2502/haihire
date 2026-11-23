"use client";

import { useI18n } from "@/i18n";
import { ArrowUpDown } from "lucide-react";
import {
  FilterDrawer,
  FilterPillGroup,
  CustomSelect,
} from "@/components/shared";
import type { Job } from "@/types";
import type { SortOption, ViewMode } from "./interviews-filter-bar";

export interface InterviewsFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: Job[];
  selectedJobFilter: string;
  onJobFilterChange: (jobId: string) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  totalCandidateCount: number;
  scheduledCount: number;
  awaitingCount: number;
  sortBy: SortOption;
  onSortByChange: (sort: SortOption) => void;
  onResetFilters: () => void;
  viewMode?: ViewMode;
}

export function InterviewsFilterDrawer({
  isOpen,
  onClose,
  jobs,
  selectedJobFilter,
  onJobFilterChange,
  activeTab,
  onTabChange,
  totalCandidateCount,
  scheduledCount,
  awaitingCount,
  sortBy,
  onSortByChange,
  onResetFilters,
  viewMode = "table",
}: InterviewsFilterDrawerProps) {
  const { t } = useI18n();

  const hasActiveFilters =
    selectedJobFilter !== "ALL" ||
    (viewMode !== "calendar" && (activeTab !== "ALL" || sortBy !== "upcoming"));

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
      <div className="space-y-2.5">
        <h4 className="text-xs font-semibold text-foreground">
          {t("applications.filterByJob")}
        </h4>
        <CustomSelect
          value={selectedJobFilter}
          onChange={onJobFilterChange}
          options={[
            { value: "ALL", label: t("interviews.allJobsOption") },
            ...jobs.map((j) => ({
              value: j.id,
              label: j.department ? `${j.title} (${j.department})` : j.title,
            })),
          ]}
          className="w-full"
          triggerClassName="h-9 text-xs font-normal"
        />
      </div>

      {viewMode !== "calendar" && (
        <>
          {/* 2. STATUS TAB PILLS */}
          <FilterPillGroup
            label={t("interviews.tableHeaders.status")}
            options={[
              {
                value: "ALL",
                label: t("interviews.tabAll", {
                  count: totalCandidateCount,
                }),
              },
              {
                value: "UPCOMING",
                label: t("interviews.tabScheduled", {
                  count: scheduledCount,
                }),
              },
              {
                value: "AWAITING",
                label: t("interviews.tabAwaiting", {
                  count: awaitingCount,
                }),
              },
            ]}
            selected={activeTab}
            onToggle={onTabChange}
          />

          {/* 3. SORT BY */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-foreground">
              {t("jobs.sortByUpper")}
            </h4>
            <CustomSelect
              value={sortBy}
              onChange={(val) => onSortByChange(val as SortOption)}
              icon={ArrowUpDown}
              options={[
                { value: "upcoming", label: t("interviews.sortUpcoming") },
                { value: "newest", label: t("interviews.sortNewest") },
                { value: "name", label: t("interviews.sortName") },
              ]}
              className="w-full"
              triggerClassName="h-9 text-xs font-normal"
            />
          </div>
        </>
      )}
    </FilterDrawer>
  );
}
