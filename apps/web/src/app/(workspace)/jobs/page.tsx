"use client";

import { Suspense, useMemo, useState } from "react";
import { WizardDeleteModal } from "@/components/jobs/wizard";
import { JobList } from "@/components/jobs/job-list";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useTableParams } from "@/hooks/use-table-params";
import { useJobs, useAllJobs, useDeleteJobMutation } from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { PageHeader } from "@/components/shared/page-header";
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
  const { data: allJobs = [], isLoading: allJobsLoading } = useAllJobs(
    user?.organizationId,
  );

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

  const deleteJobMutation = useDeleteJobMutation();

  const [jobToDelete, setJobToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleJobDeleted = (id: string) => {
    const job = jobs.find((j) => j.id === id);
    setJobToDelete({ id, title: job?.title || id });
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteJob = async () => {
    if (!jobToDelete) return;
    try {
      await deleteJobMutation.mutateAsync(jobToDelete.id);
      toast.success(t("common.delete"));
      setIsDeleteModalOpen(false);
    } catch (err) {
      console.error("Failed to delete job:", err);
      toast.error(getApiErrorMessage(err, t));
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      {(jobsLoading && !jobsData) || allJobsLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="w-full p-4 sm:p-6 space-y-4">
          {/* Clean, Non-redundant Header Row with Primary CTA */}
          <PageHeader
            title={t("jobs.title")}
            badge={stats.total}
            actions={
              canCreateJob ? (
                <Button
                  onClick={() => router.push("/jobs/new")}
                  className="h-9 px-3.5 sm:px-4 text-xs font-semibold gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>{t("jobs.createJob")}</span>
                </Button>
              ) : undefined
            }
          />

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
      <WizardDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDeleteJob}
        jobTitle={jobToDelete?.title ?? ""}
        isDeleting={deleteJobMutation.isPending}
      />
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <JobsPageContent />
    </Suspense>
  );
}
