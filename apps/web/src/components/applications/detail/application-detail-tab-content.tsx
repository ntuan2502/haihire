"use client";

import type { ReactNode } from "react";
import { AiScoreCard } from "@/components/applications/ai-score-card";
import { ApplicationFormCard } from "@/components/applications/application-form-card";
import { CandidateInterviewsList } from "@/components/interviews/candidate-interviews-list";
import { ApplicationDocumentsSection } from "@/components/applications/application-documents-section";
import { ApplicationNotesStream } from "@/components/applications/application-notes-stream";
import { CandidateTimeline } from "@/components/timeline/candidate-timeline";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useI18n } from "@/i18n";
import type { ActivityEvent } from "@/lib/email-templates";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import type { Application, CandidateDocument, Interview } from "@/types";

export interface ApplicationDetailTabContentProps {
  activeTab: string;
  app: Application | null | undefined;
  canEdit: boolean;
  canScore?: boolean;
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
  canScore,
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
  const hasUpdateApplication = useHasPermission("application:update");
  const effectiveCanScore = canScore ?? hasUpdateApplication;

  const renderNotesSection = () => {
    if (customNotesContent !== undefined) {
      return customNotesContent;
    }
    if (!app?.id) return null;
    return <ApplicationNotesStream applicationId={app.id} />;
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
          {app && (
            <AiScoreCard
              application={app}
              canScore={effectiveCanScore}
              variant="full"
            />
          )}

          {app && (
            <ApplicationFormCard
              application={app}
              onPreviewDoc={onPreviewDoc}
              onDownloadDoc={onDownloadDoc}
            />
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

      {activeTab === "ai-evaluation" && app && (
        <AiScoreCard
          application={app}
          canScore={effectiveCanScore}
          variant="full"
        />
      )}

      {activeTab === "application-form" && app && (
        <ApplicationFormCard
          application={app}
          onPreviewDoc={onPreviewDoc}
          onDownloadDoc={onDownloadDoc}
          showEmptyState
        />
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
