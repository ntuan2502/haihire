"use client";

import { useI18n } from "@/i18n";
import type { TopReferrerItem } from "@haihire/shared";
import { Globe } from "lucide-react";

interface TopReferrersCardProps {
  referrers: TopReferrerItem[];
}

export function TopReferrersCard({ referrers }: TopReferrersCardProps) {
  const { t } = useI18n();

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          {t("sourcing.overview.topReferrers")}
        </h2>
      </div>

      {/* Referrers List */}
      {referrers.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400">
          {t("sourcing.overview.noReferrersYet")}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {referrers.map((item) => (
            <div
              key={item.domain}
              className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                  {item.domain}
                </span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white shrink-0">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
