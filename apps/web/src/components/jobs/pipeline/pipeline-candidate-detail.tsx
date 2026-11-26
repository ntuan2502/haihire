"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ApplicationStageBar,
  ApplicationDetailHeader,
  ApplicationDetailTabs,
  ApplicationDetailTabContent,
} from "@/components/applications/detail";
import type {
  Application,
  ApplicationStage,
  CandidateDocument,
  Interview,
  Job,
} from "@/types";
import type { StageConfig } from "@/lib/stages";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import { formatDate, getCandidateDisplayName, getInitials } from "@/lib/utils";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useApplicationNotes } from "@/hooks/use-queries";
import { useI18n } from "@/i18n";
import { useLocalization } from "@/components/providers";

interface PipelineCandidateDetailProps {
  selectedCandidate: Application | null;
  currentStageConfig: StageConfig;
  mobileDetailOpen: boolean;
  onCloseMobileDetail: () => void;
  job: Job | null;
  canEdit: boolean;
  isMovingStage: boolean;
  isDeletingApp?: boolean;
  onMoveStage: (newStage: ApplicationStage) => void;
  currentIndex: number;
  totalCandidates: number;
  onPrevCandidate: () => void;
  onNextCandidate: () => void;
  candidateTab: string;
  onSelectTab: (tab: string) => void;
  candidateDocuments: CandidateDocument[];
  onPreviewDoc: (doc: CandidateDocument) => void;
  onDownloadDoc: (url: string, filename?: string, targetAppId?: string) => void;
  candidateInterviews: Interview[];
  onScheduleInterview: (interview?: ScheduledInterviewInfo) => void;
  onCancelInterview?: (interviewOrId?: ScheduledInterviewInfo | string) => void;
  onOpenSendEmail?: () => void;
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
  canEdit,
  isMovingStage,
  isDeletingApp = false,
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
  onCancelInterview,
  onOpenSendEmail,
  candidateNotesList,
  candidateNoteInput,
  onChangeNoteInput,
  onAddNote,
  isUpdatingNote,
  onDeleteApplication,
}: PipelineCandidateDetailProps) {
  const { t, locale } = useI18n();
  const { localization } = useLocalization();
  const hasCreateInterview = useHasPermission("interview:create");
  const hasUpdateInterview = useHasPermission("interview:update");
  const hasDeleteInterview = useHasPermission("interview:delete");
  const canUpdateApplication = useHasPermission("application:update");
  const effectiveCanEdit =
    canEdit || hasCreateInterview || hasUpdateInterview || hasDeleteInterview;
  const { data: fetchedNotes = [] } = useApplicationNotes(
    candidateNotesList === undefined ? (selectedCandidate?.id ?? null) : null,
  );
  const resolvedNotesCount =
    candidateNotesList !== undefined
      ? candidateNotesList.length
      : fetchedNotes.length;

  if (!selectedCandidate) {
    return (
      <section
        className={`flex-1 min-h-0 h-full overflow-y-auto bg-background p-4 sm:p-6 ${
          mobileDetailOpen ? "block" : "hidden md:block"
        }`}
      >
        <div className="md:hidden pb-2">
          <button
            type="button"
            onClick={onCloseMobileDetail}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-card border border-border text-xs font-medium text-foreground shadow-2xs cursor-pointer hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t("applications.backToApplications")}</span>
          </button>
        </div>
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
      </section>
    );
  }

  const displayName = getCandidateDisplayName(selectedCandidate, localization);
  const candidateEmail =
    selectedCandidate.candidateEmail ||
    selectedCandidate.candidate?.email ||
    "";
  const candidatePhone =
    selectedCandidate.candidatePhone ||
    selectedCandidate.candidate?.phone ||
    undefined;
  const appliedDate = formatDate(selectedCandidate.createdAt, "numeric", {
    ...localization,
    defaultLanguage: locale,
  });

  // Static/in-memory notes mode used by LandingAtsPreview demo without backend API calls
  const customNotesContent =
    candidateNotesList !== undefined ? (
      <div className="space-y-4">
        {canUpdateApplication && onChangeNoteInput && onAddNote && (
          <div className="rounded-xl border border-border bg-card text-card-foreground p-4 shadow-xs space-y-3">
            <textarea
              rows={3}
              value={candidateNoteInput || ""}
              onChange={(e) => onChangeNoteInput(e.target.value)}
              placeholder={t("pipeline.writePrivateNotePlaceholder")}
              className="w-full text-xs rounded-md border border-input bg-background text-foreground p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={onAddNote}
                disabled={!candidateNoteInput?.trim() || isUpdatingNote}
                className="h-7 text-xs cursor-pointer"
              >
                {t("pipeline.saveNote")}
              </Button>
            </div>
          </div>
        )}

        {candidateNotesList.length > 0 ? (
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
          <div className="text-xs text-muted-foreground p-4 text-center">
            {t("applications.notesStream.empty")}
          </div>
        )}
      </div>
    ) : undefined;

  return (
    <section
      className={`flex-1 min-h-0 h-full overflow-y-auto bg-background p-4 sm:p-6 ${
        mobileDetailOpen ? "block" : "hidden md:block"
      }`}
    >
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

        {/* Stage Action Pipeline Bar */}
        <ApplicationStageBar
          app={selectedCandidate}
          isUpdatingStage={isMovingStage}
          isDeleting={isDeletingApp}
          onSelectStage={onMoveStage}
          onOpenDeleteModal={onDeleteApplication}
        />

        {/* Candidate Info Header Card */}
        <ApplicationDetailHeader
          initials={getInitials(displayName)}
          candidateName={displayName}
          stage={selectedCandidate.stage}
          rejectionReason={selectedCandidate.rejectionReason}
          candidateEmail={candidateEmail}
          candidatePhone={candidatePhone}
          appliedDate={appliedDate}
          onOpenSendEmail={onOpenSendEmail}
          extraActions={
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={onPrevCandidate}
                disabled={currentIndex <= 0}
                className="h-8 w-8 rounded-md border border-input bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40 transition-colors cursor-pointer"
                title={t("common.back")}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              <span className="px-1 text-xs font-semibold text-foreground tabular-nums whitespace-nowrap shrink-0">
                {currentIndex + 1} / {totalCandidates}
              </span>

              <button
                type="button"
                onClick={onNextCandidate}
                disabled={currentIndex >= totalCandidates - 1}
                className="h-8 w-8 rounded-md border border-input bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40 transition-colors cursor-pointer"
                title={t("common.next")}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>

              <Link
                href={
                  candidateTab && candidateTab !== "overview"
                    ? `/applications/${selectedCandidate.id}?tab=${candidateTab}`
                    : `/applications/${selectedCandidate.id}`
                }
                className="h-8 w-8 rounded-md border border-input bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                title={t("applications.openFullPage")}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          }
        />

        {/* Sub-Navigation Tabs */}
        <ApplicationDetailTabs
          activeTab={candidateTab}
          onSelectTab={onSelectTab}
          interviewsCount={candidateInterviews.length}
          documentsCount={candidateDocuments.length}
          notesCount={resolvedNotesCount}
        />

        {/* Active Tab Body */}
        <ApplicationDetailTabContent
          activeTab={candidateTab}
          app={selectedCandidate}
          canEdit={effectiveCanEdit}
          candidateDocuments={candidateDocuments}
          candidateName={displayName}
          candidateEmail={candidateEmail}
          candidateInterviews={candidateInterviews}
          onPreviewDoc={onPreviewDoc}
          onDownloadDoc={onDownloadDoc}
          onScheduleInterview={onScheduleInterview}
          onCancelInterview={onCancelInterview}
          customNotesContent={customNotesContent}
          timelineInitialEvents={[
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
              actorName: displayName,
              timestamp: String(selectedCandidate.createdAt || ""),
            },
          ]}
        />
      </div>
    </section>
  );
}
