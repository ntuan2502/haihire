"use client";

import { Sparkles } from "lucide-react";
import { ApplicationDocumentsSection } from "@/components/applications/application-documents-section";
import { CandidateInterviewsList } from "@/components/interviews/candidate-interviews-list";
import type { OverviewSectionsState } from "@/components/applications/overview-sections-popover";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import type { Application, CandidateDocument } from "@/types";
import { useI18n } from "@/i18n";

interface CandidateOverviewTabProps {
  currentApp: Application;
  drawerOverviewSections: OverviewSectionsState;
  drawerCandidateDocuments: CandidateDocument[];
  drawerNotesList: string[];
  drawerNoteInput: string;
  onDrawerNoteInputChange: (val: string) => void;
  onAddDrawerNote: () => void;
  onScheduleInterview: (intv?: ScheduledInterviewInfo) => void;
  onCancelInterview: (interviewOrId?: ScheduledInterviewInfo | string) => void;
  onPreviewDoc: (doc: CandidateDocument) => void;
  onDownloadDoc: (url: string, filename?: string, targetAppId?: string) => Promise<void>;
  canEdit?: boolean;
}

export function CandidateOverviewTab({
  currentApp,
  drawerOverviewSections,
  drawerCandidateDocuments,
  drawerNotesList,
  drawerNoteInput,
  onDrawerNoteInputChange,
  onAddDrawerNote,
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
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200/90 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">
              {t("applications.matchScore")}:
            </span>
            <span className="font-bold text-sm text-slate-900 dark:text-white">
              {currentApp.matchScore ? `${currentApp.matchScore}%` : "N/A"}
            </span>
          </div>
          <button
            type="button"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
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
          notes={currentApp.notes}
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
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            {t("applications.sections.responses")}
          </h3>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs space-y-2 text-slate-600 dark:text-slate-300">
            <div>
              <p className="text-[11px] text-slate-400">
                {t("candidates.displayName")}
              </p>
              <p className="font-semibold text-slate-900 dark:text-white">
                {currentApp.candidateName}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">
                {t("candidates.email")}
              </p>
              <p className="font-semibold text-slate-900 dark:text-white">
                {currentApp.candidateEmail}
              </p>
            </div>
            {currentApp.candidatePhone && (
              <div>
                <p className="text-[11px] text-slate-400">
                  {t("candidates.phone")}
                </p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {currentApp.candidatePhone}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes Card */}
      {drawerOverviewSections.notes && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            {t("applications.sections.notes")}
          </h3>
          <div className="space-y-2">
            {drawerNotesList.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {drawerNotesList.map((n, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300"
                  >
                    {n}
                  </div>
                ))}
              </div>
            )}
            <textarea
              value={drawerNoteInput}
              onChange={(e) => onDrawerNoteInputChange(e.target.value)}
              placeholder={t("applications.notePlaceholder")}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none h-20"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onAddDrawerNote}
                className="h-7 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
              >
                {t("candidates.addNote")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
