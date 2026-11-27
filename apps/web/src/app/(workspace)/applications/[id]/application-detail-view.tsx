import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { StatusState } from "@/components/shared/status-state";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/i18n";

import { useApplicationDetailState } from "./hooks/use-application-detail-state";
import { useApplicationStageActions } from "./hooks/use-application-stage-actions";
import {
  ApplicationStageBar,
  ApplicationDetailHeader,
  ApplicationDetailTabs,
  ApplicationDetailTabContent,
} from "@/components/applications/detail";
import { ApplicationDetailModals } from "./modals/application-detail-modals";

export function ApplicationDetailView() {
  const router = useRouter();
  const { t } = useI18n();

  const state = useApplicationDetailState();
  const actions = useApplicationStageActions({
    app: state.app,
    appIdStr: state.appIdStr,
    setIsDeleteModalOpen: state.setIsDeleteModalOpen,
  });

  if (state.loading) {
    return <LoadingSpinner />;
  }

  if ((!state.isAppIdValid || !state.app) && !state.loading) {
    return (
      <div className="flex-1 flex flex-col">
        <StatusState
          status="404"
          variant="page"
          title={t("applications.applicationNotFound")}
          description={
            !state.isAppIdValid
              ? t("applications.invalidAppId")
              : t("applications.appNotFoundDesc")
          }
          actionLabel={t("applications.backToApplications")}
          onAction={() => router.push("/applications")}
          actionVariant="outline"
          actionIcon={ArrowLeft}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full p-4 sm:p-6 space-y-5">
      {/* Back Link */}
      <div>
        <Link
          href="/applications"
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{t("applications.backToApplications")}</span>
        </Link>
      </div>

      {/* Stage Action Pipeline Bar */}
      <ApplicationStageBar
        app={state.app}
        isUpdatingStage={actions.isUpdatingStage}
        isDeleting={actions.isDeleting}
        onSelectStage={actions.handleStageChange}
        onOpenDeleteModal={() => state.setIsDeleteModalOpen(true)}
      />

      {/* Candidate Header Card */}
      <ApplicationDetailHeader
        initials={state.initials}
        candidateName={state.candidateName}
        stage={state.app?.stage}
        rejectionReason={state.app?.rejectionReason}
        candidateEmail={state.candidateEmail}
        candidatePhone={state.candidatePhone}
        jobTitle={state.jobTitle}
        appliedDate={state.appliedDate}
        onOpenSendEmail={() => state.setIsSendEmailOpen(true)}
      />

      {/* Sub-Navigation Tabs */}
      <ApplicationDetailTabs
        activeTab={state.activeTab}
        onSelectTab={state.setActiveTab}
        interviewsCount={state.app?.interviews?.length ?? 0}
        documentsCount={state.candidateDocuments.length}
        notesCount={state.notesCount}
      />

      {/* Active Tab Body Content */}
      <ApplicationDetailTabContent
        activeTab={state.activeTab}
        app={state.app}
        canEdit={state.canEdit}
        candidateDocuments={state.candidateDocuments}
        candidateName={state.candidateName}
        candidateEmail={state.candidateEmail}
        onPreviewDoc={(doc) => state.setPreviewDoc(doc)}
        onDownloadDoc={actions.handleDownloadDoc}
        onScheduleInterview={(intv) => {
          state.setEditingInterview(intv || null);
          state.setScheduleModalOpen(true);
        }}
        onCancelInterview={actions.handleCancelInterview}
      />

      {/* Modals Orchestration */}
      <ApplicationDetailModals
        app={state.app}
        jobs={state.jobs}
        job={state.job}
        candidateName={state.candidateName}
        candidateEmail={state.candidateEmail}
        candidatePhone={state.candidatePhone}
        jobTitle={state.jobTitle}
        previewDoc={state.previewDoc}
        onClosePreviewDoc={() => state.setPreviewDoc(null)}
        onDownloadDoc={actions.handleDownloadDoc}
        isDeleteModalOpen={state.isDeleteModalOpen}
        onCloseDeleteModal={() => state.setIsDeleteModalOpen(false)}
        onConfirmDelete={actions.handleConfirmDelete}
        isDeleting={actions.isDeleting}
        isRejectModalOpen={actions.isRejectModalOpen}
        onCloseRejectModal={() => actions.setIsRejectModalOpen(false)}
        onConfirmReject={actions.handleConfirmReject}
        isOfferModalOpen={actions.isOfferModalOpen}
        onCloseOfferModal={() => actions.setIsOfferModalOpen(false)}
        onConfirmOffer={actions.handleConfirmOffer}
        isUpdatingStage={actions.isUpdatingStage}
        scheduleModalOpen={state.scheduleModalOpen}
        onCloseScheduleModal={() => {
          state.setScheduleModalOpen(false);
          state.setEditingInterview(null);
        }}
        editingInterview={state.editingInterview}
        isSendEmailOpen={state.isSendEmailOpen}
        onCloseSendEmailModal={() => state.setIsSendEmailOpen(false)}
      />
    </div>
  );
}
