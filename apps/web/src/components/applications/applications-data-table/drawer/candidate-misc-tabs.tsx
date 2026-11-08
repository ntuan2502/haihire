"use client";

import { Sparkles, FileCheck, Mail, Clock, SlidersHorizontal } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Application } from "@/types";
import { useI18n } from "@/i18n";

export function CandidateAiTab() {
  const { t } = useI18n();
  return (
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
  );
}

export function CandidateResponsesTab({ currentApp }: { currentApp: Application }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
        <FileCheck className="h-3.5 w-3.5 text-slate-400" />
        <span>{t("applications.sections.responses")}</span>
      </h3>
      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs space-y-2 text-slate-600 dark:text-slate-300">
        <div>
          <p className="text-[11px] text-slate-400">{t("candidates.displayName")}</p>
          <p className="font-semibold text-slate-900 dark:text-white">
            {currentApp.candidateName}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400">{t("candidates.email")}</p>
          <p className="font-semibold text-slate-900 dark:text-white">
            {currentApp.candidateEmail}
          </p>
        </div>
        {currentApp.candidatePhone && (
          <div>
            <p className="text-[11px] text-slate-400">{t("candidates.phone")}</p>
            <p className="font-semibold text-slate-900 dark:text-white">
              {currentApp.candidatePhone}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function CandidateInboxTab() {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900 shadow-xs space-y-2">
      <Mail className="h-8 w-8 text-slate-400 mx-auto" />
      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
        {t("applications.tabs.inbox")}
      </h4>
      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
        {t("applications.noMessagesYetDesc")}
      </p>
    </div>
  );
}

export function CandidateTimelineTab({ currentApp }: { currentApp: Application }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-slate-400" />
        <span>{t("applications.tabs.timeline")}</span>
      </h3>
      <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        <div className="relative text-xs">
          <div className="absolute -left-6 top-1 h-2.5 w-2.5 rounded-full bg-blue-600 ring-4 ring-white dark:ring-slate-900" />
          <p className="font-semibold text-slate-900 dark:text-white">
            {t("applications.applied")}
          </p>
          <p className="text-[11px] text-slate-400">
            {formatDate(currentApp.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function CandidatePropertiesTab() {
  const { t } = useI18n();
  return (
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
        >
          {t("applications.addOrgProperty")}
        </button>
        <button
          type="button"
          disabled
          className="opacity-50 cursor-not-allowed transition-colors"
        >
          {t("applications.manageJobProperties")}
        </button>
      </div>
    </div>
  );
}
