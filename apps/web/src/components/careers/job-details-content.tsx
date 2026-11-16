"use client";

import { useI18n } from "@/i18n";
import type { Job } from "@/types";

interface JobDetailsContentProps {
  job: Job;
}

export function JobDetailsContent({ job }: JobDetailsContentProps) {
  const { t } = useI18n();

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-8">
      {/* Job Overview */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
          {t("careers.jobDescription")}
        </h2>
        <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line font-normal">
          {job.description}
        </div>
      </div>

      {/* Requirements */}
      {job.requirements && (
        <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
            {t("careers.requirements")}
          </h2>
          <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line font-normal">
            {job.requirements}
          </div>
        </div>
      )}
    </div>
  );
}
