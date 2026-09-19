"use client";

import { useState, Suspense } from "react";
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

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Synchronized URL Query State for Pagination, Search & ViewMode
  const {
    page: currentPage,
    limit: rowsPerPage,
    search,
    setSearch,
    setPage: setCurrentPage,
    setLimit: setRowsPerPage,
    setParam,
    getParam,
  } = useTableParams();

  const rawViewMode = getParam("viewMode", "grid");
  const viewMode: "grid" | "list" | "table" =
    rawViewMode === "list" || rawViewMode === "table" ? rawViewMode : "grid";

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
      const testJob = await createJobMutation.mutateAsync({
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
      setSelectedJobId(testJob.id);
    } catch (err) {
      console.error("Create test job error", err);
    }
  };

  const handleJobDeleted = (id: string) => {
    deleteJobMutation.mutate(id);
    if (selectedJobId === id) {
      const remaining = jobs.filter((j) => j.id !== id);
      setSelectedJobId(remaining.length > 0 ? remaining[0].id : null);
    }
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
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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
              viewMode={viewMode}
              onViewModeChange={(mode) => setParam("viewMode", mode, false)}
              loading={jobsLoading}
              onViewCandidates={(jobId: string) => {
                setSelectedJobId(jobId);
                router.push(`/dashboard/candidates?jobId=${jobId}`);
              }}
              onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
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
