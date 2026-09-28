"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, ArrowRight, FileText } from "lucide-react";
import { getInitials, formatRelativeTime } from "@/lib/utils";
import { StageBadge } from "@/components/shared/stage-badge";
import { useI18n } from "@/i18n";
import type { Job, Application } from "@/types";

interface DashboardRecentApplicationsProps {
  applications: Application[];
  jobs: Job[];
}

export function DashboardRecentApplications({
  applications,
  jobs,
}: DashboardRecentApplicationsProps) {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <div className="flex flex-col h-[600px] rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="h-4 w-4 text-slate-400 shrink-0" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
            {t("dashboard.recentApplications")}
          </h3>
          {applications.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/60 shrink-0">
              {applications.length}
            </span>
          )}
        </div>
        <Link
          href="/dashboard/applications"
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 transition-colors shrink-0"
        >
          <span>{t("common.viewAll")}</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Scrollable Applications List */}
      {applications.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-1">
            <FileText className="h-5 w-5" />
          </div>
          <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {t("dashboard.noApplicationsYet")}
          </h4>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pt-1 pr-1.5 -mr-1.5 divide-y divide-slate-100 dark:divide-slate-800/80">
          {applications.map((app) => {
            const candidateJob = jobs.find((j) => j.id === app.jobId);

            return (
              <div
                key={app.id}
                onClick={() => router.push(`/dashboard/applications/${app.id}`)}
                className="flex items-center justify-between py-3 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Avatar with Initials */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100/80 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs">
                    {getInitials(app.candidateName)}
                  </div>

                  {/* Name + Status + Role */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors truncate max-w-[130px]">
                        {app.candidateName}
                      </span>
                      <StageBadge stage={app.stage} />
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {candidateJob?.title || "Open Role"}
                    </p>
                  </div>
                </div>

                {/* Timestamp */}
                <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                  {formatRelativeTime(app.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
