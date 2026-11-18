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
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs transition-all hover:shadow-sm">
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              {t("dashboard.openJobsUpper")}
            </div>
            <div className="mt-1 text-3xl font-black tracking-tight text-foreground tabular-nums">
              {openJobsCount}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {t("dashboard.draftsCount", { count: draftJobsCount })}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
            <Briefcase className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Card 2: CANDIDATES */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs transition-all hover:shadow-sm">
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              {t("dashboard.candidatesUpper")}
            </div>
            <div className="mt-1 text-3xl font-black tracking-tight text-foreground tabular-nums">
              {totalCandidatesCount}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {t("dashboard.talentPoolSubtitle")}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center border border-violet-500/20 shrink-0">
            <Users className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Card 3: APPLICATIONS */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs transition-all hover:shadow-sm">
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              {t("dashboard.applicationsUpper")}
            </div>
            <div className="mt-1 text-3xl font-black tracking-tight text-foreground tabular-nums">
              {totalApplicationsCount}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
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
        className={`relative overflow-hidden rounded-xl p-5 shadow-xs transition-all hover:shadow-sm ${
          toReviewCount > 0
            ? "border border-amber-200/90 bg-card text-card-foreground dark:border-amber-900/50"
            : "border border-border bg-card text-card-foreground"
        }`}
      >
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div
              className={`text-[11px] font-bold tracking-wider uppercase ${
                toReviewCount > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground"
              }`}
            >
              {t("dashboard.toReviewUpper")}
            </div>
            <div
              className={`mt-1 text-3xl font-black tracking-tight tabular-nums ${
                toReviewCount > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-foreground"
              }`}
            >
              {toReviewCount}
            </div>
            <div
              className={`mt-1 text-xs ${
                toReviewCount > 0
                  ? "text-amber-600/80 dark:text-amber-400/80"
                  : "text-muted-foreground"
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
                : "bg-muted text-muted-foreground border-border"
            }`}
          >
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>
      </div>
    </div>
  );
}
