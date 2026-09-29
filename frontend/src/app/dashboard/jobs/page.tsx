"use client";

import { Suspense, useMemo, useState } from "react";
import { AuthGuard } from "@/components/shared/auth-guard";
import { ConfirmDestructiveModal } from "@/components/shared";
import { Navbar } from "@/components/layout";
import { JobList } from "@/components/jobs/job-list";
import { StartRecruiting } from "@/components/dashboard/start-recruiting";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useTableParams } from "@/hooks/use-table-params";
import {
  useJobs,
  useAllJobs,
  useCandidates,
  useCreateJobMutation,
  useDeleteJobMutation,
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { Plus } from "lucide-react";

function JobsPageContent() {
  const router = useRouter();
  const { user, canEdit } = useAuth();
  const { t } = useI18n();

  // Synchronized URL Query State for Pagination, Search & Filters
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

  const status = getParam("status", "");
  const type = getParam("type", "");
  const experience = getParam("experience", "");
  const workplace = getParam("workplace", "");
  const sortBy = (getParam("sortBy", "created") as "created" | "title" | "applicants") || "created";
  const sortOrder = (getParam("sortOrder", "desc") as "desc" | "asc") || "desc";

  // TanStack Query Hooks with Server-Side Pagination, Search & Full URL Filters
  const { data: jobsData, isLoading: jobsLoading } = useJobs(
    user?.organizationId,
    {
      page: currentPage,
      limit: rowsPerPage,
      search: search.trim() || undefined,
      status: status || undefined,
      type: type || undefined,
      experienceLevel: experience || undefined,
      workplace: workplace || undefined,
      sortBy,
      sortOrder,
    },
  );
  const jobs = jobsData?.data ?? [];
  const total = jobsData?.total ?? 0;
  const totalPages = jobsData?.totalPages ?? 1;

  // Query all jobs for organization-wide metrics
  const { data: allJobs = [] } = useAllJobs(user?.organizationId);

  const stats = useMemo(() => {
    let applicants = 0;
    for (const job of allJobs) {
      applicants += job.applicationsCount || 0;
    }
    return {
      total: allJobs.length,
      applicants,
    };
  }, [allJobs]);

  const statusCounts = useMemo(() => {
    let published = 0;
    let draft = 0;
    let closed = 0;
    for (const job of allJobs) {
      if (job.status === "PUBLISHED") published++;
      else if (job.status === "DRAFT") draft++;
      else if (job.status === "CLOSED" || job.status === "ARCHIVED") closed++;
    }
    return {
      all: allJobs.length,
      published,
      draft,
      closed,
    };
  }, [allJobs]);

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

  const [jobToDelete, setJobToDelete] = useState<{ id: string; title: string } | null>(null);

  const handleJobDeleted = (id: string) => {
    const job = jobs.find((j) => j.id === id);
    setJobToDelete({ id, title: job?.title || id });
  };

  const handleConfirmDeleteJob = async () => {
    if (!jobToDelete) return;
    try {
      await deleteJobMutation.mutateAsync(jobToDelete.id);
      setJobToDelete(null);
    } catch (err) {
      console.error("Failed to delete job:", err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Navbar */}
      <Navbar
        activeTab="jobs"
        onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
        jobsCount={stats.total}
        candidatesCount={candidatesData?.total || 0}
      />

      {/* Main Content */}
      <main className="flex-1">
        {jobsLoading && !jobsData ? (
          <LoadingSpinner />
        ) : stats.total === 0 && currentPage === 1 && !search && !status && !type && !experience && !workplace ? (
          <StartRecruiting
            onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
            onCreateTestJob={handleCreateTestJob}
            onImportFromFile={() => router.push("/dashboard/jobs/new")}
          />
        ) : (
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-4">
            {/* Clean, Non-redundant Header Row with Primary CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {t("jobs.title")}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80">
                  {stats.total}
                </span>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {canEdit && (
                  <Button
                    onClick={() => router.push("/dashboard/jobs/new")}
                    className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{t("jobs.createJob")}</span>
                  </Button>
                )}
              </div>
            </div>

            {/* JobList component with full URL synchronized filter drawer */}
            <JobList
              jobs={jobs}
              total={total}
              statusCounts={statusCounts}
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={rowsPerPage}
              onPageChange={setCurrentPage}
              onPageSizeChange={setRowsPerPage}
              search={search}
              onSearchChange={setSearch}
              loading={jobsLoading}
              onDeleteJob={handleJobDeleted}
              statusFilter={status}
              typeFilter={type}
              expFilter={experience}
              workplaceFilter={workplace}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onFilterChange={(filters) => {
                setParams({
                  status: filters.status || null,
                  type: filters.type || null,
                  experience: filters.experience || null,
                  workplace: filters.workplace || null,
                  sortBy: filters.sortBy && filters.sortBy !== "created" ? filters.sortBy : null,
                  sortOrder: filters.sortOrder && filters.sortOrder !== "desc" ? filters.sortOrder : null,
                }, true);
              }}
            />
          </div>
        )}
      </main>

      {/* Delete Job Confirmation Modal */}
      {jobToDelete && (
        <ConfirmDestructiveModal
          isOpen={!!jobToDelete}
          onClose={() => setJobToDelete(null)}
          onConfirm={handleConfirmDeleteJob}
          title={t("jobs.wizard.deleteConfirmTitle")}
          description={t("jobs.wizard.deleteConfirmQuestion", { title: jobToDelete.title })}
          notice={t("jobs.wizard.deleteConfirmNotice")}
          confirmMatchText={jobToDelete.title}
          confirmButtonLabel={t("jobs.wizard.confirmDeleteButton")}
          cancelButtonLabel={t("common.cancel")}
          isLoading={deleteJobMutation.isPending}
          variant="danger"
        />
      )}
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
