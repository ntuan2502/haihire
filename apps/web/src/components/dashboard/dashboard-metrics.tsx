"use client";

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
      {/* Card 1: Open Jobs */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 text-card-foreground">
        <div className="text-xs font-medium text-muted-foreground">
          {t("dashboard.openJobsUpper")}
        </div>
        <div className="mt-1 text-3xl font-medium font-mono tracking-tight text-foreground tabular-nums">
          {openJobsCount}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {t("dashboard.draftsCount", { count: draftJobsCount })}
        </div>
      </div>

      {/* Card 2: Candidates */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 text-card-foreground">
        <div className="text-xs font-medium text-muted-foreground">
          {t("dashboard.candidatesUpper")}
        </div>
        <div className="mt-1 text-3xl font-medium font-mono tracking-tight text-foreground tabular-nums">
          {totalCandidatesCount}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {t("dashboard.talentPoolSubtitle")}
        </div>
      </div>

      {/* Card 3: Applications */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 text-card-foreground">
        <div className="text-xs font-medium text-muted-foreground">
          {t("dashboard.applicationsUpper")}
        </div>
        <div className="mt-1 text-3xl font-medium font-mono tracking-tight text-foreground tabular-nums">
          {totalApplicationsCount}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {t("dashboard.totalReceived")}
        </div>
      </div>

      {/* Card 4: To Review */}
      <div
        className={`relative overflow-hidden rounded-xl p-5 bg-card text-card-foreground ${
          toReviewCount > 0
            ? "border border-amber-200/90 dark:border-amber-900/50"
            : "border border-border"
        }`}
      >
        <div
          className={`text-xs font-medium ${
            toReviewCount > 0
              ? "text-amber-600 dark:text-amber-400"
              : "text-muted-foreground"
          }`}
        >
          {t("dashboard.toReviewUpper")}
        </div>
        <div
          className={`mt-1 text-3xl font-medium font-mono tracking-tight tabular-nums ${
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
    </div>
  );
}
