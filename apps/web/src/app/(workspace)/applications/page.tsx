"use client";

import { Suspense, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import {
  useAllJobs,
  useApplications,
  useApplicationStats,
} from "@/hooks/use-queries";
import { ApplicationsDataTable } from "@/components/applications/applications-data-table";
import {
  buildStageCounts,
  useApplicationsUrlParams,
} from "@/components/applications/applications-data-table/hooks/use-applications-url-params";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { PageHeader } from "@/components/shared/page-header";
import { useI18n } from "@/i18n";

function ApplicationsPageContent() {
  const { user } = useAuth();
  const { t } = useI18n();
  const urlState = useApplicationsUrlParams();

  const { data: jobs = [], isLoading: jobsLoading } = useAllJobs(
    user?.organizationId,
  );

  const { data: applicationsData, isLoading: appsLoading } = useApplications({
    organizationId: user?.organizationId,
    ...urlState.queryParams,
    jobId: urlState.jobId || undefined,
  });

  const { data: appStats } = useApplicationStats(user?.organizationId);

  const stageCounts = useMemo(
    () =>
      buildStageCounts(
        appStats
          ? {
              total: appStats.totalApplications ?? 0,
              byStage: appStats.byStage,
            }
          : null,
      ),
    [appStats],
  );

  if ((jobsLoading || appsLoading) && !applicationsData) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex-1 w-full p-4 sm:p-6 space-y-4">
      {/* Clean, Non-redundant Header Row */}
      <PageHeader
        title={t("applications.title")}
        badge={applicationsData ? applicationsData.total : undefined}
      />

      <ApplicationsDataTable
        applications={applicationsData?.data || []}
        jobs={jobs}
        loading={jobsLoading || appsLoading}
        totalCount={applicationsData?.total ?? 0}
        totalPages={applicationsData?.totalPages ?? 1}
        currentPage={urlState.currentPage}
        rowsPerPage={urlState.rowsPerPage}
        search={urlState.search}
        stageFilter={urlState.stage}
        jobFilter={urlState.jobId}
        scoreFilter={urlState.score}
        sortField={urlState.sortField}
        sortDirection={urlState.sortDirection}
        selectedAppId={urlState.selectedAppId}
        drawerTab={urlState.drawerTab}
        stageCounts={stageCounts}
        onPageChange={urlState.onPageChange}
        onLimitChange={urlState.onLimitChange}
        onSearchChange={urlState.onSearchChange}
        onStageFilterChange={urlState.onStageFilterChange}
        onJobFilterChange={urlState.onJobFilterChange}
        onScoreFilterChange={urlState.onScoreFilterChange}
        onSortChange={urlState.onSortChange}
        onSelectedAppIdChange={urlState.onSelectedAppIdChange}
        onDrawerTabChange={urlState.onDrawerTabChange}
      />
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ApplicationsPageContent />
    </Suspense>
  );
}
