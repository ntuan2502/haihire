import { Sparkles, FileCheck } from "lucide-react";
import { CandidateInterviewsList } from "@/components/interviews/candidate-interviews-list";
import { ApplicationDocumentsSection } from "@/components/applications/application-documents-section";
import { ApplicationNotesCard } from "./application-notes-card";
import { useI18n } from "@/i18n";
import type { Application, CandidateDocument } from "@/types";
import type { ScheduledInterviewInfo } from "@/lib/interviews";

interface ApplicationOverviewTabProps {
  app: Application | null | undefined;
  canEdit: boolean;
  candidateDocuments: CandidateDocument[];
  onPreviewDoc: (doc: CandidateDocument) => void;
  onDownloadDoc: (url: string, filename?: string, targetAppId?: string) => void;
  onScheduleInterview: (intv?: ScheduledInterviewInfo) => void;
  onCancelInterview: (intvOrId?: ScheduledInterviewInfo | string) => void;
}

export function ApplicationOverviewTab({
  app,
  canEdit,
  candidateDocuments,
  onPreviewDoc,
  onDownloadDoc,
  onScheduleInterview,
  onCancelInterview,
}: ApplicationOverviewTabProps) {
  const { t } = useI18n();

  return (
    <>
      {/* 1. AI Analysis */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-xs text-foreground font-medium">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span>{t("applications.noAiAnalysis")}</span>
        </div>
        <button
          type="button"
          disabled
          className="h-8 px-3.5 rounded-md bg-primary/60 text-primary-foreground/80 text-xs font-semibold shadow-xs flex items-center gap-1.5 opacity-60 cursor-not-allowed transition-colors"
          title={t("applications.comingSoonTooltip", {
            action: t("applications.runAnalysis"),
          })}
        >
          <Sparkles className="h-3 w-3" />
          <span>{t("applications.runAnalysis")}</span>
        </button>
      </div>

      {/* 2. Interviews */}
      <CandidateInterviewsList
        application={app}
        onSchedule={onScheduleInterview}
        onCancelInterview={onCancelInterview}
        canEdit={canEdit}
        title={t("applications.sections.interviews")}
        showSectionHeader={true}
      />

      {/* 3. Documents */}
      <ApplicationDocumentsSection
        documents={candidateDocuments}
        appId={app?.id}
        onPreview={onPreviewDoc}
        onDownload={onDownloadDoc}
      />

      {/* 4. Responses */}
      <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-xs space-y-2">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{t("applications.sections.responses")}</span>
        </h3>
        <p className="text-xs text-muted-foreground py-1">
          {t("applications.noResponses")}
        </p>
      </div>

      {/* 5. Notes */}
      <ApplicationNotesCard app={app} />
    </>
  );
}
