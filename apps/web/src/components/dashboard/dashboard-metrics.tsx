"use client";

import { Briefcase, Users, FileText, AlertCircle } from "lucide-react";
import { MetricCard } from "@/components/shared/metric-card";
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
      <MetricCard
        label={t("dashboard.openJobsUpper")}
        value={openJobsCount}
        subtext={t("dashboard.draftsCount", { count: draftJobsCount })}
        icon={Briefcase}
        color="blue"
      />
      <MetricCard
        label={t("dashboard.candidatesUpper")}
        value={totalCandidatesCount}
        subtext={t("dashboard.talentPoolSubtitle")}
        icon={Users}
        color="indigo"
      />
      <MetricCard
        label={t("dashboard.applicationsUpper")}
        value={totalApplicationsCount}
        subtext={t("dashboard.totalReceived")}
        icon={FileText}
        color="emerald"
      />
      <MetricCard
        label={t("dashboard.toReviewUpper")}
        value={toReviewCount}
        subtext={
          toReviewCount > 0
            ? t("dashboard.youHaventViewed")
            : t("dashboard.allViewed")
        }
        icon={AlertCircle}
        color={toReviewCount > 0 ? "amber" : "slate"}
        className={
          toReviewCount > 0
            ? "border-amber-200/90 dark:border-amber-900/50"
            : undefined
        }
      />
    </div>
  );
}
