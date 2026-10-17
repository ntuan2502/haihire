"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/shared/pagination";
import { usePersistedColumns } from "@/hooks/use-persisted-columns";
import { useI18n } from "@/i18n";
import { getJobPublicUrl } from "@/lib/utils";
import type { Job } from "@/types";
import type { JobListProps, VisibleColumns } from "./types";
import { useJobFilters } from "./hooks/use-job-filters";
import { useJobStageCounts } from "./hooks/use-job-stage-counts";
import { JobFiltersBar } from "./filters/job-filters-bar";
import { JobTableRow } from "./rows/job-table-row";
import { JobFilterDrawer } from "./drawer/job-filter-drawer";

export function JobList(props: JobListProps) {
  const {
    jobs,
    total,
    currentPage = 1,
    totalPages = 1,
    pageSize = 20,
    onPageChange,
    onPageSizeChange,
    onDeleteJob,
  } = props;

  const { t } = useI18n();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);

  // Column Visibility Toggle State persisted in localStorage
  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const columnsRef = useRef<HTMLDivElement>(null);
  const { columns: visibleColumns, toggleColumn } = usePersistedColumns(
    "haihire_jobs_columns_v1",
    {
      title: true,
      status: true,
      pipeline: true,
      applicants: true,
    },
  );

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

  // Filters and stage aggregation hooks
  const {
    search,
    setSearch,
    statusFilters,
    typeFilters,
    expFilters,
    workplaceFilters,
    sortBy,
    sortOrder,
    handleFilterUpdate,
    toggleFilter,
    handleResetFilters,
    secondaryFiltersCount,
    hasSecondaryFilters,
    statusTabs,
    filteredJobs,
  } = useJobFilters(props);

  const { getJobStageCounts } = useJobStageCounts(jobs);

  const handleCopyLink = useCallback((job: Job) => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(
        `${window.location.origin}${getJobPublicUrl(job)}`,
      );
      setCopiedJobId(job.id);
      setTimeout(() => setCopiedJobId(null), 2000);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Modern Unified Responsive Toolbar & Active Filter Chips */}
      <JobFiltersBar
        statusTabs={statusTabs}
        statusFilters={statusFilters}
        onToggleStatusTab={(tabId) =>
          toggleFilter("status", statusFilters, tabId)
        }
        onClearStatusTabs={() => handleFilterUpdate({ status: [] })}
        search={search}
        onSearchChange={setSearch}
        isColumnsOpen={isColumnsOpen}
        onToggleColumnsOpen={() => setIsColumnsOpen((prev) => !prev)}
        columnsRef={columnsRef}
        visibleColumns={visibleColumns as VisibleColumns}
        onToggleColumn={(col) =>
          toggleColumn(col as keyof typeof visibleColumns)
        }
        onOpenFiltersDrawer={() => setIsFilterOpen(true)}
        secondaryFiltersCount={secondaryFiltersCount}
        hasSecondaryFilters={hasSecondaryFilters}
        typeFilters={typeFilters}
        expFilters={expFilters}
        workplaceFilters={workplaceFilters}
        onToggleFilter={toggleFilter}
        onResetFilters={handleResetFilters}
      />

      {/* If No Matching Jobs from Search / Filters */}
      {filteredJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-white p-16 text-center dark:border-slate-800 dark:bg-slate-900 shadow-xs w-full my-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 mb-4">
            <Search className="h-8 w-8 stroke-[1.5]" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {t("jobs.noJobsFound")}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6">
            {t("jobs.noJobsDesc")}
          </p>
          <Button
            onClick={() => {
              setSearch("");
              handleResetFilters();
            }}
            variant="outline"
            className="h-9 text-xs font-semibold px-4 rounded-xl cursor-pointer"
          >
            {t("common.cancel")}
          </Button>
        </div>
      ) : (
        /* Unified Rich Table View matching Dashboard visual language */
        <div className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="py-3.5 px-5 min-w-[280px]">
                    {t("jobs.jobTitle")}
                  </th>
                  {visibleColumns.status && (
                    <th scope="col" className="py-3.5 px-4 min-w-[110px]">
                      {t("jobs.status")}
                    </th>
                  )}
                  {visibleColumns.pipeline && (
                    <th scope="col" className="py-3.5 px-4 min-w-[340px]">
                      {t("dashboard.hiringPipeline")}
                    </th>
                  )}
                  {visibleColumns.applicants && (
                    <th scope="col" className="py-3.5 px-4 min-w-[130px]">
                      {t("jobs.newApplicants")}
                    </th>
                  )}
                  <th
                    scope="col"
                    className="py-3.5 px-5 text-right min-w-[140px]"
                  >
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredJobs.map((job) => (
                  <JobTableRow
                    key={job.id}
                    job={job}
                    counts={getJobStageCounts(job.id)}
                    visibleColumns={visibleColumns as VisibleColumns}
                    copiedJobId={copiedJobId}
                    onCopyLink={handleCopyLink}
                    onDeleteJob={onDeleteJob}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      {filteredJobs.length > 0 && (
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={total !== undefined ? total : filteredJobs.length}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50, 100]}
            onPageChange={(p) => onPageChange?.(p)}
            onPageSizeChange={(size) => onPageSizeChange?.(size)}
            itemLabel={t("nav.jobs").toLowerCase()}
          />
        </div>
      )}

      {/* Filter Sidebar Drawer */}
      <JobFilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        statusFilters={statusFilters}
        typeFilters={typeFilters}
        expFilters={expFilters}
        workplaceFilters={workplaceFilters}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onToggleFilter={toggleFilter}
        onFilterUpdate={handleFilterUpdate}
        onResetFilters={handleResetFilters}
      />
    </div>
  );
}
