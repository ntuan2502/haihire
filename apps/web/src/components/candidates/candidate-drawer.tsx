"use client";

import { SlideOver } from "@/components/shared/slide-over";
import { DeleteDocumentModal } from "@/components/candidates/delete-document-modal";
import { DocumentPreviewModal } from "@/components/applications/document-preview-modal";
import { CandidateNotesStream } from "./candidate-notes-stream";
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
    drawerNotesCount,
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
        size="2xl"
        ariaLabel={candidate.name || t("candidates.candidateDetail")}
      >
        <CandidateDrawerHeader candidateId={candidate.id} onClose={onClose} />

        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
          <CandidateDrawerDetails
            candidate={candidate}
            details={selectedCandidateDetails}
          />

          {/* Card 3: Tabs */}
          <div className="rounded-xl border border-border bg-card text-card-foreground p-4 sm:p-5 shadow-xs space-y-4">
            {/* Tabs Header */}
            <div className="flex items-center justify-between border-b border-border overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-6 text-xs font-semibold -mb-px whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setDrawerTab("applications")}
                  className={`pb-3 pt-0.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    drawerTab === "applications"
                      ? "text-foreground border-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground border-transparent font-medium"
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
                      ? "text-foreground border-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground border-transparent font-medium"
                  }`}
                >
                  {t("candidates.documentsTab")} (
                  {drawerCandidateDocuments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerTab("notes")}
                  className={`pb-3 pt-0.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    drawerTab === "notes"
                      ? "text-foreground border-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground border-transparent font-medium"
                  }`}
                >
                  {t("candidates.notes")} ({drawerNotesCount})
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
                candidateId={candidate.id}
                canEdit={canEdit}
                documents={drawerCandidateDocuments}
                onPreviewDoc={setDrawerPreviewDoc}
                onDownloadDoc={handleDownloadDoc}
                onDeleteDoc={setDrawerDocToDelete}
                onUploadDoc={handleUploadDoc}
                isUploading={isUploadingDrawerDoc}
              />
            )}

            {/* Notes Tab */}
            {drawerTab === "notes" && (
              <CandidateNotesStream
                candidateId={candidate.id}
                compact
                showHeader={false}
              />
            )}
          </div>
        </div>
      </SlideOver>

      <DeleteDocumentModal
        isOpen={!!drawerDocToDelete}
        onClose={() => setDrawerDocToDelete(null)}
        onConfirm={handleConfirmDeleteDrawerDoc}
        documentName={drawerDocToDelete?.name}
        isLoading={isDeletingDoc}
      />

      <DocumentPreviewModal
        isOpen={Boolean(drawerPreviewDoc)}
        onClose={() => setDrawerPreviewDoc(null)}
        document={drawerPreviewDoc}
        candidateId={candidate.id}
        onDownload={handleDownloadDoc}
      />
    </>
  );
}
