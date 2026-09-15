"use client";

import React from "react";
import {
  Briefcase,
  Plus,
  ArrowRight,
  UploadCloud,
  FlaskConical,
} from "lucide-react";
import { useI18n } from "@/i18n";

interface StartRecruitingProps {
  onOpenCreateJob: () => void;
  onCreateTestJob?: () => void;
  onImportFromFile?: () => void;
}

export function StartRecruiting({
  onOpenCreateJob,
  onCreateTestJob,
  onImportFromFile,
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

        {/* Divider: or */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          <span className="absolute bg-slate-50 dark:bg-slate-950 px-3 text-xs text-slate-400 font-medium">
            {t("common.or")}
          </span>
        </div>

        {/* Secondary Action Cards (2 Columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Card 1: Import from file */}
          <button
            type="button"
            onClick={onImportFromFile || onOpenCreateJob}
            className="group flex items-start gap-3 rounded-xl border border-slate-200/90 bg-white p-4 text-left shadow-xs hover:border-slate-300 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-850 transition-all cursor-pointer"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-600 dark:group-hover:bg-blue-950/50 dark:group-hover:text-blue-400 transition-colors">
              <UploadCloud className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                {t("dashboard.importFromFile")}
              </h4>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                {t("dashboard.importFromFileDesc")}
              </p>
            </div>
          </button>

          {/* Card 2: Create a test job */}
          <button
            type="button"
            onClick={onCreateTestJob || onOpenCreateJob}
            className="group flex items-start gap-3 rounded-xl border border-slate-200/90 bg-white p-4 text-left shadow-xs hover:border-slate-300 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-850 transition-all cursor-pointer"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-600 dark:group-hover:bg-blue-950/50 dark:group-hover:text-blue-400 transition-colors">
              <FlaskConical className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                {t("dashboard.createTestJob")}
              </h4>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                {t("dashboard.createTestJobDesc")}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
