"use client";

import { useI18n } from "@/i18n";
import type { TrackingLinkDetail } from "@haihire/shared";
import { MetricCard } from "@/components/shared/metric-card";
import {
  MousePointerClick,
  Users,
  Target,
  CheckCircle2,
  Activity,
} from "lucide-react";

interface LinkStatsCardsProps {
  stats: TrackingLinkDetail["stats"];
  isLoading?: boolean;
}

export function LinkStatsCards({ stats, isLoading }: LinkStatsCardsProps) {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse border border-slate-200/60 dark:border-slate-800/60"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
      <MetricCard
        label={t("sourcing.details.clicks")}
        value={`${stats.clicks}`}
        subtext={t("sourcing.details.clicksDesc")}
        icon={MousePointerClick}
        color="blue"
      />
      <MetricCard
        label={t("sourcing.details.applications")}
        value={`${stats.applications}`}
        subtext={t("sourcing.details.applicationsDesc")}
        icon={Users}
        color="indigo"
      />
      <MetricCard
        label={t("sourcing.details.cvr")}
        value={`${stats.cvr}%`}
        subtext={t("sourcing.details.cvrDesc")}
        icon={Target}
        color="emerald"
      />
      <MetricCard
        label={t("sourcing.details.hireRate")}
        value={`${stats.hireRate}%`}
        subtext={t("sourcing.details.hireRateDesc")}
        icon={CheckCircle2}
        color="amber"
      />
      <MetricCard
        label={t("sourcing.details.attributed")}
        value={`${stats.allTimeAttributed}`}
        subtext={t("sourcing.details.attributedDesc")}
        icon={Activity}
        color="slate"
      />
    </div>
  );
}
