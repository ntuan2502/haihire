"use client";

import { SlideOver } from "@/components/shared/slide-over";
import { getCandidateDisplayName } from "@/lib/utils";
import {
  CandidateDrawerHeader,
  CandidateDrawerSummary,
} from "./candidate-drawer-header";
import { CandidateOverviewTab } from "./candidate-overview-tab";
import { CandidateNotesTab } from "./candidate-notes-tab";
import { CandidateInterviewsTab } from "./candidate-interviews-tab";
import { CandidateDocumentsTab } from "./candidate-documents-tab";
import { CandidateTimelineTab } from "./candidate-misc-tabs";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import type { Application, ApplicationStage, CandidateDocument } from "@/types";
import { useI18n } from "@/i18n";

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
  onScheduleInterview: (intv?: ScheduledInterviewInfo) => void;
  onCancelInterview: (interviewOrId?: ScheduledInterviewInfo | string) => void;
  onPreviewDoc: (doc: CandidateDocument) => void;
  onDownloadDoc: (
    url: string,
    filename?: string,
    targetAppId?: string,
  ) => Promise<void>;
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
  onScheduleInterview,
  onCancelInterview,
  onPreviewDoc,
  onDownloadDoc,
  onStageChange,
  isStageUpdatePending,
  onOpenDeleteModal,
  isDeleting,
  canEdit,
}: CandidateQuickDrawerProps) {
  const { t } = useI18n();

  if (!selectedApp || !currentApp) return null;

  return (
    <SlideOver
      isOpen={Boolean(selectedApp && currentApp)}
      onClose={onClose}
      size="2xl"
      ariaLabel={getCandidateDisplayName(currentApp)}
    >
      {/* Drawer Top Navigation Bar (Pinned) */}
      <CandidateDrawerHeader
        currentApp={currentApp}
        onClose={onClose}
        onViewInPipeline={onViewInPipeline}
      />

      {/* Drawer Content (Summary + Tabs Scroll Naturally) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
        <CandidateDrawerSummary
          currentApp={currentApp}
          selectedJobTitle={selectedJobTitle}
          onStageChange={onStageChange}
          isStageUpdatePending={isStageUpdatePending}
          onOpenDeleteModal={onOpenDeleteModal}
          isDeleting={isDeleting}
        />
        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-border overflow-x-auto text-xs font-semibold scrollbar-none">
          {[
            { id: "overview", label: t("applications.tabs.overview") },
            {
              id: "interviews",
              label:
                allScheduledInterviews.length > 0
                  ? `${t("applications.tabs.interviews")} (${allScheduledInterviews.length})`
                  : t("applications.tabs.interviews"),
            },
            {
              id: "documents",
              label: `${t("applications.tabs.documents")} (${drawerCandidateDocuments.length})`,
            },
            { id: "notes", label: t("applications.tabs.notes") },
            { id: "timeline", label: t("applications.tabs.timeline") },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`px-3 py-2 flex items-center gap-1 whitespace-nowrap transition-colors border-b-2 -mb-[1px] cursor-pointer ${
                drawerTab === tab.id
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Sections */}
        <div className="space-y-4">
          {drawerTab === "overview" && (
            <CandidateOverviewTab
              currentApp={currentApp}
              drawerCandidateDocuments={drawerCandidateDocuments}
              onScheduleInterview={onScheduleInterview}
              onCancelInterview={onCancelInterview}
              onPreviewDoc={onPreviewDoc}
              onDownloadDoc={onDownloadDoc}
              canEdit={canEdit}
            />
          )}

          {drawerTab === "documents" && (
            <CandidateDocumentsTab
              documents={drawerCandidateDocuments}
              appId={currentApp.id}
              onPreview={onPreviewDoc}
              onDownload={onDownloadDoc}
            />
          )}

          {drawerTab === "interviews" && (
            <CandidateInterviewsTab
              application={currentApp}
              onSchedule={onScheduleInterview}
              onCancelInterview={onCancelInterview}
              canEdit={canEdit}
            />
          )}

          {drawerTab === "notes" && (
            <CandidateNotesTab applicationId={currentApp.id} />
          )}

          {drawerTab === "timeline" && (
            <CandidateTimelineTab currentApp={currentApp} />
          )}
        </div>
      </div>
    </SlideOver>
  );
}
