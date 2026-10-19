import { Sparkles, FileCheck, SlidersHorizontal } from "lucide-react";
import { CandidateInterviewsList } from "@/components/interviews/candidate-interviews-list";
import { ApplicationDocumentsSection } from "@/components/applications/application-documents-section";
import { ApplicationNotesCard } from "./application-notes-card";
import { useI18n } from "@/i18n";
import type { Application, CandidateDocument } from "@/types";
import type { OverviewSectionsState } from "@/components/applications/overview-sections-popover";
import type { ScheduledInterviewInfo } from "@/lib/interviews";

interface ApplicationOverviewTabProps {
  app: Application | null | undefined;
  canEdit: boolean;
  overviewSections: OverviewSectionsState;
  candidateDocuments: CandidateDocument[];
  onPreviewDoc: (doc: CandidateDocument) => void;
  onDownloadDoc: (url: string, filename?: string, targetAppId?: string) => void;
  onScheduleInterview: (intv?: ScheduledInterviewInfo) => void;
  onCancelInterview: (intvOrId?: ScheduledInterviewInfo | string) => void;
}

export function ApplicationOverviewTab({
  app,
  canEdit,
  overviewSections,
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
      {overviewSections.ai && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs text-blue-800 dark:text-blue-300 font-medium">
            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{t("applications.noAiAnalysis")}</span>
          </div>
          <button
            type="button"
            disabled
            className="h-8 px-3.5 rounded-xl bg-blue-600/60 text-white/80 text-xs font-bold shadow-xs flex items-center gap-1.5 opacity-60 cursor-not-allowed transition-colors"
            title={`${t("applications.runAnalysis")} (Coming soon)`}
          >
            <Sparkles className="h-3 w-3" />
            <span>{t("applications.runAnalysis")}</span>
          </button>
        </div>
      )}

      {/* 2. Interviews */}
      {overviewSections.interviews && (
        <CandidateInterviewsList
          application={app}
          notes={app?.notes}
          onSchedule={onScheduleInterview}
          onCancelInterview={onCancelInterview}
          canEdit={canEdit}
          title={t("applications.sections.interviews")}
          showSectionHeader={true}
        />
      )}

      {/* 3. Documents */}
      {overviewSections.documents && (
        <ApplicationDocumentsSection
          documents={candidateDocuments}
          appId={app?.id}
          onPreview={onPreviewDoc}
          onDownload={onDownloadDoc}
        />
      )}

      {/* 4. Responses */}
      {overviewSections.responses && (
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

      {/* 5. Notes */}
      {overviewSections.notes && <ApplicationNotesCard app={app} />}

      {/* 6. Properties */}
      {overviewSections.properties && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
            <span>{t("applications.sections.properties")}</span>
          </h3>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-400 flex-wrap">
            <button
              type="button"
              disabled
              className="opacity-50 cursor-not-allowed transition-colors"
              title="Properties (Coming soon)"
            >
              {t("applications.addOrgProperty")}
            </button>
            <button
              type="button"
              disabled
              className="opacity-50 cursor-not-allowed transition-colors"
              title="Properties (Coming soon)"
            >
              {t("applications.manageJobProperties")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
