"use client";

import { useI18n } from "@/i18n";
import type { SourcingStats } from "@haihire/shared";
import { MetricCard } from "@/components/shared/metric-card";
import { Target, TrendingUp, Link2, AlertCircle } from "lucide-react";

interface SourcingStatsProps {
  stats?: SourcingStats;
  isLoading?: boolean;
}

export function SourcingStatsCards({ stats, isLoading }: SourcingStatsProps) {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse border border-slate-200/60 dark:border-slate-800/60"
          />
        ))}
      </div>
    );
  }

  const tracked = stats?.trackedCount ?? 0;
  const attributionRate = stats?.attributionRate ?? 100;
  const activeLinks = stats?.activeLinksCount ?? 0;
  const totalLinks = stats?.totalLinksCount ?? 0;
  const untracked = stats?.untrackedCount ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        label={t("sourcing.stats.tracked")}
        value={`${tracked}`}
        subtext={t("sourcing.stats.trackedDesc")}
        icon={Target}
        color="blue"
      />
      <MetricCard
        label={t("sourcing.stats.attribution")}
        value={`${attributionRate}%`}
        subtext={t("sourcing.stats.attributionDesc")}
        icon={TrendingUp}
        color="indigo"
      />
      <MetricCard
        label={t("sourcing.stats.activeLinks")}
        value={`${activeLinks}`}
        subtext={`${totalLinks} ${t("sourcing.stats.activeLinksDesc")}`}
        icon={Link2}
        color="emerald"
      />
      <MetricCard
        label={t("sourcing.stats.untracked")}
        value={`${untracked}`}
        subtext={t("sourcing.stats.untrackedDesc")}
        icon={AlertCircle}
        color={untracked > 0 ? "amber" : "slate"}
      />
    </div>
  );
}

