"use client";

import { SlideOver } from "@/components/shared/slide-over";
import {
  ApplicationStageBar,
  ApplicationDetailHeader,
  ApplicationDetailTabs,
  ApplicationDetailTabContent,
} from "@/components/applications/detail";
import { useLocalization } from "@/components/providers";
import { useI18n } from "@/i18n";
import { formatDate, getCandidateDisplayName, getInitials } from "@/lib/utils";
import { CandidateDrawerHeader } from "./candidate-drawer-header";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import type { Application, ApplicationStage, CandidateDocument } from "@/types";

interface CandidateQuickDrawerProps {
  selectedApp: Application | null;
  currentApp: Application | null;
  onClose: () => void;
  onViewInPipeline?: (appId: string, stage: ApplicationStage) => void;
  selectedJobTitle: string;
  drawerTab: string;
  onTabChange: (tab: string) => void;
  allScheduledInterviews: ScheduledInterviewInfo[];
  drawerCandidateDocuments: CandidateDocument[];
  notesCount?: number;
  onScheduleInterview: (intv?: ScheduledInterviewInfo) => void;
  onCancelInterview: (interviewOrId?: ScheduledInterviewInfo | string) => void;
  onPreviewDoc: (doc: CandidateDocument) => void;
  onDownloadDoc: (
    url: string,
    filename?: string,
    targetAppId?: string,
  ) => Promise<void>;
  onOpenSendEmail?: () => void;
  onStageChange: (newStage: ApplicationStage) => void;
  isStageUpdatePending: boolean;
  onOpenDeleteModal: (app: Application) => void;
  isDeleting: boolean;
  canEdit?: boolean;
}

export function CandidateQuickDrawer({
  selectedApp,
  currentApp,
  onClose,
  onViewInPipeline,
  selectedJobTitle,
  drawerTab,
  onTabChange,
  allScheduledInterviews,
  drawerCandidateDocuments,
  notesCount,
  onScheduleInterview,
  onCancelInterview,
  onPreviewDoc,
  onDownloadDoc,
  onOpenSendEmail,
  onStageChange,
  isStageUpdatePending,
  onOpenDeleteModal,
  isDeleting,
  canEdit,
}: CandidateQuickDrawerProps) {
  const { locale } = useI18n();
  const { localization, isConfigured } = useLocalization();

  if (!selectedApp || !currentApp) return null;

  const locOverrides = isConfigured
    ? { ...localization, defaultLanguage: locale }
    : { defaultLanguage: locale };
  const displayName = getCandidateDisplayName(currentApp, localization);
  const candidateEmail =
    currentApp.candidateEmail || currentApp.candidate?.email || "";
  const candidatePhone =
    currentApp.candidatePhone || currentApp.candidate?.phone || undefined;
  const appliedDate = formatDate(currentApp.createdAt, "numeric", locOverrides);

  return (
    <SlideOver
      isOpen={Boolean(selectedApp && currentApp)}
      onClose={onClose}
      size="2xl"
      ariaLabel={displayName}
    >
      {/* Drawer Top Navigation Bar (Pinned) */}
      <CandidateDrawerHeader
        currentApp={currentApp}
        drawerTab={drawerTab}
        onClose={onClose}
        onViewInPipeline={onViewInPipeline}
      />

      {/* Drawer Content (Summary + Tabs Scroll Naturally) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
        <ApplicationStageBar
          app={currentApp}
          isUpdatingStage={isStageUpdatePending}
          isDeleting={isDeleting}
          onSelectStage={onStageChange}
          onOpenDeleteModal={() => onOpenDeleteModal(currentApp)}
        />

        <ApplicationDetailHeader
          initials={getInitials(displayName)}
          candidateName={displayName}
          stage={currentApp.stage}
          rejectionReason={currentApp.rejectionReason}
          candidateEmail={candidateEmail}
          candidatePhone={candidatePhone}
          jobTitle={selectedJobTitle}
          appliedDate={appliedDate}
          onOpenSendEmail={onOpenSendEmail}
          headingLevel="h2"
        />

        <ApplicationDetailTabs
          activeTab={drawerTab}
          onSelectTab={onTabChange}
          interviewsCount={allScheduledInterviews.length}
          documentsCount={drawerCandidateDocuments.length}
          notesCount={notesCount}
        />

        <ApplicationDetailTabContent
          activeTab={drawerTab}
          app={currentApp}
          canEdit={Boolean(canEdit)}
          candidateDocuments={drawerCandidateDocuments}
          candidateName={displayName}
          candidateEmail={candidateEmail}
          candidateInterviews={currentApp.interviews}
          onPreviewDoc={onPreviewDoc}
          onDownloadDoc={onDownloadDoc}
          onScheduleInterview={onScheduleInterview}
          onCancelInterview={onCancelInterview}
        />
      </div>
    </SlideOver>
  );
}
