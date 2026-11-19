import { Mail, Sparkles, FileCheck } from "lucide-react";
import { CandidateInterviewsList } from "@/components/interviews/candidate-interviews-list";
import { ApplicationDocumentsSection } from "@/components/applications/application-documents-section";
import { CandidateTimeline } from "@/components/timeline/candidate-timeline";
import { useI18n } from "@/i18n";
import { ApplicationOverviewTab } from "./application-overview-tab";
import { ApplicationNotesCard } from "./application-notes-card";
import type { Application, CandidateDocument } from "@/types";
import type { ScheduledInterviewInfo } from "@/lib/interviews";

interface ApplicationTabContentProps {
  activeTab: string;
  app: Application | null | undefined;
  canEdit: boolean;
  candidateDocuments: CandidateDocument[];
  candidateName: string;
  candidateEmail: string;
  onPreviewDoc: (doc: CandidateDocument) => void;
  onDownloadDoc: (url: string, filename?: string, targetAppId?: string) => void;
  onScheduleInterview: (intv?: ScheduledInterviewInfo) => void;
  onCancelInterview: (intvOrId?: ScheduledInterviewInfo | string) => void;
}

export function ApplicationTabContent({
  activeTab,
  app,
  canEdit,
  candidateDocuments,
  candidateName,
  candidateEmail,
  onPreviewDoc,
  onDownloadDoc,
  onScheduleInterview,
  onCancelInterview,
}: ApplicationTabContentProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      {activeTab === "overview" && (
        <ApplicationOverviewTab
          app={app}
          canEdit={canEdit}
          candidateDocuments={candidateDocuments}
          onPreviewDoc={onPreviewDoc}
          onDownloadDoc={onDownloadDoc}
          onScheduleInterview={onScheduleInterview}
          onCancelInterview={onCancelInterview}
        />
      )}

      {activeTab === "documents" && (
        <ApplicationDocumentsSection
          documents={candidateDocuments}
          appId={app?.id}
          onPreview={onPreviewDoc}
          onDownload={onDownloadDoc}
        />
      )}

      {activeTab === "ai" && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs text-foreground font-medium">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span>{t("applications.noAiAnalysis")}</span>
          </div>
          <button
            type="button"
            disabled
            title={t("applications.comingSoonTooltip", {
              action: t("applications.runAnalysis"),
            })}
            className="h-8 px-3.5 rounded-md bg-primary/60 text-primary-foreground/80 text-xs font-semibold shadow-xs flex items-center gap-1.5 opacity-60 cursor-not-allowed transition-colors"
          >
            <Sparkles className="h-3 w-3" />
            <span>{t("applications.runAnalysis")}</span>
          </button>
        </div>
      )}

      {activeTab === "interviews" && (
        <CandidateInterviewsList
          application={app}
          onSchedule={onScheduleInterview}
          onCancelInterview={onCancelInterview}
          canEdit={canEdit}
          showSectionHeader={true}
        />
      )}

      {activeTab === "responses" && (
        <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-xs space-y-2">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{t("applications.sections.responses")}</span>
          </h3>
          <p className="text-xs text-muted-foreground py-1">
            {t("applications.noResponses")}
          </p>
        </div>
      )}

      {activeTab === "notes" && <ApplicationNotesCard app={app} />}

      {activeTab === "inbox" && (
        <div className="rounded-xl border border-border bg-card text-card-foreground p-8 shadow-xs text-center space-y-2">
          <Mail className="h-8 w-8 text-muted-foreground mx-auto" />
          <h4 className="text-xs font-bold text-foreground">
            {t("applications.noMessagesYet")}
          </h4>
          <p className="text-[11px] text-muted-foreground">
            {t("applications.noMessagesYetDesc")}
          </p>
        </div>
      )}

      {activeTab === "timeline" && (
        <CandidateTimeline
          candidateId={app?.candidateId}
          applicationId={app?.id}
          candidateName={candidateName}
          candidateEmail={candidateEmail}
        />
      )}
    </div>
  );
}
