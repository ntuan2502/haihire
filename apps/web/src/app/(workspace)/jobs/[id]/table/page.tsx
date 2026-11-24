"use client";

import { Suspense, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  useJob,
  useAllJobs,
  useApplications,
  useApplicationStats,
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ApplicationsDataTable } from "@/components/applications/applications-data-table";
import {
  buildStageCounts,
  useApplicationsUrlParams,
} from "@/components/applications/applications-data-table/hooks/use-applications-url-params";

function JobTablePageContent() {
  const params = useParams();
  const router = useRouter();
  const rawJobId = params?.id;
  const jobId = Array.isArray(rawJobId) ? rawJobId[0] : (rawJobId as string);
  const urlState = useApplicationsUrlParams({ defaultLimit: 20 });

  const { user } = useAuth();
  const { data: jobs = [] } = useAllJobs(user?.organizationId);
  const { data: job, isLoading: jobLoading } = useJob(jobId);
  const { data: applicationsData, isLoading: appsLoading } = useApplications({
    organizationId: user?.organizationId,
    jobId,
    ...urlState.queryParams,
  });
  const { data: appStats } = useApplicationStats(user?.organizationId);

  const jobStageCounts = useMemo(
    () => buildStageCounts(appStats?.byJob?.[jobId] ?? null),
    [appStats, jobId],
  );

  if (jobLoading || (appsLoading && !applicationsData)) {
    return <LoadingSpinner />;
  }

  if (!job) return null;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 w-full space-y-4">
      <ApplicationsDataTable
        applications={applicationsData?.data || []}
        jobs={jobs}
        loading={jobLoading || appsLoading}
        fixedJobId={job.id}
        totalCount={applicationsData?.total ?? 0}
        totalPages={applicationsData?.totalPages ?? 1}
        currentPage={urlState.currentPage}
        rowsPerPage={urlState.rowsPerPage}
        search={urlState.search}
        stageFilter={urlState.stage}
        scoreFilter={urlState.score}
        sortField={urlState.sortField}
        sortDirection={urlState.sortDirection}
        selectedAppId={urlState.selectedAppId}
        drawerTab={urlState.drawerTab}
        stageCounts={jobStageCounts}
        onPageChange={urlState.onPageChange}
        onLimitChange={urlState.onLimitChange}
        onSearchChange={urlState.onSearchChange}
        onStageFilterChange={urlState.onStageFilterChange}
        onScoreFilterChange={urlState.onScoreFilterChange}
        onSortChange={urlState.onSortChange}
        onSelectedAppIdChange={urlState.onSelectedAppIdChange}
        onDrawerTabChange={urlState.onDrawerTabChange}
        onViewInPipeline={(appId, appStage) => {
          const query = new URLSearchParams({
            stage: appStage,
            applicationId: appId,
          });
          router.push(`/jobs/${jobId}/pipeline?${query.toString()}`);
        }}
      />
    </div>
  );
}

export default function JobTablePage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <JobTablePageContent />
    </Suspense>
  );
}
