"use client";

import { useState, useRef, useEffect } from "react";
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
  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const columnsRef = useRef<HTMLDivElement>(null);
  const { columns: visibleColumns, toggleColumn } = usePersistedColumns(
    "haihire_jobs_columns_v1",
    {
      title: true,
      pipeline: true,
      status: true,
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
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card text-card-foreground p-12 sm:p-16 text-center shadow-xs w-full my-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-4">
            <Search className="h-8 w-8 stroke-[1.5]" />
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
            size="sm"
            className="cursor-pointer"
          >
            {t("common.cancel")}
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
        </div>
      )}

      {/* Pagination Footer */}
      {filteredJobs.length > 0 && (
        <div className="pt-4 border-t border-border">
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
