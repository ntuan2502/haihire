"use client";

import { useI18n } from "@/i18n";
import type { ConversionBySourceItem } from "@haihire/shared";
import { getChannelColor } from "../channel-badge";
import { TrendingUp } from "lucide-react";

interface ConversionBySourceProps {
  data: ConversionBySourceItem[];
}

export function ConversionBySource({ data }: ConversionBySourceProps) {
  const { t } = useI18n();

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          {t("sourcing.overview.conversionBySource")}
        </h2>
      </div>

      {/* Table */}
      {data.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">
          {t("sourcing.overview.noConversionData")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <th className="pb-3 pr-4 font-bold">{t("sourcing.links.source")}</th>
                <th className="pb-3 px-3 text-center">{t("pipeline.stages.applied")}</th>
                <th className="pb-3 px-3 text-center">{t("pipeline.stages.screening")}</th>
                <th className="pb-3 px-3 text-center">{t("pipeline.stages.interview")}</th>
                <th className="pb-3 px-3 text-center">{t("pipeline.stages.offer")}</th>
                <th className="pb-3 px-3 text-center">{t("pipeline.stages.hired")}</th>
                <th className="pb-3 pl-3 text-right">{t("sourcing.overview.hireRate")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {data.map((item) => {
                const channelName =
                  (t as (key: string) => string)(`sourcing.channels.${item.source}`) ||
                  item.source;
                const dotColor = getChannelColor(item.source);

                return (
                  <tr
                    key={item.source}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 pr-4 flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${dotColor}`} />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {channelName}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-400">
                      {item.new}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-400">
                      {item.screening}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-400">
                      {item.interview}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-400">
                      {item.offer}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white">
                      {item.hired}
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <span
                        className={`inline-block font-bold text-xs ${
                          item.hireRate > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-400"
                        }`}
                      >
                        {item.hireRate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
