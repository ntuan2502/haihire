"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { DeleteApplicationModal } from "@/components/applications/delete-application-modal";
import { RejectApplicationModal } from "@/components/applications/reject-application-modal";
import { OfferApplicationModal } from "@/components/applications/offer-application-modal";
import { DocumentPreviewModal } from "@/components/applications/document-preview-modal";
import { ScheduleInterviewModal } from "@/components/interviews/schedule-interview-modal";
import { getCandidateDisplayName } from "@/lib/utils";
import { PipelineStageSelector } from "@/components/jobs/pipeline/pipeline-stage-selector";
import { PipelineCandidatesSidebar } from "@/components/jobs/pipeline/page-components";
import { PipelineCandidateDetail } from "@/components/jobs/pipeline/pipeline-candidate-detail";
import { usePipelineKanban } from "./hooks/use-pipeline-kanban";

function JobPipelinePageContent() {
  const params = useParams();
  const rawJobId = params?.id;
  const jobId = Array.isArray(rawJobId) ? rawJobId[0] : (rawJobId as string);

  const pipeline = usePipelineKanban(jobId);

  if (pipeline.jobLoading || pipeline.appsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!pipeline.job) return null;

  return (
    <div
      className={`flex-1 min-h-0 flex flex-col overflow-hidden ${
        pipeline.isFullscreen
          ? "fixed inset-0 z-50 bg-white dark:bg-slate-950"
          : ""
      }`}
    >
      {/* 1. Pipeline Stages Sub-header */}
      <PipelineStageSelector
        stages={pipeline.pipelineStages}
        stageCounts={pipeline.stageCounts}
        selectedStage={pipeline.selectedStage}
        onSelectStage={pipeline.handleSelectStage}
        isFullscreen={pipeline.isFullscreen}
        onToggleFullscreen={() => pipeline.setIsFullscreen((prev) => !prev)}
        isListCollapsed={pipeline.isListCollapsed}
        onToggleCollapse={() => pipeline.setIsListCollapsed((prev) => !prev)}
        onDropCandidate={pipeline.handleDropCandidate}
      />

      {/* 2. Main Master-Detail Workspace */}
      <main className="flex-1 min-h-0 flex overflow-hidden">
        {/* LEFT COLUMN: Candidates List */}
        <PipelineCandidatesSidebar
          isListCollapsed={pipeline.isListCollapsed}
          mobileDetailOpen={pipeline.mobileDetailOpen}
          searchQuery={pipeline.searchQuery}
          onSearchChange={pipeline.setSearchQuery}
          sortBy={pipeline.sortBy}
          onSortByChange={pipeline.setSortBy}
          candidateCountText={pipeline.candidateCountText}
          filteredCandidates={pipeline.filteredCandidates}
          selectedAppId={pipeline.selectedAppId}
          onSelectCandidate={pipeline.handleSelectCandidate}
          canEdit={pipeline.canEdit}
        />

        {/* RIGHT COLUMN: Candidate Detail Content */}
        <PipelineCandidateDetail
          selectedCandidate={pipeline.selectedCandidate}
          currentStageConfig={pipeline.currentStageConfig}
          mobileDetailOpen={pipeline.mobileDetailOpen}
          onCloseMobileDetail={() => pipeline.setMobileDetailOpen(false)}
          job={pipeline.job}
          canEdit={pipeline.canEdit}
          isMovingStage={pipeline.isMovingStage}
          onMoveStage={pipeline.handleMoveCandidateStage}
          currentIndex={pipeline.currentIndex}
          totalCandidates={pipeline.filteredCandidates.length}
          onPrevCandidate={pipeline.handlePrevCandidate}
          onNextCandidate={pipeline.handleNextCandidate}
          candidateTab={pipeline.candidateTab}
          onSelectTab={pipeline.setCandidateTab}
          overviewSections={pipeline.overviewSections}
          onToggleOverviewSection={pipeline.handleToggleOverviewSection}
          isOverviewPopoverOpen={pipeline.isOverviewPopoverOpen}
          onToggleOverviewPopover={() =>
            pipeline.setIsOverviewPopoverOpen((prev) => !prev)
          }
          onCloseOverviewPopover={() =>
            pipeline.setIsOverviewPopoverOpen(false)
          }
          overviewBtnRef={pipeline.overviewBtnRef}
          candidateDocuments={pipeline.candidateDocuments}
          onPreviewDoc={(doc) => pipeline.setPreviewDoc(doc)}
          onDownloadDoc={pipeline.handleDownloadDoc}
          candidateInterviews={pipeline.selectedCandidate?.interviews || []}
          onScheduleInterview={(intv) => {
            pipeline.setEditingInterview(intv || null);
            pipeline.setScheduleModalOpen(true);
          }}
          onDeleteApplication={() => pipeline.setDeleteAppModalOpen(true)}
        />
      </main>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={!!pipeline.previewDoc}
        onClose={() => pipeline.setPreviewDoc(null)}
        document={pipeline.previewDoc}
        appId={pipeline.selectedCandidate?.id}
        onDownload={pipeline.handleDownloadDoc}
      />

      {/* Delete Application Confirmation Modal */}
      {pipeline.selectedCandidate && (
        <DeleteApplicationModal
          isOpen={pipeline.deleteAppModalOpen}
          onClose={() => pipeline.setDeleteAppModalOpen(false)}
          onConfirm={pipeline.handleConfirmDeleteCandidate}
          candidateName={getCandidateDisplayName(pipeline.selectedCandidate)}
          jobTitle={pipeline.job.title}
          isDeleting={pipeline.isDeletingApp}
        />
      )}

      {/* Reject Application Confirmation Modal */}
      {pipeline.pendingRejectCandidate && (
        <RejectApplicationModal
          isOpen={!!pipeline.pendingRejectCandidate}
          onClose={() => pipeline.setPendingRejectCandidate(null)}
          onConfirm={pipeline.handleConfirmRejectCandidate}
          candidateName={getCandidateDisplayName(
            pipeline.pendingRejectCandidate,
          )}
          candidateEmail={
            pipeline.pendingRejectCandidate.candidateEmail ??
            pipeline.pendingRejectCandidate.candidate?.email
          }
          jobTitle={pipeline.job.title}
          isSubmitting={pipeline.isMovingStage}
        />
      )}

      {/* Offer Application Confirmation Modal */}
      {pipeline.pendingOfferCandidate && (
        <OfferApplicationModal
          isOpen={!!pipeline.pendingOfferCandidate}
          onClose={() => pipeline.setPendingOfferCandidate(null)}
          onConfirm={pipeline.handleConfirmOfferCandidate}
          candidateName={getCandidateDisplayName(
            pipeline.pendingOfferCandidate,
          )}
          candidateEmail={
            pipeline.pendingOfferCandidate.candidateEmail ??
            pipeline.pendingOfferCandidate.candidate?.email
          }
          jobTitle={pipeline.job.title}
          isSubmitting={pipeline.isMovingStage}
        />
      )}

      {/* Schedule Interview Modal */}
      {pipeline.job && (
        <ScheduleInterviewModal
          isOpen={pipeline.scheduleModalOpen}
          onClose={() => {
            pipeline.setScheduleModalOpen(false);
            pipeline.setEditingInterview(null);
          }}
          jobs={[pipeline.job]}
          applications={pipeline.jobApplications}
          selectedJobId={pipeline.job.id}
          selectedApplicationId={pipeline.selectedCandidate?.id}
          editingInterview={pipeline.editingInterview}
        />
      )}
    </div>
  );
}

export default function JobPipelinePage() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <JobPipelinePageContent />
    </Suspense>
  );
}
