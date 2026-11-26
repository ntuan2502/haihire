"use client";

import { useI18n } from "@/i18n";
import type { TrackingLinkDetail } from "@haihire/shared";
import { MetricCard } from "@/components/shared/metric-card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
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
    return <LoadingSpinner />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
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
