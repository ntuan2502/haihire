import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { StatusState } from "@/components/shared/status-state";
import { CandidateTimeline } from "@/components/timeline/candidate-timeline";
import { useI18n } from "@/i18n";
import { useHasPermission } from "@/hooks/use-has-permission";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  useCandidateDuplicateCheck,
  useDeleteCandidateMutation,
  useDeleteInterviewMutation,
} from "@/hooks/use-queries";
import { normalizeDateForInput } from "@/lib/utils";
import { CandidateDuplicateAlert } from "@/components/candidates/candidate-duplicate-alert";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import type { Application } from "@/types";

import { useCandidateDetailState } from "./hooks/use-candidate-detail-state";
import { useCandidateDocumentActions } from "./hooks/use-candidate-document-actions";
import { CandidateDetailHeader } from "./sections/candidate-detail-header";
import { CandidateProfileCard } from "./sections/candidate-profile-card";
import { CandidateApplicationsTab } from "./sections/candidate-applications-tab";
import { CandidateDocumentsTab } from "./sections/candidate-documents-tab";
import { DocumentPreviewModal } from "@/components/applications/document-preview-modal";
import { CandidateNotesStream } from "@/components/candidates/candidate-notes-stream";
import { CandidateDetailModals } from "./modals/candidate-detail-modals";

export function CandidateDetailView() {
  const router = useRouter();
  const { t } = useI18n();
  const canViewCandidates = useHasPermission("candidate:view");

  const state = useCandidateDetailState();
  const { data: duplicateCheck } = useCandidateDuplicateCheck({
    phone: state.candidate?.phone || undefined,
    firstName: state.candidate?.firstName || undefined,
    lastName: state.candidate?.lastName || undefined,
    dateOfBirth: state.candidate?.dateOfBirth
      ? normalizeDateForInput(state.candidate.dateOfBirth)
      : undefined,
    excludeId: state.candidate?.id,
    enabled: Boolean(state.candidate?.id),
  });
  const docActions = useCandidateDocumentActions({
    candidate: state.candidate,
  });

  const deleteCandidateMutation = useDeleteCandidateMutation();
  const deleteInterviewMutation = useDeleteInterviewMutation();

  const [isDeletingCandidate, setIsDeletingCandidate] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [scheduleInterviewApp, setScheduleInterviewApp] =
    useState<Application | null>(null);
  const [editingInterview, setEditingInterview] =
    useState<ScheduledInterviewInfo | null>(null);
  const [isSendEmailOpen, setIsSendEmailOpen] = useState(false);

  const handleConfirmDeleteCandidate = async () => {
    if (!state.candidate) return;
    try {
      setIsDeletingCandidate(true);
      await deleteCandidateMutation.mutateAsync(state.candidate.id);
      setIsDeleteModalOpen(false);
      router.push("/candidates");
    } catch (err) {
      console.error("Failed to delete candidate:", err);
      toast.error(getApiErrorMessage(err, t));
    } finally {
      setIsDeletingCandidate(false);
    }
  };

  const handleCancelInterview = async (
    targetApp: Application,
    interviewOrId?: ScheduledInterviewInfo | string,
  ) => {
    try {
      let targetId: string | undefined;
      if (typeof interviewOrId === "string") {
        targetId = interviewOrId;
      } else if (
        interviewOrId &&
        typeof interviewOrId === "object" &&
        "id" in interviewOrId &&
        typeof interviewOrId.id === "string"
      ) {
        targetId = interviewOrId.id;
      } else {
        targetId = targetApp.interviews && targetApp.interviews[0]?.id;
      }

      if (targetId && typeof targetId === "string") {
        await deleteInterviewMutation.mutateAsync(targetId);
      }
    } catch (err) {
      console.error("Failed to cancel interview:", err);
      toast.error(getApiErrorMessage(err, t));
    }
  };

  if (!canViewCandidates) {
    return (
      <div className="flex-1 flex flex-col">
        <StatusState
          status="403"
          variant="page"
          actionLabel={t("common.dashboard")}
          actionHref="/dashboard"
        />
      </div>
    );
  }

  if (state.loading) {
    return <LoadingSpinner />;
  }

  if ((!state.isCandidateIdValid || !state.candidate) && !state.loading) {
    return (
      <div className="flex-1 flex flex-col">
        <StatusState
          status="404"
          variant="page"
          title={t("candidates.noCandidatesYet")}
          description={t(
            !state.isCandidateIdValid
              ? "candidates.invalidCandidateId"
              : "candidates.candidateNotFound",
          )}
          actionLabel={`${t("common.back")}: ${t("candidates.title")}`}
          onAction={() => router.push("/candidates")}
          actionVariant="outline"
        />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full p-4 sm:p-6 space-y-5">
      <CandidateDetailHeader
        candidateId={state.candidate?.id || state.candidateIdStr || ""}
        candidateName={state.candidateName}
        candidateEmail={state.candidateEmail}
        candidatePhone={state.candidatePhone}
        canEdit={state.canEdit}
        isDeleting={isDeletingCandidate}
        onOpenSendEmail={() => setIsSendEmailOpen(true)}
        onOpenDeleteModal={() => setIsDeleteModalOpen(true)}
      />

      <CandidateDuplicateAlert result={duplicateCheck} mode="detail" />

      <CandidateProfileCard
        candidateName={state.candidateName}
        candidateEmail={state.candidateEmail}
        candidatePhone={state.candidatePhone}
        gender={state.gender}
        dob={state.dob}
        candidateCreated={state.candidateCreated}
        candidateUpdated={state.candidateUpdated}
        parsedNotes={state.parsedNotes}
      />

      {/* Card 2: Tabs (Applications / Documents / Notes) */}
      <div className="rounded-xl border border-border bg-card text-card-foreground p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-6 text-xs font-semibold -mb-px">
            <button
              type="button"
              onClick={() => state.setActiveTab("applications")}
              className={`pb-3 pt-0.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                state.activeTab === "applications"
                  ? "text-foreground border-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground border-transparent font-medium"
              }`}
            >
              {t("candidates.applicationsTab")} ({state.candidateApps.length})
            </button>
            <button
              type="button"
              onClick={() => state.setActiveTab("documents")}
              className={`pb-3 pt-0.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                state.activeTab === "documents"
                  ? "text-foreground border-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground border-transparent font-medium"
              }`}
            >
              {t("candidates.documentsTab")} ({state.candidateDocuments.length})
            </button>
            <button
              type="button"
              onClick={() => state.setActiveTab("notes")}
              className={`pb-3 pt-0.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                state.activeTab === "notes"
                  ? "text-foreground border-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground border-transparent font-medium"
              }`}
            >
              {t("candidates.notes")} ({state.notesCount})
            </button>
          </div>
        </div>

        {state.activeTab === "applications" && (
          <CandidateApplicationsTab
            jobs={state.jobs}
            stageFilter={state.stageFilter}
            setStageFilter={state.setStageFilter}
            filteredCandidateApps={state.filteredCandidateApps}
            canEdit={state.canEdit}
            onOpenApplyModal={() => setApplyModalOpen(true)}
            onScheduleInterview={(app, intv) => {
              setScheduleInterviewApp(app);
              setEditingInterview(intv);
            }}
            onCancelInterview={handleCancelInterview}
          />
        )}

        {state.activeTab === "documents" && (
          <CandidateDocumentsTab
            documents={state.candidateDocuments}
            canEdit={state.canEdit}
            isUploadingDoc={docActions.isUploadingDoc}
            docInputRef={docActions.docInputRef}
            onDocumentUpload={docActions.handleDocumentUpload}
            onPreviewDoc={(doc) => docActions.setPreviewDoc(doc)}
            onDownloadDoc={docActions.handleDownloadDoc}
            onDeleteDoc={(doc) => docActions.setDocToDelete(doc)}
          />
        )}

        {state.activeTab === "notes" && (
          <div className="pt-2">
            <CandidateNotesStream
              candidateId={state.candidate?.id || state.candidateIdStr || ""}
              showHeader={false}
            />
          </div>
        )}
      </div>

      {/* Card 5: Activity & Email Timeline */}
      <div className="rounded-xl border border-border bg-card text-card-foreground p-6 shadow-xs space-y-4">
        <CandidateTimeline
          candidateId={state.candidate?.id || state.candidateIdStr}
          candidateName={state.candidateName}
          candidateEmail={state.candidateEmail}
        />
      </div>

      <CandidateDetailModals
        candidate={state.candidate}
        candidateName={state.candidateName}
        candidateEmail={state.candidateEmail}
        candidatePhone={state.candidatePhone}
        jobs={state.jobs}
        candidateApps={state.candidateApps}
        applyModalOpen={applyModalOpen}
        setApplyModalOpen={setApplyModalOpen}
        isDeleteModalOpen={isDeleteModalOpen}
        setIsDeleteModalOpen={setIsDeleteModalOpen}
        isDeletingCandidate={isDeletingCandidate}
        onConfirmDeleteCandidate={handleConfirmDeleteCandidate}
        docToDelete={docActions.docToDelete}
        setDocToDelete={docActions.setDocToDelete}
        isDeletingDoc={docActions.isDeletingDoc}
        onConfirmDeleteDoc={docActions.handleConfirmDeleteDoc}
        scheduleInterviewApp={scheduleInterviewApp}
        setScheduleInterviewApp={setScheduleInterviewApp}
        editingInterview={editingInterview}
        setEditingInterview={setEditingInterview}
        isSendEmailOpen={isSendEmailOpen}
        setIsSendEmailOpen={setIsSendEmailOpen}
      />

      <DocumentPreviewModal
        isOpen={Boolean(docActions.previewDoc)}
        onClose={() => docActions.setPreviewDoc(null)}
        document={docActions.previewDoc}
        candidateId={state.candidate?.id || state.candidateIdStr}
        onDownload={docActions.handleDownloadDoc}
      />
    </div>
  );
}
