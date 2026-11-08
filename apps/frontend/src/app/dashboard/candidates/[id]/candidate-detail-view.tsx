import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Navbar } from "@/components/layout";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Button } from "@/components/ui/button";
import { CandidateTimeline } from "@/components/timeline/candidate-timeline";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  useDeleteCandidateMutation,
  useDeleteInterviewMutation,
} from "@/hooks/use-queries";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import type { Application } from "@/types";

import { useCandidateDetailState } from "./hooks/use-candidate-detail-state";
import { useCandidateDocumentActions } from "./hooks/use-candidate-document-actions";
import { CandidateDetailHeader } from "./sections/candidate-detail-header";
import { CandidateProfileCard } from "./sections/candidate-profile-card";
import { CandidateApplicationsTab } from "./sections/candidate-applications-tab";
import { CandidateDocumentsTab } from "./sections/candidate-documents-tab";
import { CandidateDocumentPreview } from "./sections/candidate-document-preview";
import { CandidateDetailModals } from "./modals/candidate-detail-modals";

export function CandidateDetailView() {
  const router = useRouter();
  const { t } = useI18n();

  const state = useCandidateDetailState();
  const docActions = useCandidateDocumentActions({
    candidate: state.candidate,
    documentFilter: state.documentFilter,
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
      router.push("/dashboard/candidates");
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

  if (state.loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
        <Navbar
          activeTab="candidates"
          onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
          jobsCount={state.jobs.length}
        />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if ((!state.isCandidateIdValid || !state.candidate) && !state.loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
        <Navbar
          activeTab="candidates"
          onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
          jobsCount={state.jobs.length}
        />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-16 text-center space-y-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 mb-1 border border-rose-200 dark:border-rose-900 shadow-xs">
            <span className="text-lg font-black">404</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("candidates.noCandidatesYet")}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {!state.isCandidateIdValid
              ? "The candidate ID provided is invalid. A valid UUID is required."
              : "The candidate you are looking for does not exist or has been removed."}
          </p>
          <div className="pt-2">
            <Button
              onClick={() => router.push("/dashboard/candidates")}
              variant="outline"
              className="text-xs font-semibold rounded-xl"
            >
              {t("common.back")}: {t("candidates.title")}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      <Navbar
        activeTab="candidates"
        onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
        jobsCount={state.jobs.length}
      />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto space-y-5">
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

        <CandidateProfileCard
          candidateName={state.candidateName}
          candidateEmail={state.candidateEmail}
          candidatePhone={state.candidatePhone}
          candidateNotes={state.candidate?.notes}
          gender={state.gender}
          dob={state.dob}
          candidateCreated={state.candidateCreated}
          candidateUpdated={state.candidateUpdated}
          parsedNotes={state.parsedNotes}
        />

        {/* Card 2: Tabs (Applications / Documents) */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-6 text-xs font-bold -mb-px">
              <button
                type="button"
                onClick={() => state.setActiveTab("applications")}
                className={`pb-3 pt-0.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  state.activeTab === "applications"
                    ? "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 font-bold"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-transparent font-medium"
                }`}
              >
                {t("candidates.applicationsTab")} ({state.candidateApps.length})
              </button>
              <button
                type="button"
                onClick={() => state.setActiveTab("documents")}
                className={`pb-3 pt-0.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  state.activeTab === "documents"
                    ? "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 font-bold"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-transparent font-medium"
                }`}
              >
                {t("candidates.documentsTab")} (
                {state.candidateDocuments.length})
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
            <>
              {docActions.previewDoc ? (
                <CandidateDocumentPreview
                  previewDoc={docActions.previewDoc}
                  onClose={() => docActions.setPreviewDoc(null)}
                  onDownload={() =>
                    docActions.handleDownloadDoc(
                      docActions.previewDoc!.url,
                      docActions.previewDoc!.name,
                      docActions.previewDoc!.sourceApplicationId,
                    )
                  }
                />
              ) : (
                <CandidateDocumentsTab
                  documentFilter={state.documentFilter}
                  setDocumentFilter={state.setDocumentFilter}
                  filteredDocuments={state.filteredDocuments}
                  canEdit={state.canEdit}
                  isUploadingDoc={docActions.isUploadingDoc}
                  docInputRef={docActions.docInputRef}
                  onDocumentUpload={docActions.handleDocumentUpload}
                  onPreviewDoc={(doc) => docActions.setPreviewDoc(doc)}
                  onDownloadDoc={docActions.handleDownloadDoc}
                  onDeleteDoc={(doc) => docActions.setDocToDelete(doc)}
                />
              )}
            </>
          )}
        </div>

        {/* Card 5: Activity & Email Timeline */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <CandidateTimeline
            candidateId={state.candidate?.id || state.candidateIdStr}
            candidateName={state.candidateName}
            candidateEmail={state.candidateEmail}
          />
        </div>
      </main>

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
    </div>
  );
}
