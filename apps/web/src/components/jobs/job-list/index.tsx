"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/shared/pagination";
import { usePersistedColumns } from "@/hooks/use-persisted-columns";
import { useI18n } from "@/i18n";
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

  // Column Visibility Toggle State persisted in localStorage
  const { columns: visibleColumns, toggleColumn } = usePersistedColumns(
    "haihire_jobs_columns_v1",
    {
      title: true,
      pipeline: true,
      status: true,
    },
  );

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
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card text-card-foreground px-6 py-12 sm:p-16 text-center shadow-xs w-full my-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-4">
            <Search className="h-7 w-7 stroke-[1.5]" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            {t("jobs.noJobsFound")}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-6">
            {t("jobs.noJobsDesc")}
          </p>
          <Button
            onClick={() => {
              setSearch("");
              handleResetFilters();
            }}
            variant="outline"
            className="h-9 px-4 text-xs font-semibold gap-1.5 cursor-pointer"
          >
            {t("jobs.resetAll")}
          </Button>
        </div>
      ) : (
        /* Unified Rich Table View matching Dashboard visual language */
        <div className="rounded-xl border border-border bg-card text-card-foreground overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th scope="col" className="py-3.5 px-5 min-w-[280px]">
                    {t("jobs.jobTitle")}
                  </th>
                  {visibleColumns.pipeline && (
                    <th scope="col" className="py-3.5 px-4 min-w-[340px]">
                      {t("dashboard.hiringPipeline")}
                    </th>
                  )}
                  {visibleColumns.status && (
                    <th scope="col" className="py-3.5 px-4 min-w-[110px]">
                      {t("jobs.status")}
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
              <tbody className="divide-y divide-border">
                {filteredJobs.map((job) => (
                  <JobTableRow
                    key={job.id}
                    job={job}
                    counts={getJobStageCounts(job.id)}
                    visibleColumns={visibleColumns as VisibleColumns}
                    onDeleteJob={onDeleteJob}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="py-3 px-4 sm:px-5 border-t border-border bg-muted/30">
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
