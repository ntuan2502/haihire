"use client";

import { ChevronDown } from "lucide-react";
import { SlideOver } from "@/components/shared/slide-over";
import { getCandidateDisplayName } from "@/lib/utils";
import {
  OverviewSectionsPopover,
  type OverviewSectionsState,
} from "@/components/applications/overview-sections-popover";
import {
  CandidateDrawerHeader,
  CandidateDrawerSummary,
} from "./candidate-drawer-header";
import { CandidateOverviewTab } from "./candidate-overview-tab";
import { CandidateNotesTab } from "./candidate-notes-tab";
import { CandidateInterviewsTab } from "./candidate-interviews-tab";
import { CandidateDocumentsTab } from "./candidate-documents-tab";
import {
  CandidateAiTab,
  CandidateResponsesTab,
  CandidateInboxTab,
  CandidateTimelineTab,
} from "./candidate-misc-tabs";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import type { Application, ApplicationStage, CandidateDocument } from "@/types";
import { useI18n } from "@/i18n";
import { type RefObject } from "react";

interface CandidateQuickDrawerProps {
  selectedApp: Application | null;
  currentApp: Application | null;
  onClose: () => void;
  onViewInPipeline?: (appId: string, stage: ApplicationStage) => void;
  selectedJobTitle: string;
  drawerTab: string;
  onTabChange: (tab: string) => void;
  drawerOverviewSections: OverviewSectionsState;
  onToggleOverviewSection: (key: keyof OverviewSectionsState) => void;
  isDrawerOverviewPopoverOpen: boolean;
  onToggleDrawerOverviewPopover: () => void;
  onCloseDrawerOverviewPopover: () => void;
  drawerOverviewBtnRef: RefObject<HTMLButtonElement | null>;
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
  onOpenScheduleModal: () => void;
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
  drawerOverviewSections,
  onToggleOverviewSection,
  isDrawerOverviewPopoverOpen,
  onToggleDrawerOverviewPopover,
  onCloseDrawerOverviewPopover,
  drawerOverviewBtnRef,
  allScheduledInterviews,
  drawerCandidateDocuments,
  onScheduleInterview,
  onCancelInterview,
  onPreviewDoc,
  onDownloadDoc,
  onStageChange,
  isStageUpdatePending,
  onOpenScheduleModal,
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
          onOpenScheduleModal={onOpenScheduleModal}
          onOpenDeleteModal={onOpenDeleteModal}
          isDeleting={isDeleting}
        />
        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-border overflow-x-auto text-xs font-semibold scrollbar-none">
          <div
            className={`relative flex items-center border-b-2 -mb-[1px] transition-colors ${
              drawerTab === "overview"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground font-semibold"
            }`}
          >
            <button
              type="button"
              onClick={() => {
                onTabChange("overview");
                onCloseDrawerOverviewPopover();
              }}
              className={`py-2 cursor-pointer whitespace-nowrap ${
                drawerTab === "overview" ? "pl-3 pr-1" : "px-3"
              }`}
            >
              {t("applications.tabs.overview")}
            </button>

            {drawerTab === "overview" && (
              <button
                ref={drawerOverviewBtnRef}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleDrawerOverviewPopover();
                }}
                className="py-2 pr-2 pl-0.5 cursor-pointer flex items-center justify-center text-primary hover:text-primary/80"
                aria-label={t("applications.toggleSections")}
                title={t("applications.toggleSections")}
              >
                <ChevronDown
                  className={`h-3 w-3 transition-transform duration-200 ${
                    isDrawerOverviewPopoverOpen ? "rotate-180" : "rotate-0"
                  }`}
                />
              </button>
            )}

            <OverviewSectionsPopover
              isOpen={isDrawerOverviewPopoverOpen}
              onClose={onCloseDrawerOverviewPopover}
              sections={drawerOverviewSections}
              onToggleSection={onToggleOverviewSection}
              triggerRef={drawerOverviewBtnRef}
            />
          </div>

          {[
            { id: "inbox", label: t("applications.tabs.inbox") },
            { id: "ai", label: t("applications.tabs.ai") },
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
            { id: "responses", label: t("applications.tabs.responses") },
            { id: "notes", label: t("applications.tabs.notes") },
            { id: "timeline", label: t("applications.tabs.timeline") },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onTabChange(tab.id);
                onCloseDrawerOverviewPopover();
              }}
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
              drawerOverviewSections={drawerOverviewSections}
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

          {drawerTab === "ai" && <CandidateAiTab />}

          {drawerTab === "responses" && (
            <CandidateResponsesTab currentApp={currentApp} />
          )}

          {drawerTab === "notes" && (
            <CandidateNotesTab applicationId={currentApp.id} />
          )}

          {drawerTab === "inbox" && <CandidateInboxTab />}

          {drawerTab === "timeline" && (
            <CandidateTimelineTab currentApp={currentApp} />
          )}
        </div>
      </div>
    </SlideOver>
  );
}
