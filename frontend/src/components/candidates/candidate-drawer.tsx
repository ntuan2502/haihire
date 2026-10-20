"use client";

import { SlideOver } from "@/components/shared/slide-over";
import { DeleteDocumentModal } from "@/components/candidates/delete-document-modal";
import {
  CandidateDrawerHeader,
  CandidateDrawerDetails,
  CandidateDrawerApplicationsTab,
  CandidateDrawerDocumentsTab,
  useCandidateDrawerState,
} from "./drawer";
import type { CandidateItem } from "@/lib/utils";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import type { Application, Job } from "@/types";
import { useI18n } from "@/i18n";

export interface CandidateDrawerProps {
  candidate: CandidateItem | null;
  onClose: () => void;
  jobs: Job[];
  canEdit: boolean;
  onApplyToJob: (candidate: CandidateItem) => void;
  onScheduleInterview: (
    app: Application,
    interview?: ScheduledInterviewInfo | null,
  ) => void;
}

export function CandidateDrawer({
  candidate,
  onClose,
  jobs,
  canEdit,
  onApplyToJob,
  onScheduleInterview,
}: CandidateDrawerProps) {
  const { t } = useI18n();

  const {
    drawerTab,
    setDrawerTab,
    drawerStageFilter,
    setDrawerStageFilter,
    drawerDocFilter,
    setDrawerDocFilter,
    drawerPreviewDoc,
    setDrawerPreviewDoc,
    drawerDocToDelete,
    setDrawerDocToDelete,
    isUploadingDrawerDoc,
    isDeletingDoc,
    selectedCandidateDetails,
    selectedCandidateApps,
    filteredDrawerApps,
    drawerCandidateDocuments,
    filteredDrawerDocuments,
    handleDownloadDoc,
    handleUploadDoc,
    handleConfirmDeleteDrawerDoc,
    handleCancelInterview,
  } = useCandidateDrawerState({ candidate });

  if (!candidate) return null;

  return (
    <>
      <SlideOver
        isOpen={!!candidate}
        onClose={onClose}
        maxWidth="max-w-2xl"
        panelClassName="justify-between overflow-y-auto"
      >
        <div className="p-6 space-y-5 flex-1">
          <CandidateDrawerHeader candidateId={candidate.id} onClose={onClose} />

          <CandidateDrawerDetails
            candidate={candidate}
            details={selectedCandidateDetails}
          />

          {/* Card 3: Tabs */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            {/* Tabs Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-6 text-xs font-bold -mb-px">
                <button
                  type="button"
                  onClick={() => setDrawerTab("applications")}
                  className={`pb-3 pt-0.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    drawerTab === "applications"
                      ? "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 font-bold"
                      : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-transparent font-medium"
                  }`}
                >
                  {t("candidates.applicationsTab")} (
                  {selectedCandidateApps.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerTab("documents")}
                  className={`pb-3 pt-0.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    drawerTab === "documents"
                      ? "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 font-bold"
                      : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-transparent font-medium"
                  }`}
                >
                  {t("candidates.documentsTab")} (
                  {drawerCandidateDocuments.length})
                </button>
              </div>
            </div>

            {/* Applications Tab */}
            {drawerTab === "applications" && (
              <CandidateDrawerApplicationsTab
                candidate={candidate}
                jobs={jobs}
                canEdit={canEdit}
                stageFilter={drawerStageFilter}
                onStageFilterChange={setDrawerStageFilter}
                applications={filteredDrawerApps}
                totalApplicationsCount={selectedCandidateApps.length}
                onApplyToJob={onApplyToJob}
                onScheduleInterview={onScheduleInterview}
                onCancelInterview={handleCancelInterview}
              />
            )}

            {/* Documents Tab */}
            {drawerTab === "documents" && (
              <CandidateDrawerDocumentsTab
                canEdit={canEdit}
                docFilter={drawerDocFilter}
                onDocFilterChange={setDrawerDocFilter}
                documents={filteredDrawerDocuments}
                previewDoc={drawerPreviewDoc}
                onPreviewDoc={setDrawerPreviewDoc}
                onDownloadDoc={handleDownloadDoc}
                onDeleteDoc={setDrawerDocToDelete}
                onUploadDoc={handleUploadDoc}
                isUploading={isUploadingDrawerDoc}
              />
            )}
          </div>
        </div>
      </SlideOver>

      <DeleteDocumentModal
        isOpen={!!drawerDocToDelete}
        onClose={() => setDrawerDocToDelete(null)}
        onConfirm={handleConfirmDeleteDrawerDoc}
        isLoading={isDeletingDoc}
      />
    </>
  );
}
