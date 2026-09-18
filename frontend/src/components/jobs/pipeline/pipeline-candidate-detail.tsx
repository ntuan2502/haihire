"use client";

import { type RefObject } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  History,
  Mail,
  Phone,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StageBadge } from "@/components/shared/stage-badge";
import { ApplicationDocumentsSection } from "@/components/applications/application-documents-section";
import { CandidateInterviewsList } from "@/components/interviews/candidate-interviews-list";
import {
  OverviewSectionsPopover,
  type OverviewSectionsState,
} from "@/components/applications/overview-sections-popover";
import type { Application, ApplicationStage, CandidateDocument, Interview, Job } from "@/types";
import { PIPELINE_STAGES, type StageConfig } from "@/lib/stages";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import {
  formatDate,
  getCandidateDisplayName,
  getInitials,
} from "@/lib/utils";
import { useI18n } from "@/i18n";

interface PipelineCandidateDetailProps {
  selectedCandidate: Application | null;
  currentStageConfig: StageConfig;
  mobileDetailOpen: boolean;
  onCloseMobileDetail: () => void;
  job: Job | null;
  canEdit: boolean;
  isMovingStage: boolean;
  onMoveStage: (newStage: ApplicationStage) => void;
  currentIndex: number;
  totalCandidates: number;
  onPrevCandidate: () => void;
  onNextCandidate: () => void;
  candidateTab: string;
  onSelectTab: (tab: string) => void;
  overviewSections: OverviewSectionsState;
  onToggleOverviewSection: (key: keyof OverviewSectionsState) => void;
  isOverviewPopoverOpen: boolean;
  onToggleOverviewPopover: () => void;
  onCloseOverviewPopover: () => void;
  overviewBtnRef: RefObject<HTMLButtonElement | null>;
  candidateDocuments: CandidateDocument[];
  onPreviewDoc: (doc: CandidateDocument) => void;
  onDownloadDoc: (url: string, filename?: string) => void;
  candidateInterviews: Interview[];
  onScheduleInterview: (interview?: ScheduledInterviewInfo) => void;
  candidateNotesList: string[];
  candidateNoteInput: string;
  onChangeNoteInput: (val: string) => void;
  onAddNote: () => void;
  isUpdatingNote: boolean;
  onDeleteApplication: () => void;
}

export function PipelineCandidateDetail({
  selectedCandidate,
  currentStageConfig,
  mobileDetailOpen,
  onCloseMobileDetail,
  job,
  canEdit,
  isMovingStage,
  onMoveStage,
  currentIndex,
  totalCandidates,
  onPrevCandidate,
  onNextCandidate,
  candidateTab,
  onSelectTab,
  overviewSections,
  onToggleOverviewSection,
  isOverviewPopoverOpen,
  onToggleOverviewPopover,
  onCloseOverviewPopover,
  overviewBtnRef,
  candidateDocuments,
  onPreviewDoc,
  onDownloadDoc,
  candidateInterviews,
  onScheduleInterview,
  candidateNotesList,
  candidateNoteInput,
  onChangeNoteInput,
  onAddNote,
  isUpdatingNote,
  onDeleteApplication,
}: PipelineCandidateDetailProps) {
  const { t } = useI18n();

  return (
    <section
      className={`flex-1 min-h-0 h-full overflow-y-auto bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 ${
        mobileDetailOpen ? "block" : "hidden md:block"
      }`}
    >
      {selectedCandidate ? (
        <div className="max-w-4xl mx-auto space-y-5 pb-12">
          {/* Mobile Back Button to return to list */}
          <div className="md:hidden pb-1">
            <button
              type="button"
              onClick={onCloseMobileDetail}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t("applications.backToApplications")}</span>
            </button>
          </div>

          {/* Quick Stage Transition Buttons (Admins only) */}
          {canEdit && (
            <div className="flex items-center justify-end gap-2 flex-wrap">
              {PIPELINE_STAGES.filter(
                (stage) => stage.id !== selectedCandidate.stage,
              ).map((stage) => (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => onMoveStage(stage.id)}
                  disabled={isMovingStage}
                  className={`h-8 px-3.5 rounded-xl ${stage.btnBg} ${stage.btnHover} text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50`}
                >
                  <span>{stage.actionLabel}</span>
                  <span className="h-4 w-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center">
                    {stage.stepNumber}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Candidate Info Header Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-full bg-blue-600 text-white font-bold text-base flex items-center justify-center shadow-xs shrink-0">
                  {getInitials(getCandidateDisplayName(selectedCandidate))}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      {getCandidateDisplayName(selectedCandidate)}
                    </h2>
                    <StageBadge stage={selectedCandidate.stage} />
                  </div>

                  {/* Contact metadata row */}
                  <div className="flex items-center gap-3.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    {selectedCandidate.candidateEmail && (
                      <a
                        href={`mailto:${selectedCandidate.candidateEmail}`}
                        className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                      >
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{selectedCandidate.candidateEmail}</span>
                      </a>
                    )}

                    {selectedCandidate.candidatePhone && (
                      <a
                        href={`tel:${selectedCandidate.candidatePhone}`}
                        className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{selectedCandidate.candidatePhone}</span>
                      </a>
                    )}

                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>
                        {t("applications.applied")}{" "}
                        {formatDate(selectedCandidate.createdAt)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation arrows (1/X) and popout link */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <button
                  type="button"
                  onClick={onPrevCandidate}
                  disabled={currentIndex <= 0}
                  className="h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title={t("common.back")}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>

                <span className="px-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {currentIndex + 1} / {totalCandidates}
                </span>

                <button
                  type="button"
                  onClick={onNextCandidate}
                  disabled={currentIndex >= totalCandidates - 1}
                  className="h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title={t("common.next")}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>

                <Link
                  href={`/dashboard/applications/${selectedCandidate.id}`}
                  className="h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
                  title={t("applications.openFullPage")}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>

                {canEdit && (
                  <button
                    type="button"
                    onClick={onDeleteApplication}
                    className="h-7 w-7 rounded-lg border border-red-200 dark:border-red-900/60 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors ml-1 cursor-pointer"
                    title={t("common.delete")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto text-xs font-semibold scrollbar-none">
            {/* Overview tab with Popover */}
            <div
              className={`relative flex items-center border-b-2 -mb-[1px] transition-colors ${
                candidateTab === "overview"
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-semibold"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  onSelectTab("overview");
                  onCloseOverviewPopover();
                }}
                className={`py-2.5 cursor-pointer whitespace-nowrap ${
                  candidateTab === "overview" ? "pl-3.5 pr-1" : "px-3.5"
                }`}
              >
                {t("applications.tabs.overview")}
              </button>

              {candidateTab === "overview" && (
                <button
                  ref={overviewBtnRef}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleOverviewPopover();
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mr-2 cursor-pointer"
                  title={t("applications.sections.sectionsTitle")}
                >
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      isOverviewPopoverOpen ? "rotate-180 text-blue-600" : ""
                    }`}
                  />
                </button>
              )}

              {/* Popover */}
              <OverviewSectionsPopover
                isOpen={isOverviewPopoverOpen}
                onClose={onCloseOverviewPopover}
                triggerRef={overviewBtnRef}
                sections={overviewSections}
                onToggleSection={onToggleOverviewSection}
              />
            </div>

            {/* Other tabs */}
            {[
              { id: "documents", label: t("applications.tabs.documents"), count: candidateDocuments.length },
              { id: "interviews", label: t("applications.tabs.interviews"), count: candidateInterviews.length },
              { id: "notes", label: t("applications.tabs.notes"), count: candidateNotesList.length },
              { id: "timeline", label: t("applications.tabs.timeline") },
              { id: "properties", label: t("applications.sections.properties") },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`px-3.5 py-2.5 border-b-2 -mb-[1px] transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  candidateTab === tab.id
                    ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-semibold"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Active Tab Body */}
          <div className="space-y-5">
            {/* Overview Tab */}
            {candidateTab === "overview" && (
              <div className="space-y-5">
                {overviewSections.ai && (
                  <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <Sparkles className="h-4 w-4 text-emerald-500" />
                        <span>{t("applications.matchScore")}</span>
                      </div>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {selectedCandidate.matchScore || 75}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${selectedCandidate.matchScore || 75}%` }}
                      />
                    </div>
                  </div>
                )}

                {overviewSections.documents && (
                  <ApplicationDocumentsSection
                    documents={candidateDocuments}
                    onPreview={onPreviewDoc}
                    onDownload={onDownloadDoc}
                    appId={selectedCandidate.id}
                  />
                )}

                {overviewSections.interviews && (
                  <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {t("applications.tabs.interviews")}
                      </h3>
                      {canEdit && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onScheduleInterview()}
                          className="h-7 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                        >
                          {t("interviews.scheduleInterview")}
                        </Button>
                      )}
                    </div>
                    <CandidateInterviewsList
                      application={selectedCandidate}
                      interviews={candidateInterviews}
                      onSchedule={onScheduleInterview}
                      canEdit={canEdit}
                      showSectionHeader={false}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Documents Tab */}
            {candidateTab === "documents" && (
              <ApplicationDocumentsSection
                documents={candidateDocuments}
                onPreview={onPreviewDoc}
                onDownload={onDownloadDoc}
                appId={selectedCandidate.id}
              />
            )}

            {/* Interviews Tab */}
            {candidateTab === "interviews" && (
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t("applications.tabs.interviews")}
                  </h3>
                  {canEdit && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onScheduleInterview()}
                      className="h-7 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      {t("interviews.scheduleInterview")}
                    </Button>
                  )}
                </div>
                <CandidateInterviewsList
                  application={selectedCandidate}
                  interviews={candidateInterviews}
                  onSchedule={onScheduleInterview}
                  canEdit={canEdit}
                  showSectionHeader={false}
                />
              </div>
            )}

            {/* Notes Tab */}
            {candidateTab === "notes" && (
              <div className="space-y-4">
                {canEdit && (
                  <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                    <textarea
                      rows={3}
                      value={candidateNoteInput}
                      onChange={(e) => onChangeNoteInput(e.target.value)}
                      placeholder={t("pipeline.writePrivateNotePlaceholder")}
                      className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        onClick={onAddNote}
                        disabled={!candidateNoteInput.trim() || isUpdatingNote}
                        className="h-7 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                      >
                        {t("pipeline.saveNote")}
                      </Button>
                    </div>
                  </div>
                )}

                {candidateNotesList.length > 0 && (
                  <div className="space-y-2">
                    {candidateNotesList.map((n, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300"
                      >
                        {n}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Timeline Tab */}
            {candidateTab === "timeline" && (
              <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-center space-y-3">
                <History className="h-8 w-8 text-slate-400 mx-auto" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t("applications.timelineTitle")}
                </h4>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  {t("pipeline.timelineApplied", {
                    job: job?.title || "",
                    date: formatDate(selectedCandidate.createdAt),
                  })}
                </p>
              </div>
            )}

            {/* Properties Tab */}
            {candidateTab === "properties" && (
              <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                  <span>{t("applications.sections.properties")}</span>
                </h4>
                <p className="text-xs text-slate-400">
                  {t("pipeline.noCustomProperties")}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty state when no candidate is in stage */
        <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-2">
            <User className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {t("pipeline.noCandidatesInStage", {
              stage: currentStageConfig.label,
            })}
          </h3>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            {t("pipeline.switchStageHint")}
          </p>
        </div>
      )}
    </section>
  );
}
