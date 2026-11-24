"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { DeleteApplicationModal } from "@/components/applications/delete-application-modal";
import { RejectApplicationModal } from "@/components/applications/reject-application-modal";
import { OfferApplicationModal } from "@/components/applications/offer-application-modal";
import { DocumentPreviewModal } from "@/components/applications/document-preview-modal";
import { ScheduleInterviewModal } from "@/components/interviews/schedule-interview-modal";
import { SendEmailModal } from "@/components/email/send-email-modal";
import { getCandidateDisplayName, normalizeEmailAddress } from "@/lib/utils";
import { BRAND_CONFIG } from "@haihire/shared";
import { useI18n } from "@/i18n";
import { PipelineStageSelector } from "@/components/jobs/pipeline/pipeline-stage-selector";
import { PipelineCandidatesSidebar } from "@/components/jobs/pipeline/page-components";
import { PipelineCandidateDetail } from "@/components/jobs/pipeline/pipeline-candidate-detail";
import { usePipelineKanban } from "./hooks/use-pipeline-kanban";

function JobPipelinePageContent() {
  const params = useParams();
  const rawJobId = params?.id;
  const jobId = Array.isArray(rawJobId) ? rawJobId[0] : (rawJobId as string);
  const { t } = useI18n();

  const pipeline = usePipelineKanban(jobId);

  if (pipeline.jobLoading || pipeline.appsLoading) {
    return <LoadingSpinner />;
  }

  if (!pipeline.job) return null;

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* 1. Pipeline Stages Sub-header */}
      <PipelineStageSelector
        stages={pipeline.pipelineStages}
        stageCounts={pipeline.stageCounts}
        selectedStage={pipeline.selectedStage}
        onSelectStage={pipeline.handleSelectStage}
        onDropCandidate={pipeline.handleDropCandidate}
      />

      {/* 2. Main Master-Detail Workspace */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* LEFT COLUMN: Candidates List */}
        <PipelineCandidatesSidebar
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
          isDeletingApp={pipeline.isDeletingApp}
          onMoveStage={pipeline.handleMoveCandidateStage}
          currentIndex={pipeline.currentIndex}
          totalCandidates={pipeline.filteredCandidates.length}
          onPrevCandidate={pipeline.handlePrevCandidate}
          onNextCandidate={pipeline.handleNextCandidate}
          candidateTab={pipeline.candidateTab}
          onSelectTab={pipeline.setCandidateTab}
          candidateDocuments={pipeline.candidateDocuments}
          onPreviewDoc={(doc) => pipeline.setPreviewDoc(doc)}
          onDownloadDoc={pipeline.handleDownloadDoc}
          candidateInterviews={pipeline.selectedCandidate?.interviews || []}
          onScheduleInterview={(intv) => {
            pipeline.setEditingInterview(intv || null);
            pipeline.setScheduleModalOpen(true);
          }}
          onCancelInterview={pipeline.handleCancelInterview}
          onOpenSendEmail={() => pipeline.setIsSendEmailOpen(true)}
          onDeleteApplication={() => pipeline.setDeleteAppModalOpen(true)}
        />
      </div>

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
          candidateEmail={normalizeEmailAddress(
            pipeline.pendingRejectCandidate.candidateEmail ??
              pipeline.pendingRejectCandidate.candidate?.email,
          )}
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
          candidateEmail={normalizeEmailAddress(
            pipeline.pendingOfferCandidate.candidateEmail ??
              pipeline.pendingOfferCandidate.candidate?.email,
          )}
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

      {/* Send Email Modal */}
      {pipeline.selectedCandidate && (
        <SendEmailModal
          isOpen={pipeline.isSendEmailOpen}
          onClose={() => pipeline.setIsSendEmailOpen(false)}
          candidate={{
            id: pipeline.selectedCandidate.candidateId,
            name: getCandidateDisplayName(pipeline.selectedCandidate),
            email: normalizeEmailAddress(
              pipeline.selectedCandidate.candidateEmail ??
                pipeline.selectedCandidate.candidate?.email,
            ),
            phone:
              pipeline.selectedCandidate.candidatePhone ??
              pipeline.selectedCandidate.candidate?.phone,
          }}
          jobTitle={pipeline.job.title}
          organizationName={
            pipeline.job.department
              ? t("common.departmentSuffix", {
                  department: pipeline.job.department,
                })
              : BRAND_CONFIG.name
          }
        />
      )}
    </div>
  );
}

export default function JobPipelinePage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <JobPipelinePageContent />
    </Suspense>
  );
}
