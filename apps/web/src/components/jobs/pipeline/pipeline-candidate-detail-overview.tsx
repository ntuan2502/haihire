"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApplicationDocumentsSection } from "@/components/applications/application-documents-section";
import { CandidateInterviewsList } from "@/components/interviews/candidate-interviews-list";
import type { Application, CandidateDocument, Interview } from "@/types";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useI18n } from "@/i18n";

interface PipelineCandidateDetailOverviewProps {
  selectedCandidate: Application;
  candidateDocuments: CandidateDocument[];
  onPreviewDoc: (doc: CandidateDocument) => void;
  onDownloadDoc: (url: string, filename?: string) => void;
  candidateInterviews: Interview[];
  onScheduleInterview: (interview?: ScheduledInterviewInfo) => void;
}

export function PipelineCandidateDetailOverview({
  selectedCandidate,
  candidateDocuments,
  onPreviewDoc,
  onDownloadDoc,
  candidateInterviews,
  onScheduleInterview,
}: PipelineCandidateDetailOverviewProps) {
  const { t } = useI18n();
  const canCreateInterview = useHasPermission("interview:create");

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            <span>{t("applications.matchScore")}</span>
          </div>
          {selectedCandidate.matchScore !== null &&
          selectedCandidate.matchScore !== undefined ? (
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {selectedCandidate.matchScore}%
            </span>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">
              {t("applications.matchScoreUnrated")}
            </span>
          )}
        </div>
        {selectedCandidate.matchScore !== null &&
          selectedCandidate.matchScore !== undefined && (
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(0, Math.min(100, selectedCandidate.matchScore))}%`,
                }}
              />
            </div>
          )}
      </div>

      <ApplicationDocumentsSection
        documents={candidateDocuments}
        onPreview={onPreviewDoc}
        onDownload={onDownloadDoc}
        appId={selectedCandidate.id}
      />

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
    </div>
  );
}
