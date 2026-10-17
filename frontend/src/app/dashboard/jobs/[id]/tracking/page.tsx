"use client";

import { useState, useMemo, Suspense } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";
import { useMyOrg } from "@/hooks/use-organization-queries";
import { useJob, useAllJobs } from "@/hooks/use-queries";
import { useTableParams } from "@/hooks/use-table-params";
import {
  useTrackingLinksQuery,
  useUpdateTrackingLinkMutation,
  useDeleteTrackingLinkMutation,
} from "@/hooks/use-sourcing-queries";
import type { TrackingLinkItem } from "@haihire/shared";
import {
  TrackingLinksTab,
  CreateLinkModal,
  EditLinkModal,
} from "@/components/sourcing";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/shared/search-input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Plus } from "lucide-react";

function JobTrackingPageContent() {
  const params = useParams();
  const rawJobId = params?.id;
  const jobId = Array.isArray(rawJobId) ? rawJobId[0] : (rawJobId as string);

  const { user, canEdit } = useAuth();
  const { t } = useI18n();

  const {
    page: currentPage,
    limit: rowsPerPage,
    search,
    setSearch,
    setPage: setCurrentPage,
    setLimit: setRowsPerPage,
  } = useTableParams();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<TrackingLinkItem | null>(null);

  const { data: myOrg } = useMyOrg();
  const orgSlug = myOrg?.slug || user?.organizationId || "demo";

  const { data: job, isLoading: jobLoading } = useJob(jobId);
  const { data: rawJobs = [] } = useAllJobs(user?.organizationId);
  const jobsList = useMemo(
    () => rawJobs.map((j) => ({ id: j.id, title: j.title })),
    [rawJobs],
  );

  const modalJobs = useMemo(() => {
    if (!job) return jobsList;
    const exists = jobsList.some((j) => j.id === job.id);
    return exists ? jobsList : [{ id: job.id, title: job.title }, ...jobsList];
  }, [jobsList, job]);

  const { data: linksData, isLoading: linksLoading } = useTrackingLinksQuery({
    page: currentPage,
    limit: rowsPerPage || 15,
    search: search.trim() || undefined,
    jobId,
  });

  const updateLinkMutation = useUpdateTrackingLinkMutation();
  const deleteLinkMutation = useDeleteTrackingLinkMutation();

  const handleToggleStatus = (id: string, currentActive: boolean) => {
    updateLinkMutation.mutate({ id, data: { isActive: !currentActive } });
  };

  const handleDeleteLink = (id: string) => {
    deleteLinkMutation.mutate(id);
  };

  if (jobLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!job) return null;

  return (
    <main className="flex-1 min-h-0 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 xl:px-10 w-full space-y-4">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder={t("sourcing.links.searchPlaceholder")}
            aria-label={t("sourcing.links.searchPlaceholder")}
          />
        </div>

        {canEdit && (
          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
            <span>{t("sourcing.newLink")}</span>
          </Button>
        )}
      </div>

      {/* Sourcing Links Table (Reused from TrackingLinksTab) */}
      <TrackingLinksTab
        data={linksData}
        isLoading={linksLoading}
        page={currentPage}
        pageSize={rowsPerPage || 15}
        onPageChange={(p) => setCurrentPage(p)}
        onPageSizeChange={(newSize) => setRowsPerPage(newSize)}
        orgSlug={orgSlug}
        onToggleStatus={handleToggleStatus}
        onDeleteLink={handleDeleteLink}
        onEditLink={canEdit ? (link) => setEditingLink(link) : undefined}
      />

      {/* Create Link Modal */}
      <CreateLinkModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        jobs={modalJobs}
        orgSlug={orgSlug}
        defaultJobId={job.id}
        lockJob={true}
      />

      {/* Edit Link Modal */}
      {editingLink && (
        <EditLinkModal
          isOpen={Boolean(editingLink)}
          onClose={() => setEditingLink(null)}
          link={editingLink}
          jobs={modalJobs}
          orgSlug={orgSlug}
          defaultJobId={job.id}
          lockJob={true}
        />
      )}
    </main>
  );
}

export default function JobTrackingPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <JobTrackingPageContent />
    </Suspense>
  );
}
