"use client";

import { Suspense, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Navbar } from "@/components/layout";
import { useAuth } from "@/context/auth-context";
import {
  useAllJobs,
  useApplications,
  useAllApplications,
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

  const { data: allApplications = [] } = useAllApplications(
    user?.organizationId,
  );

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: allApplications.length,
      APPLIED: 0,
      SCREENING: 0,
      INTERVIEW: 0,
      OFFER: 0,
      HIRED: 0,
      REJECTED: 0,
    };
    for (const app of allApplications) {
      if (app.stage && counts[app.stage] !== undefined) {
        counts[app.stage]++;
      }
    }
    return counts;
  }, [allApplications]);

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
        className="flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10 w-full space-y-4"
      >
        {/* Clean, Non-redundant Header Row (min-h-9 sm:h-9 aligns height with views having CTA button) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-h-9 sm:h-9">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {t("applications.title")}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80">
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
