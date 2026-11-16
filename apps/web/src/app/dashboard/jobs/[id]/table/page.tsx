"use client";

import { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useJob, useAllJobs, useJobApplications } from "@/hooks/use-queries";
import { useTableParams } from "@/hooks/use-table-params";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ApplicationsDataTable } from "@/components/applications/applications-data-table";
import type {
  DrawerTabId,
  SortDirection,
  SortField,
} from "@/components/applications/applications-data-table/types";

const VALID_SORT_FIELDS: readonly SortField[] = [
  "candidate",
  "email",
  "job",
  "status",
  "score",
  "applied",
];
const VALID_DRAWER_TABS: readonly DrawerTabId[] = [
  "overview",
  "inbox",
  "ai",
  "interviews",
  "documents",
  "responses",
  "notes",
  "timeline",
];

function JobTablePageContent() {
  const params = useParams();
  const router = useRouter();
  const rawJobId = params?.id;
  const jobId = Array.isArray(rawJobId) ? rawJobId[0] : (rawJobId as string);

  const {
    page: currentPage,
    limit: rowsPerPage,
    search,
    setPage: setCurrentPage,
    setLimit: setRowsPerPage,
    setSearch,
    getParam,
    setParams,
  } = useTableParams({ defaultLimit: 20 });

  const stage = getParam("stage", "");
  const score = getParam("score", "ALL");
  const rawSortBy = getParam("sortBy", "applied");
  const sortField: SortField = VALID_SORT_FIELDS.includes(
    rawSortBy as SortField,
  )
    ? (rawSortBy as SortField)
    : "applied";
  const rawSortOrder = getParam("sortOrder", "desc");
  const sortDirection: SortDirection = rawSortOrder === "asc" ? "asc" : "desc";
  const selectedAppId = getParam("applicationId", "") || null;
  const rawTab = getParam("tab", "overview");
  const drawerTab: DrawerTabId = VALID_DRAWER_TABS.includes(
    rawTab as DrawerTabId,
  )
    ? (rawTab as DrawerTabId)
    : "overview";

  const { user } = useAuth();
  const { data: jobs = [] } = useAllJobs(user?.organizationId);
  const { data: job, isLoading: jobLoading } = useJob(jobId);
  const { data: jobApplications = [], isLoading: appsLoading } =
    useJobApplications(jobId);

  if (jobLoading || appsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!job) return null;

  return (
    <main className="flex-1 min-h-0 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 xl:px-10 w-full space-y-4">
      <ApplicationsDataTable
        applications={jobApplications}
        jobs={jobs}
        loading={jobLoading || appsLoading}
        fixedJobId={job.id}
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        search={search}
        stageFilter={stage}
        scoreFilter={score}
        sortField={sortField}
        sortDirection={sortDirection}
        selectedAppId={selectedAppId}
        drawerTab={drawerTab}
        onPageChange={setCurrentPage}
        onLimitChange={setRowsPerPage}
        onSearchChange={setSearch}
        onStageFilterChange={(newStage) =>
          setParams({ stage: newStage || null, page: 1 })
        }
        onScoreFilterChange={(newScore) =>
          setParams({ score: newScore || null, page: 1 })
        }
        onSortChange={(field, direction) =>
          setParams({
            sortBy: field === "applied" ? null : field,
            sortOrder: direction === "desc" ? null : direction,
            page: 1,
          })
        }
        onSelectedAppIdChange={(appId) =>
          setParams({
            applicationId: appId || null,
            tab: appId ? undefined : null,
          })
        }
        onDrawerTabChange={(tab) =>
          setParams({ tab: tab === "overview" ? null : tab })
        }
        onViewInPipeline={(appId, appStage) => {
          const query = new URLSearchParams({
            stage: appStage,
            applicationId: appId,
          });
          router.push(`/dashboard/jobs/${jobId}/pipeline?${query.toString()}`);
        }}
      />
    </main>
  );
}

export default function JobTablePage() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <JobTablePageContent />
    </Suspense>
  );
}
