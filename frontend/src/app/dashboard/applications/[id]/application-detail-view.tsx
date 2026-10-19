import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/i18n";

import { useApplicationDetailState } from "./hooks/use-application-detail-state";
import { useApplicationStageActions } from "./hooks/use-application-stage-actions";
import { ApplicationStageBar } from "./sections/application-stage-bar";
import { ApplicationDetailHeader } from "./sections/application-detail-header";
import { ApplicationNavTabs } from "./sections/application-nav-tabs";
import { ApplicationTabContent } from "./sections/application-tab-content";
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
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
        <Navbar
          activeTab="applications"
          onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
          jobsCount={state.jobs.length}
        />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if ((!state.isAppIdValid || !state.app) && !state.loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
        <Navbar
          activeTab="applications"
          onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
          jobsCount={state.jobs.length}
        />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-16 text-center space-y-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 mb-1 border border-rose-200 dark:border-rose-900 shadow-xs">
            <span className="text-lg font-black">404</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("applications.applicationNotFound")}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {!state.isAppIdValid
              ? t("applications.invalidAppId")
              : t("applications.appNotFoundDesc")}
          </p>
          <div className="pt-2">
            <Button
              onClick={() => router.push("/dashboard/applications")}
              variant="outline"
              className="text-xs font-semibold rounded-xl"
            >
              {t("applications.backToApplications")}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        activeTab="applications"
        onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
        jobsCount={state.jobs.length}
      />

      {/* Main Container */}
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto space-y-5">
        {/* Back Link */}
        <div>
          <Link
            href="/dashboard/applications"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
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
          candidateEmail={state.candidateEmail}
          candidatePhone={state.candidatePhone}
          jobTitle={state.jobTitle}
          appliedDate={state.appliedDate}
          onOpenSendEmail={() => state.setIsSendEmailOpen(true)}
        />

        {/* Sub-Navigation Tabs */}
        <ApplicationNavTabs
          activeTab={state.activeTab}
          setActiveTab={state.setActiveTab}
          overviewSections={state.overviewSections}
          setOverviewSections={state.setOverviewSections}
          isOverviewPopoverOpen={state.isOverviewPopoverOpen}
          setIsOverviewPopoverOpen={state.setIsOverviewPopoverOpen}
          overviewBtnRef={state.overviewBtnRef}
          candidateDocumentsCount={state.candidateDocuments.length}
        />

        {/* Active Tab Body Content */}
        <ApplicationTabContent
          activeTab={state.activeTab}
          app={state.app}
          canEdit={state.canEdit}
          candidateDocuments={state.candidateDocuments}
          candidateName={state.candidateName}
          candidateEmail={state.candidateEmail}
          overviewSections={state.overviewSections}
          onPreviewDoc={(doc) => state.setPreviewDoc(doc)}
          onDownloadDoc={actions.handleDownloadDoc}
          onScheduleInterview={(intv) => {
            state.setEditingInterview(intv || null);
            state.setScheduleModalOpen(true);
          }}
          onCancelInterview={actions.handleCancelInterview}
        />
      </main>

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
