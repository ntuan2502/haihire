"use client";

import { Sparkles } from "lucide-react";
import { ApplicationDocumentsSection } from "@/components/applications/application-documents-section";
import { CandidateInterviewsList } from "@/components/interviews/candidate-interviews-list";
import { ApplicationNotesStream } from "@/components/applications/application-notes-stream";
import type { OverviewSectionsState } from "@/components/applications/overview-sections-popover";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import type { Application, CandidateDocument } from "@/types";
import { getCandidateDisplayName } from "@/lib/utils";
import { useI18n } from "@/i18n";

interface CandidateOverviewTabProps {
  currentApp: Application;
  drawerOverviewSections: OverviewSectionsState;
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
  drawerOverviewSections,
  drawerCandidateDocuments,
  onScheduleInterview,
  onCancelInterview,
  onPreviewDoc,
  onDownloadDoc,
  canEdit,
}: CandidateOverviewTabProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      {/* Match Score Card */}
      {drawerOverviewSections.ai && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-card text-card-foreground border border-border shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {t("applications.matchScore")}:
            </span>
            <span className="font-bold text-sm text-foreground">
              {currentApp.matchScore !== null &&
              currentApp.matchScore !== undefined
                ? `${currentApp.matchScore}%`
                : t("applications.matchScoreUnrated")}
            </span>
          </div>
          <button
            type="button"
            className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
          >
            <Sparkles className="h-3 w-3" />
            <span>{t("applications.runAnalysis")}</span>
          </button>
        </div>
      )}

      {/* Interviews Card */}
      {drawerOverviewSections.interviews && (
        <CandidateInterviewsList
          application={currentApp}
          onSchedule={onScheduleInterview}
          onCancelInterview={onCancelInterview}
          canEdit={canEdit}
          title={t("applications.sections.interviews")}
          showSectionHeader={true}
        />
      )}

      {/* Documents Card */}
      {drawerOverviewSections.documents && (
        <ApplicationDocumentsSection
          documents={drawerCandidateDocuments}
          appId={currentApp.id}
          onPreview={onPreviewDoc}
          onDownload={onDownloadDoc}
        />
      )}

      {/* Responses Card */}
      {drawerOverviewSections.responses && (
        <div className="rounded-xl border border-border bg-card text-card-foreground p-4 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            {t("applications.sections.responses")}
          </h3>
          <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-2 text-muted-foreground">
            <div>
              <p className="text-[11px] text-muted-foreground">
                {t("candidates.displayName")}
              </p>
              <p className="font-semibold text-foreground">
                {getCandidateDisplayName(currentApp)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">
                {t("candidates.email")}
              </p>
              <p className="font-semibold text-foreground">
                {currentApp.candidateEmail}
              </p>
            </div>
            {currentApp.candidatePhone && (
              <div>
                <p className="text-[11px] text-muted-foreground">
                  {t("candidates.phone")}
                </p>
                <p className="font-semibold text-foreground">
                  {currentApp.candidatePhone}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes Card */}
      {drawerOverviewSections.notes && (
        <div className="rounded-xl border border-border bg-card text-card-foreground p-4 shadow-xs">
          <ApplicationNotesStream
            applicationId={currentApp.id}
            compact
            maxHeight="max-h-72"
          />
        </div>
      )}
    </div>
  );
}
