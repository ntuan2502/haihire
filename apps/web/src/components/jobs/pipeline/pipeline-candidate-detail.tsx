"use client";

import { ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApplicationDocumentsSection } from "@/components/applications/application-documents-section";
import { CandidateInterviewsList } from "@/components/interviews/candidate-interviews-list";
import { ApplicationNotesStream } from "@/components/applications/application-notes-stream";
import { CandidateTimeline } from "@/components/timeline/candidate-timeline";
import type {
  Application,
  ApplicationStage,
  CandidateDocument,
  Interview,
  Job,
} from "@/types";
import type { StageConfig } from "@/lib/stages";
import { StageSelector } from "./stage-selector";
import { PipelineCandidateDetailHeader } from "./pipeline-candidate-detail-header";
import { PipelineCandidateDetailOverview } from "./pipeline-candidate-detail-overview";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import { useHasPermission } from "@/hooks/use-has-permission";
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
  candidateDocuments: CandidateDocument[];
  onPreviewDoc: (doc: CandidateDocument) => void;
  onDownloadDoc: (url: string, filename?: string) => void;
  candidateInterviews: Interview[];
  onScheduleInterview: (interview?: ScheduledInterviewInfo) => void;
  candidateNotesList?: string[];
  candidateNoteInput?: string;
  onChangeNoteInput?: (val: string) => void;
  onAddNote?: () => void;
  isUpdatingNote?: boolean;
  onDeleteApplication: () => void;
}

export function PipelineCandidateDetail({
  selectedCandidate,
  currentStageConfig,
  mobileDetailOpen,
  onCloseMobileDetail,
  job,
  canEdit: _canEdit,
  isMovingStage,
  onMoveStage,
  currentIndex,
  totalCandidates,
  onPrevCandidate,
  onNextCandidate,
  candidateTab,
  onSelectTab,
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
  const canUpdateStage = useHasPermission("application:update_stage");
  const canCreateInterview = useHasPermission("interview:create");
  const canUpdateApplication = useHasPermission("application:update");

  return (
    <section
      className={`flex-1 min-h-0 h-full overflow-y-auto bg-background p-4 sm:p-6 ${
        mobileDetailOpen ? "block" : "hidden md:block"
      }`}
    >
      {selectedCandidate ? (
        <div className="w-full space-y-5 pb-12">
          {/* Mobile Back Button to return to list */}
          <div className="md:hidden pb-1">
            <button
              type="button"
              onClick={onCloseMobileDetail}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-card border border-border text-xs font-medium text-foreground shadow-2xs cursor-pointer hover:bg-accent transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t("applications.backToApplications")}</span>
            </button>
          </div>

          {/* Quick Stage Transition Buttons with State Machine Prevention */}
          {canUpdateStage && (
            <div className="flex items-center justify-end gap-2 flex-wrap">
              <StageSelector
                currentStage={selectedCandidate.stage}
                onSelectStage={onMoveStage}
                disabled={isMovingStage}
                variant="buttons"
              />
            </div>
          )}

          {/* Candidate Info Header Card */}
          <PipelineCandidateDetailHeader
            selectedCandidate={selectedCandidate}
            currentIndex={currentIndex}
            totalCandidates={totalCandidates}
            onPrevCandidate={onPrevCandidate}
            onNextCandidate={onNextCandidate}
            onDeleteApplication={onDeleteApplication}
          />

          {/* Sub-Navigation Tabs */}
          <div className="flex items-center gap-1 border-b border-border overflow-x-auto text-xs font-semibold scrollbar-none">
            {[
              {
                id: "overview",
                label: t("applications.tabs.overview"),
              },
              {
                id: "documents",
                label: t("applications.tabs.documents"),
                count: candidateDocuments.length,
              },
              {
                id: "interviews",
                label: t("applications.tabs.interviews"),
                count: candidateInterviews.length,
              },
              {
                id: "notes",
                label: t("applications.tabs.notes"),
                count: candidateNotesList?.length,
              },
              { id: "timeline", label: t("applications.tabs.timeline") },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`px-3.5 py-2.5 border-b-2 -mb-[1px] transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  candidateTab === tab.id
                    ? "border-primary text-foreground font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground font-medium"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground font-semibold">
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
              <PipelineCandidateDetailOverview
                selectedCandidate={selectedCandidate}
                candidateDocuments={candidateDocuments}
                onPreviewDoc={onPreviewDoc}
                onDownloadDoc={onDownloadDoc}
                candidateInterviews={candidateInterviews}
                onScheduleInterview={onScheduleInterview}
              />
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
              <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("applications.tabs.interviews")}
                  </h3>
                  {canCreateInterview && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onScheduleInterview()}
                      className="h-7 text-xs cursor-pointer"
                    >
                      {t("interviews.scheduleInterview")}
                    </Button>
                  )}
                </div>
                <CandidateInterviewsList
                  application={selectedCandidate}
                  interviews={candidateInterviews}
                  onSchedule={onScheduleInterview}
                  canEdit={canCreateInterview}
                  showSectionHeader={false}
                />
              </div>
            )}

            {/* Notes Tab */}
            {candidateTab === "notes" && (
              <div className="pt-1">
                {selectedCandidate?.id && !candidateNotesList ? (
                  <ApplicationNotesStream
                    applicationId={selectedCandidate.id}
                    compact={false}
                    showHeader={false}
                  />
                ) : (
                  <div className="space-y-4">
                    {canUpdateApplication && onChangeNoteInput && onAddNote && (
                      <div className="rounded-xl border border-border bg-card text-card-foreground p-4 shadow-xs space-y-3">
                        <textarea
                          rows={3}
                          value={candidateNoteInput || ""}
                          onChange={(e) => onChangeNoteInput(e.target.value)}
                          placeholder={t(
                            "pipeline.writePrivateNotePlaceholder",
                          )}
                          className="w-full text-xs rounded-md border border-input bg-background text-foreground p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            onClick={onAddNote}
                            disabled={
                              !candidateNoteInput?.trim() || isUpdatingNote
                            }
                            className="h-7 text-xs cursor-pointer"
                          >
                            {t("pipeline.saveNote")}
                          </Button>
                        </div>
                      </div>
                    )}

                    {candidateNotesList && candidateNotesList.length > 0 ? (
                      <div className="space-y-2">
                        {candidateNotesList.map((n, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-border bg-card text-card-foreground p-4 shadow-xs text-xs"
                          >
                            {n}
                          </div>
                        ))}
                      </div>
                    ) : (
                      !selectedCandidate?.id && (
                        <div className="text-xs text-muted-foreground p-4 text-center">
                          {t("applications.notesStream.empty")}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Timeline Tab */}
            {candidateTab === "timeline" && (
              <CandidateTimeline
                candidateId={selectedCandidate.candidateId}
                applicationId={selectedCandidate.id}
                candidateName={selectedCandidate.candidateName}
                candidateEmail={selectedCandidate.candidateEmail}
                initialEvents={[
                  {
                    id: `applied-${selectedCandidate.id}`,
                    candidateId: selectedCandidate.candidateId,
                    applicationId: selectedCandidate.id,
                    type: "APPLIED",
                    title: t("applications.timelineTitle"),
                    description: t("pipeline.timelineApplied", {
                      job: job?.title || "",
                      date: String(selectedCandidate.createdAt || ""),
                    }),
                    actorName: selectedCandidate.candidateName || "",
                    timestamp: String(selectedCandidate.createdAt || ""),
                  },
                ]}
              />
            )}
          </div>
        </div>
      ) : (
        /* Empty state when no candidate is in stage */
        <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-2">
            <User className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            {t("pipeline.noCandidatesInStage", {
              stage: currentStageConfig.label,
            })}
          </h3>
          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
            {t("pipeline.switchStageHint")}
          </p>
        </div>
      )}
    </section>
  );
}
