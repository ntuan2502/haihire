"use client";

import Link from "next/link";
import { Clock, ArrowRight, FileText } from "lucide-react";
import {
  getCandidateDisplayName,
  getInitials,
  formatRelativeTime,
} from "@/lib/utils";
import { StageBadge } from "@/components/shared/stage-badge";
import { useI18n } from "@/i18n";
import type { Job, Application } from "@/types";

interface DashboardRecentApplicationsProps {
  applications: Application[];
  jobs: Job[];
  totalCount?: number;
}

export function DashboardRecentApplications({
  applications,
  jobs,
  totalCount,
}: DashboardRecentApplicationsProps) {
  const { t, locale } = useI18n();
  const badgeCount = totalCount ?? applications.length;

  return (
    <div className="flex flex-col h-auto max-h-[460px] lg:h-[600px] lg:max-h-none rounded-xl border border-border bg-card p-4 sm:p-5 text-card-foreground shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 shrink-0 pb-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          <h3 className="text-sm font-bold text-foreground truncate">
            {t("dashboard.recentApplications")}
          </h3>
          {badgeCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
              {badgeCount}
            </span>
          )}
        </div>
        <Link
          href="/applications"
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 transition-colors shrink-0"
        >
          <span>{t("common.viewAll")}</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Scrollable Applications List */}
      {applications.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-1">
            <FileText className="h-5 w-5" />
          </div>
          <h4 className="text-xs font-semibold text-foreground">
            {t("dashboard.noApplicationsYet")}
          </h4>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pt-1 pr-1.5 -mr-1.5 divide-y divide-border/60">
          {applications.map((app) => {
            const candidateJob = jobs.find((j) => j.id === app.jobId);
            const candidateDisplay = getCandidateDisplayName(app);

            return (
              <Link
                key={app.id}
                href={`/applications/${app.id}`}
                className="flex items-center justify-between py-3 px-2 rounded-xl hover:bg-accent/50 transition-colors cursor-pointer group gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Avatar with Initials */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                    {getInitials(candidateDisplay)}
                  </div>

                  {/* Name + Status + Role */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate max-w-[130px]">
                        {candidateDisplay}
                      </span>
                      <StageBadge stage={app.stage} />
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {candidateJob?.title || t("common.openRoleFallback")}
                    </p>
                  </div>
                </div>

                {/* Timestamp */}
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatRelativeTime(app.createdAt, {
                    defaultLanguage: locale,
                  })}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
