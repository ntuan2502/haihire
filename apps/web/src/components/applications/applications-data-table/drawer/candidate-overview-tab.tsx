"use client";

import { ApplicationDocumentsSection } from "@/components/applications/application-documents-section";
import { CandidateInterviewsList } from "@/components/interviews/candidate-interviews-list";
import { ApplicationNotesStream } from "@/components/applications/application-notes-stream";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import type { Application, CandidateDocument } from "@/types";
import { useI18n } from "@/i18n";

interface CandidateOverviewTabProps {
  currentApp: Application;
  drawerCandidateDocuments: CandidateDocument[];
  onScheduleInterview: (intv?: ScheduledInterviewInfo) => void;
  onCancelInterview: (interviewOrId?: ScheduledInterviewInfo | string) => void;
  onPreviewDoc: (doc: CandidateDocument) => void;
  onDownloadDoc: (
    url: string,
    filename?: string,
    targetAppId?: string,
  ) => Promise<void>;
  canEdit?: boolean;
}

export function CandidateOverviewTab({
  currentApp,
  drawerCandidateDocuments,
  onScheduleInterview,
  onCancelInterview,
  onPreviewDoc,
  onDownloadDoc,
  canEdit,
}: CandidateOverviewTabProps) {
  const { t } = useI18n();
  const hasMatchScore =
    currentApp.matchScore !== null && currentApp.matchScore !== undefined;

  return (
    <div className="space-y-4">
      {/* Match Score Card */}
      {hasMatchScore && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-card text-card-foreground border border-border shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {t("applications.matchScore")}:
            </span>
            <span className="font-semibold font-mono tabular-nums text-sm text-foreground">
              {currentApp.matchScore}%
            </span>
          </div>
        </div>
      )}

      {/* Interviews Card */}
      <CandidateInterviewsList
        application={currentApp}
        onSchedule={onScheduleInterview}
        onCancelInterview={onCancelInterview}
        canEdit={canEdit}
        title={t("applications.sections.interviews")}
        showSectionHeader={true}
      />

      {/* Documents Card */}
      <ApplicationDocumentsSection
        documents={drawerCandidateDocuments}
        appId={currentApp.id}
        onPreview={onPreviewDoc}
        onDownload={onDownloadDoc}
      />

      {/* Notes Card */}
      <div className="rounded-xl border border-border bg-card text-card-foreground p-4 shadow-xs">
        <ApplicationNotesStream
          applicationId={currentApp.id}
          compact
          maxHeight="max-h-72"
        />
      </div>
    </div>
  );
}
