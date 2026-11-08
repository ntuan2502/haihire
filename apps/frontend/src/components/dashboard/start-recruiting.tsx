"use client";

import {
  Briefcase,
  Plus,
  ArrowRight,
} from "lucide-react";
import { useI18n } from "@/i18n";

interface StartRecruitingProps {
  onOpenCreateJob: () => void;
  onCreateTestJob?: () => void;
  onImportFromFile?: () => void;
}

export function StartRecruiting({
  onOpenCreateJob,
}: StartRecruitingProps) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl text-center">
        {/* Top Briefcase Icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 shadow-xs">
          <Briefcase className="h-6 w-6 stroke-[1.75]" />
        </div>

        {/* Title & Subtitle */}
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t("dashboard.startRecruitingTitle")}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {t("dashboard.startRecruitingSubtitle")}
        </p>

        {/* Primary Action Button: Create a new job */}
        <div className="mt-8">
          <button
            type="button"
            onClick={onOpenCreateJob}
            className="group flex w-full items-center justify-between rounded-xl bg-blue-600 px-5 py-4 text-left text-white shadow-sm hover:bg-blue-700 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white group-hover:scale-105 transition-transform">
                <Plus className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {t("dashboard.createNewJob")}
                </h3>
                <p className="text-xs text-blue-100">
                  {t("dashboard.createNewJobDesc")}
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-white/80 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
