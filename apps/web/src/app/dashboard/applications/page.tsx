"use client";

import { Suspense, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { AuthGuard } from "@/components/shared/auth-guard";
import { PageHeader } from "@/components/shared/page-header";
import { Navbar } from "@/components/layout";
import { useAuth } from "@/context/auth-context";
import {
  useAllJobs,
  useApplications,
  useApplicationStats,
  useCandidates,
} from "@/hooks/use-queries";
import { ApplicationsDataTable } from "@/components/applications/applications-data-table";
import { useTableParams } from "@/hooks/use-table-params";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { useI18n } from "@/i18n";

function ApplicationsPageContent() {
  const router = useRouter();
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

  const { data: candidatesData } = useCandidates(user?.organizationId);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Navbar */}
      <Navbar
        activeTab="applications"
        onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
        jobsCount={jobs.length}
        candidatesCount={candidatesData?.total || 0}
      />

      {/* Main Content */}
      <main
        id="main-content"
        className="flex-1 mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 space-y-5"
      >
        <PageHeader
          title={t("applications.title")}
          badge={applicationsData?.total ?? 0}
          icon={FileText}
          bordered
        />

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
      </main>
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <ApplicationsPageContent />
      </Suspense>
    </AuthGuard>
  );
}
