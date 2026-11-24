"use client";

import type { ReactNode } from "react";
import { CandidateInterviewsList } from "@/components/interviews/candidate-interviews-list";
import { ApplicationDocumentsSection } from "@/components/applications/application-documents-section";
import { ApplicationNotesStream } from "@/components/applications/application-notes-stream";
import { CandidateTimeline } from "@/components/timeline/candidate-timeline";
import { useI18n } from "@/i18n";
import type { ActivityEvent } from "@/lib/email-templates";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import type { Application, CandidateDocument, Interview } from "@/types";

export interface ApplicationDetailTabContentProps {
  activeTab: string;
  app: Application | null | undefined;
  canEdit: boolean;
  candidateDocuments: CandidateDocument[];
  candidateName: string;
  candidateEmail: string;
  candidateInterviews?: Interview[];
  onPreviewDoc: (doc: CandidateDocument) => void;
  onDownloadDoc: (url: string, filename?: string, targetAppId?: string) => void;
  onScheduleInterview: (intv?: ScheduledInterviewInfo) => void;
  onCancelInterview?: (intvOrId?: ScheduledInterviewInfo | string) => void;
  customNotesContent?: ReactNode;
  timelineInitialEvents?: ActivityEvent[];
}

/**
 * Shared tab body renderer for Overview, Interviews, Documents, Notes, and Timeline
 * across Application Detail and Pipeline Candidate Detail.
 */
export function ApplicationDetailTabContent({
  activeTab,
  app,
  canEdit,
  candidateDocuments,
  candidateName,
  candidateEmail,
  candidateInterviews,
  onPreviewDoc,
  onDownloadDoc,
  onScheduleInterview,
  onCancelInterview,
  customNotesContent,
  timelineInitialEvents,
}: ApplicationDetailTabContentProps) {
  const { t } = useI18n();

  const hasMatchScore =
    app?.matchScore !== null && app?.matchScore !== undefined;

  const renderNotesSection = () => {
    if (customNotesContent !== undefined) {
      return customNotesContent;
    }
    if (!app?.id) return null;
    return (
      <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-xs">
        <ApplicationNotesStream applicationId={app.id} />
      </div>
    );
  };

  const renderInterviewsSection = () => (
    <CandidateInterviewsList
      application={app}
      interviews={candidateInterviews}
      onSchedule={onScheduleInterview}
      onCancelInterview={onCancelInterview}
      canEdit={canEdit}
      title={t("applications.sections.interviews")}
      showSectionHeader={true}
    />
  );

  return (
    <div className="space-y-4">
      {activeTab === "overview" && (
        <>
          {hasMatchScore && (
            <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-muted-foreground">
                  <span>{t("applications.matchScore")}</span>
                </div>
                <span className="text-sm font-semibold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                  {app.matchScore}%
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-[width] duration-500"
                  style={{
                    width: `${Math.max(0, Math.min(100, app.matchScore ?? 0))}%`,
                  }}
                />
              </div>
            </div>
          )}

          {renderInterviewsSection()}

          <ApplicationDocumentsSection
            documents={candidateDocuments}
            appId={app?.id}
            onPreview={onPreviewDoc}
            onDownload={onDownloadDoc}
          />

          {renderNotesSection()}
        </>
      )}

      {activeTab === "interviews" && renderInterviewsSection()}

      {activeTab === "documents" && (
        <ApplicationDocumentsSection
          documents={candidateDocuments}
          appId={app?.id}
          onPreview={onPreviewDoc}
          onDownload={onDownloadDoc}
        />
      )}

      {activeTab === "notes" && renderNotesSection()}

      {activeTab === "timeline" && (
        <CandidateTimeline
          candidateId={app?.candidateId}
          applicationId={app?.id}
          candidateName={candidateName}
          candidateEmail={candidateEmail}
          initialEvents={timelineInitialEvents}
        />
      )}
    </div>
  );
}
