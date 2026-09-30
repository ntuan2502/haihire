"use client";

import { Briefcase, Users, FileText, AlertCircle } from "lucide-react";
import { useI18n } from "@/i18n";

interface DashboardMetricsProps {
  openJobsCount: number;
  draftJobsCount: number;
  totalCandidatesCount: number;
  totalApplicationsCount: number;
  toReviewCount: number;
}

export function DashboardMetrics({
  openJobsCount,
  draftJobsCount,
  totalCandidatesCount,
  totalApplicationsCount,
  toReviewCount,
}: DashboardMetricsProps) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: OPEN JOBS */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-sm">
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              {t("dashboard.openJobsUpper")}
            </div>
            <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
              {openJobsCount}.
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {t("dashboard.draftsCount", { count: draftJobsCount })}
            </div>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100/80 dark:border-blue-900/60 shrink-0">
            <Briefcase className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Card 2: CANDIDATES */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-sm">
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              {t("dashboard.candidatesUpper")}
            </div>
            <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
              {totalCandidatesCount}.
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {t("dashboard.talentPoolSubtitle")}
            </div>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100/80 dark:border-indigo-900/60 shrink-0">
            <Users className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Card 3: APPLICATIONS */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-sm">
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              {t("dashboard.applicationsUpper")}
            </div>
            <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
              {totalApplicationsCount}.
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {t("dashboard.totalReceived")}
            </div>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100/80 dark:border-purple-900/60 shrink-0">
            <FileText className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Card 4: TO REVIEW */}
      <div
        className={`relative overflow-hidden rounded-2xl p-5 shadow-xs transition-all hover:shadow-sm ${
          toReviewCount > 0
            ? "border border-amber-200/90 bg-white dark:border-amber-900/50 dark:bg-slate-900"
            : "border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900"
        }`}
      >
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div
              className={`text-[11px] font-bold tracking-wider uppercase ${
                toReviewCount > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-slate-500"
              }`}
            >
              {t("dashboard.toReviewUpper")}
            </div>
            <div
              className={`text-3xl font-black tracking-tight mt-1 ${
                toReviewCount > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-slate-900 dark:text-white"
              }`}
            >
              {toReviewCount}.
            </div>
            <div
              className={`mt-1 text-xs ${
                toReviewCount > 0
                  ? "text-amber-600/80 dark:text-amber-400/80"
                  : "text-slate-400"
              }`}
            >
              {toReviewCount > 0
                ? t("dashboard.youHaventViewed")
                : t("dashboard.allViewed")}
            </div>
          </div>
          <div
            className={`h-10 w-10 rounded-2xl flex items-center justify-center border shrink-0 ${
              toReviewCount > 0
                ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-100/80 dark:border-amber-900/60"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200/60 dark:border-slate-700/50"
            }`}
          >
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>
      </div>
    </div>
  );
}
