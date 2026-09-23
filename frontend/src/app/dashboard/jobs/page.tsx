"use client";

import { Suspense } from "react";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Navbar } from "@/components/layout";
import { JobList } from "@/components/jobs/job-list";
import { StartRecruiting } from "@/components/dashboard/start-recruiting";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useTableParams } from "@/hooks/use-table-params";
import {
  useJobs,
  useCandidates,
  useCreateJobMutation,
  useDeleteJobMutation,
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

function JobsPageContent() {
  const router = useRouter();
  const { user } = useAuth();

  // Synchronized URL Query State for Pagination & Search
  const {
    page: currentPage,
    limit: rowsPerPage,
    search,
    setSearch,
    setPage: setCurrentPage,
    setLimit: setRowsPerPage,
  } = useTableParams();

  // TanStack Query Hooks with Server-Side Pagination & Search
  const { data: jobsData, isLoading: jobsLoading } = useJobs(
    user?.organizationId,
    {
      page: currentPage,
      limit: rowsPerPage,
      search: search.trim() || undefined,
    },
  );
  const jobs = jobsData?.data ?? [];
  const total = jobsData?.total ?? 0;
  const totalPages = jobsData?.totalPages ?? 1;

  const { data: candidatesData } = useCandidates(user?.organizationId);
  const createJobMutation = useCreateJobMutation();
  const deleteJobMutation = useDeleteJobMutation();

  // Quick action: Create a test job
  const handleCreateTestJob = async () => {
    try {
      await createJobMutation.mutateAsync({
        title: "Senior Full-Stack Engineer (Test Role)",
        department: "Engineering",
        location: "Remote / Hanoi",
        type: "FULL_TIME",
        description:
          "Internal test role for testing applicant pipeline and candidate screening workflow.",
        salaryRange: "$2,500 - $4,000 / month",
        status: "PUBLISHED",
        organizationId: user?.organizationId ?? null,
      });
    } catch (err) {
      console.error("Create test job error", err);
    }
  };

  const handleJobDeleted = (id: string) => {
    deleteJobMutation.mutate(id);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Navbar */}
      <Navbar
        activeTab="jobs"
        onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
        jobsCount={total}
        candidatesCount={candidatesData?.total || 0}
      />

      {/* Main Content */}
      <main className="flex-1">
        {jobsLoading && !jobsData ? (
          <LoadingSpinner />
        ) : total === 0 && currentPage === 1 && !search ? (
          <StartRecruiting
            onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
            onCreateTestJob={handleCreateTestJob}
            onImportFromFile={() => router.push("/dashboard/jobs/new")}
          />
        ) : (
          <div className="w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
            <JobList
              jobs={jobs}
              total={total}
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={rowsPerPage}
              onPageChange={setCurrentPage}
              onPageSizeChange={setRowsPerPage}
              search={search}
              onSearchChange={setSearch}
              loading={jobsLoading}
              onDeleteJob={handleJobDeleted}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default function JobsPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <JobsPageContent />
      </Suspense>
    </AuthGuard>
  );
}
