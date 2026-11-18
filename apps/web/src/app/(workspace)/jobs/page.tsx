"use client";

import { Suspense, useMemo, useState } from "react";
import { ConfirmDestructiveModal } from "@/components/shared";
import { JobList } from "@/components/jobs/job-list";
import { StartRecruiting } from "@/components/dashboard/start-recruiting";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useTableParams } from "@/hooks/use-table-params";
import {
  useJobs,
  useAllJobs,
  useCreateJobMutation,
  useDeleteJobMutation,
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { useHasPermission } from "@/hooks/use-has-permission";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { Plus } from "lucide-react";

function JobsPageContent() {
  const router = useRouter();
  const { user, canEdit: _canEdit } = useAuth();
  const { t } = useI18n();
  const canCreateJob = useHasPermission("job:create");

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
  const sortBy =
    (getParam("sortBy", "created") as "created" | "title" | "applicants") ||
    "created";
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

  const [jobToDelete, setJobToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

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
      toast.error(getApiErrorMessage(err, t));
    }
  };

  return (
    <div className="flex-1">
      {jobsLoading && !jobsData ? (
        <LoadingSpinner />
      ) : stats.total === 0 &&
        currentPage === 1 &&
        !search &&
        !status &&
        !type &&
        !experience &&
        !workplace ? (
        <StartRecruiting
          onOpenCreateJob={() => router.push("/jobs/new")}
          onCreateTestJob={handleCreateTestJob}
          onImportFromFile={() => router.push("/jobs/new")}
        />
      ) : (
        <div className="w-full p-4 sm:p-6 space-y-4">
          {/* Clean, Non-redundant Header Row with Primary CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
                {t("jobs.title")}
              </h1>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-secondary text-secondary-foreground border border-border">
                {stats.total}
              </span>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {canCreateJob && (
                <Button
                  size="sm"
                  onClick={() => router.push("/jobs/new")}
                  className="gap-1.5 cursor-pointer"
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
              setParams(
                {
                  status: filters.status || null,
                  type: filters.type || null,
                  experience: filters.experience || null,
                  workplace: filters.workplace || null,
                  sortBy:
                    filters.sortBy && filters.sortBy !== "created"
                      ? filters.sortBy
                      : null,
                  sortOrder:
                    filters.sortOrder && filters.sortOrder !== "desc"
                      ? filters.sortOrder
                      : null,
                },
                true,
              );
            }}
          />
        </div>
      )}

      {/* Delete Job Confirmation Modal */}
      {jobToDelete && (
        <ConfirmDestructiveModal
          isOpen={!!jobToDelete}
          onClose={() => setJobToDelete(null)}
          onConfirm={handleConfirmDeleteJob}
          title={t("jobs.wizard.deleteConfirmTitle")}
          description={t("jobs.wizard.deleteConfirmQuestion", {
            title: jobToDelete.title,
          })}
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
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <JobsPageContent />
    </Suspense>
  );
}
