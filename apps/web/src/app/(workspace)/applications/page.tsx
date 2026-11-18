"use client";

import { Suspense, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import {
  useAllJobs,
  useApplications,
  useApplicationStats,
} from "@/hooks/use-queries";
import { ApplicationsDataTable } from "@/components/applications/applications-data-table";
import { useTableParams } from "@/hooks/use-table-params";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { useI18n } from "@/i18n";

function ApplicationsPageContent() {
  const { user } = useAuth();
  const { t } = useI18n();
  const {
    page: currentPage,
    limit: rowsPerPage,
    search,
    setSearch,
    setPage: setCurrentPage,
    setLimit: setRowsPerPage,
    getParam,
    setParams,
  } = useTableParams();

  const stage = getParam("stage", "");
  const jobId = getParam("jobId", "");

  const { data: jobs = [], isLoading: jobsLoading } = useAllJobs(
    user?.organizationId,
  );

  const { data: applicationsData, isLoading: appsLoading } = useApplications({
    organizationId: user?.organizationId,
    page: currentPage,
    limit: rowsPerPage,
    search: search.trim() || undefined,
    stage: stage || undefined,
    jobId: jobId || undefined,
  });

  const { data: appStats } = useApplicationStats(user?.organizationId);

  const stageCounts = useMemo(() => {
    return {
      ALL: appStats?.totalApplications ?? 0,
      APPLIED: appStats?.byStage.APPLIED ?? 0,
      SCREENING: appStats?.byStage.SCREENING ?? 0,
      INTERVIEW: appStats?.byStage.INTERVIEW ?? 0,
      OFFER: appStats?.byStage.OFFER ?? 0,
      HIRED: appStats?.byStage.HIRED ?? 0,
      REJECTED: appStats?.byStage.REJECTED ?? 0,
    };
  }, [appStats]);

  return (
    <div className="flex-1 w-full p-4 sm:p-6 space-y-4">
      {/* Clean, Non-redundant Header Row (min-h-9 sm:h-9 aligns height with views having CTA button) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-h-9 sm:h-9">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            {t("applications.title")}
          </h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary text-secondary-foreground border border-border">
            {applicationsData?.total ?? 0}
          </span>
        </div>

        {/* Spacer matching the 36px CTA button height of other views to prevent vertical jump */}
        <div className="hidden sm:block h-9" aria-hidden="true" />
      </div>

      <ApplicationsDataTable
        applications={applicationsData?.data || []}
        jobs={jobs}
        loading={jobsLoading || appsLoading}
        totalCount={applicationsData?.total ?? 0}
        totalPages={applicationsData?.totalPages ?? 1}
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        search={search}
        stageFilter={stage}
        jobFilter={jobId}
        stageCounts={stageCounts}
        onPageChange={setCurrentPage}
        onLimitChange={setRowsPerPage}
        onSearchChange={setSearch}
        onStageFilterChange={(newStage) =>
          setParams({ stage: newStage || null, page: 1 })
        }
        onJobFilterChange={(newJobId) =>
          setParams({ jobId: newJobId || null, page: 1 })
        }
      />
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <ApplicationsPageContent />
    </Suspense>
  );
}
