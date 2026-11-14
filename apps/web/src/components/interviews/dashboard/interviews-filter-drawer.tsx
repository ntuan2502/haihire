"use client";

import { useI18n } from "@/i18n";
import { ArrowUpDown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/shared/custom-select";
import { SlideOver } from "@/components/shared/slide-over";
import type { Job } from "@/types";
import type { SortOption } from "./interviews-filter-bar";

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
}: InterviewsFilterDrawerProps) {
  const { t } = useI18n();

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title={t("applications.filters")}
      description={t("jobs.filterJobsDesc")}
      width="max-w-md"
    >
      <div className="flex flex-col h-full">
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* 1. FILTER BY JOB */}
          <div className="space-y-2.5">
            <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px] block">
              {t("applications.filterByJob")}
            </span>
            <CustomSelect
              value={selectedJobFilter}
              onChange={onJobFilterChange}
              options={[
                { value: "ALL", label: t("interviews.allJobsOption") },
                ...jobs.map((j) => ({
                  value: j.id,
                  label: `${j.title} (${j.department})`,
                })),
              ]}
              className="w-full"
              triggerClassName="h-9 text-xs font-normal bg-white dark:bg-slate-950 rounded-xl"
            />
          </div>

          {/* 2. STATUS TAB PILLS */}
          <div className="space-y-2.5">
            <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px] block">
              {t("interviews.tableHeaders.status")}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                {
                  id: "ALL",
                  label: t("interviews.tabAll", {
                    count: totalCandidateCount,
                  }),
                },
                {
                  id: "UPCOMING",
                  label: t("interviews.tabScheduled", {
                    count: scheduledCount,
                  }),
                },
                {
                  id: "AWAITING",
                  label: t("interviews.tabAwaiting", {
                    count: awaitingCount,
                  }),
                },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    activeTab === item.id
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. SORT BY */}
          <div className="space-y-2.5">
            <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px] block">
              {t("jobs.sortByUpper")}
            </span>
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
              triggerClassName="h-9 text-xs font-normal bg-white dark:bg-slate-950 rounded-xl"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <button
            type="button"
            onClick={onResetFilters}
            className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{t("jobs.resetAll")}</span>
          </button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 px-4 text-xs font-semibold rounded-xl cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onClose}
              className="h-8 px-4 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              {t("jobs.done")}
            </Button>
          </div>
        </div>
      </div>
    </SlideOver>
  );
}
