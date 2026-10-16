"use client";

import { ChevronDown } from "lucide-react";
import { SlideOver } from "@/components/shared/slide-over";
import {
  OverviewSectionsPopover,
  type OverviewSectionsState,
} from "@/components/applications/overview-sections-popover";
import { CandidateDrawerHeader } from "./candidate-drawer-header";
import { CandidateOverviewTab } from "./candidate-overview-tab";
import { CandidateNotesTab } from "./candidate-notes-tab";
import { CandidateInterviewsTab } from "./candidate-interviews-tab";
import { CandidateDocumentsTab } from "./candidate-documents-tab";
import {
  CandidateAiTab,
  CandidateResponsesTab,
  CandidateInboxTab,
  CandidateTimelineTab,
  CandidatePropertiesTab,
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
  drawerNotesList: string[];
  drawerNoteInput: string;
  onDrawerNoteInputChange: (val: string) => void;
  onAddDrawerNote: () => void;
  onScheduleInterview: (intv?: ScheduledInterviewInfo) => void;
  onCancelInterview: (interviewOrId?: ScheduledInterviewInfo | string) => void;
  onPreviewDoc: (doc: CandidateDocument) => void;
  onDownloadDoc: (url: string, filename?: string, targetAppId?: string) => Promise<void>;
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
  drawerNotesList,
  drawerNoteInput,
  onDrawerNoteInputChange,
  onAddDrawerNote,
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
      maxWidth="max-w-2xl"
    >
      {/* Drawer Top Navigation Bar & Candidate Header */}
      <CandidateDrawerHeader
        currentApp={currentApp}
        onClose={onClose}
        onViewInPipeline={onViewInPipeline}
        selectedJobTitle={selectedJobTitle}
        onStageChange={onStageChange}
        isStageUpdatePending={isStageUpdatePending}
        onOpenScheduleModal={onOpenScheduleModal}
        onOpenDeleteModal={onOpenDeleteModal}
        isDeleting={isDeleting}
      />

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto text-xs font-semibold scrollbar-none">
          <div
            className={`relative flex items-center border-b-2 -mb-[1px] transition-colors ${
              drawerTab === "overview"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-semibold"
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
                className="py-2 pr-2 pl-0.5 cursor-pointer flex items-center justify-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                aria-label="Toggle overview sections"
                title="Toggle overview sections"
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
            { id: "properties", label: t("applications.tabs.properties") },
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
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
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
              drawerNotesList={drawerNotesList}
              drawerNoteInput={drawerNoteInput}
              onDrawerNoteInputChange={onDrawerNoteInputChange}
              onAddDrawerNote={onAddDrawerNote}
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
              notes={currentApp.notes}
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
            <CandidateNotesTab
              notesList={drawerNotesList}
              noteInput={drawerNoteInput}
              onNoteInputChange={onDrawerNoteInputChange}
              onAddNote={onAddDrawerNote}
            />
          )}

          {drawerTab === "inbox" && <CandidateInboxTab />}

          {drawerTab === "timeline" && (
            <CandidateTimelineTab currentApp={currentApp} />
          )}

          {drawerTab === "properties" && <CandidatePropertiesTab />}
        </div>
      </div>
    </SlideOver>
  );
}
