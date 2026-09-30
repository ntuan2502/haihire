"use client";

import { useI18n } from "@/i18n";
import type { ChannelBreakdownItem } from "@haihire/shared";
import { getChannelColor } from "../channel-badge";

interface ApplicationsBySourceProps {
  data: ChannelBreakdownItem[];
  totalApplications: number;
}

export function ApplicationsBySource({
  data,
  totalApplications,
}: ApplicationsBySourceProps) {
  const { t } = useI18n();

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </span>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {t("sourcing.overview.applicationsBySource")}
          </h2>
        </div>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {t("sourcing.overview.totalApplications", { total: totalApplications })}
        </span>
      </div>

      {/* Progress Bars */}
      {data.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">
          {t("sourcing.overview.noLinksYet")}
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((item) => {
            const channelKey = item.channel;
            const channelName =
              (t as (key: string) => string)(`sourcing.channels.${channelKey}`) ||
              channelKey;
            const dotColor = getChannelColor(channelKey);

            return (
              <div key={item.channel} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {channelName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-medium">
                    <span className="text-slate-400 dark:text-slate-500">
                      {item.percentage}%
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 min-w-[20px] text-right">
                      {item.count}
                    </span>
                  </div>
                </div>

                {/* Progress bar container */}
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${dotColor} transition-all duration-500`}
                    style={{ width: `${Math.max(item.percentage, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
