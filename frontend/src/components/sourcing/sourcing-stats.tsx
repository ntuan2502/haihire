"use client";

import { useI18n } from "@/i18n";
import type { SourcingStats } from "@haihire/shared";

interface SourcingStatsProps {
  stats?: SourcingStats;
  isLoading?: boolean;
}

export function SourcingStatsCards({ stats, isLoading }: SourcingStatsProps) {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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

  const cards = [
    {
      value: `${tracked}`,
      dotColor: "bg-blue-600",
      label: t("sourcing.stats.tracked"),
      desc: t("sourcing.stats.trackedDesc"),
    },
    {
      value: `${attributionRate}%`,
      dotColor: "bg-blue-600",
      label: t("sourcing.stats.attribution"),
      desc: t("sourcing.stats.attributionDesc"),
    },
    {
      value: `${activeLinks}`,
      dotColor: "bg-indigo-600",
      label: t("sourcing.stats.activeLinks"),
      desc: `${totalLinks} ${t("sourcing.stats.activeLinksDesc")}`,
    },
    {
      value: `${untracked}`,
      dotColor: untracked > 0 ? "bg-amber-500" : "bg-slate-400",
      label: t("sourcing.stats.untracked"),
      desc: t("sourcing.stats.untrackedDesc"),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((c, i) => (
        <div
          key={i}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between transition-colors"
        >
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {c.value}
            </span>
            <span className={`h-2 w-2 rounded-full ${c.dotColor}`} />
          </div>
          <div className="mt-3">
            <h3 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {c.label}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
              {c.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
