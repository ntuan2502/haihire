import { Mail, Sparkles, FileCheck, SlidersHorizontal } from "lucide-react";
import { CandidateInterviewsList } from "@/components/interviews/candidate-interviews-list";
import { ApplicationDocumentsSection } from "@/components/applications/application-documents-section";
import { CandidateTimeline } from "@/components/timeline/candidate-timeline";
import { useI18n } from "@/i18n";
import { ApplicationOverviewTab } from "./application-overview-tab";
import { ApplicationNotesCard } from "./application-notes-card";
import type { Application, CandidateDocument } from "@/types";
import type { OverviewSectionsState } from "@/components/applications/overview-sections-popover";
import type { ScheduledInterviewInfo } from "@/lib/interviews";

interface ApplicationTabContentProps {
  activeTab: string;
  app: Application | null | undefined;
  canEdit: boolean;
  candidateDocuments: CandidateDocument[];
  candidateName: string;
  candidateEmail: string;
  overviewSections: OverviewSectionsState;
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
  overviewSections,
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
          overviewSections={overviewSections}
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
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs text-blue-800 dark:text-blue-300 font-medium">
            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{t("applications.noAiAnalysis")}</span>
          </div>
          <button
            type="button"
            className="h-8 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Sparkles className="h-3 w-3" />
            <span>{t("applications.runAnalysis")}</span>
          </button>
        </div>
      )}

      {activeTab === "interviews" && (
        <CandidateInterviewsList
          application={app}
          notes={app?.notes}
          onSchedule={onScheduleInterview}
          onCancelInterview={onCancelInterview}
          canEdit={canEdit}
          showSectionHeader={true}
        />
      )}

      {activeTab === "responses" && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-2">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <FileCheck className="h-3.5 w-3.5 text-slate-400" />
            <span>{t("applications.sections.responses")}</span>
          </h3>
          <p className="text-xs text-slate-400 py-1">
            {t("applications.noResponses")}
          </p>
        </div>
      )}

      {activeTab === "notes" && <ApplicationNotesCard app={app} />}

      {activeTab === "properties" && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
            <span>{t("applications.sections.properties")}</span>
          </h3>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-400 flex-wrap">
            <button
              type="button"
              className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              {t("applications.addOrgProperty")}
            </button>
            <button
              type="button"
              className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              {t("applications.manageJobProperties")}
            </button>
          </div>
        </div>
      )}

      {activeTab === "inbox" && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-center space-y-2">
          <Mail className="h-8 w-8 text-slate-400 mx-auto" />
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {t("applications.noMessagesYet")}
          </h4>
          <p className="text-[11px] text-slate-400">
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
