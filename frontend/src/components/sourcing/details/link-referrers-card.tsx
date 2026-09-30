"use client";

import { useI18n } from "@/i18n";
import type { TopReferrerItem } from "@haihire/shared";
import { Globe } from "lucide-react";

interface LinkReferrersCardProps {
  referrers: TopReferrerItem[];
}

export function LinkReferrersCard({ referrers }: LinkReferrersCardProps) {
  const { t } = useI18n();

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <Globe className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          {t("sourcing.details.referrersTitle")}
        </h3>
      </div>

      {/* Referrers List */}
      {referrers.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400">
          {t("sourcing.details.referrersNoData")}
        </div>
      ) : (
        <div className="space-y-2.5">
          {referrers.map((item) => (
            <div
              key={item.domain}
              className="flex items-center justify-between text-xs py-1"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="font-mono text-slate-700 dark:text-slate-300 truncate">
                  {item.domain}
                </span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white shrink-0 pl-2">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
