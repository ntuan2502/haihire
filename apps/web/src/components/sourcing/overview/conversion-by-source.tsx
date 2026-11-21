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
    <div className="p-5 sm:p-6 rounded-xl bg-card text-card-foreground border border-border shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-bold text-foreground">
          {t("sourcing.overview.conversionBySource")}
        </h2>
      </div>

      {/* Table */}
      {data.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          {t("sourcing.overview.noConversionData")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] font-bold text-muted-foreground">
                <th className="pb-3 pr-4 font-bold">
                  {t("sourcing.links.source")}
                </th>
                <th className="pb-3 px-3 text-center">
                  {t("pipeline.stages.applied")}
                </th>
                <th className="pb-3 px-3 text-center">
                  {t("pipeline.stages.screening")}
                </th>
                <th className="pb-3 px-3 text-center">
                  {t("pipeline.stages.interview")}
                </th>
                <th className="pb-3 px-3 text-center">
                  {t("pipeline.stages.offer")}
                </th>
                <th className="pb-3 px-3 text-center">
                  {t("pipeline.stages.hired")}
                </th>
                <th className="pb-3 pl-3 text-right">
                  {t("sourcing.overview.hireRate")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium">
              {data.map((item) => {
                const channelName =
                  (t as (key: string) => string)(
                    `sourcing.channels.${item.source}`,
                  ) || item.source;
                const dotColor = getChannelColor(item.source);

                return (
                  <tr
                    key={item.source}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-3 pr-4 flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${dotColor}`}
                      />
                      <span className="font-semibold text-foreground">
                        {channelName}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-muted-foreground">
                      {item.new}
                    </td>
                    <td className="py-3 px-3 text-center text-muted-foreground">
                      {item.screening}
                    </td>
                    <td className="py-3 px-3 text-center text-muted-foreground">
                      {item.interview}
                    </td>
                    <td className="py-3 px-3 text-center text-muted-foreground">
                      {item.offer}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-foreground">
                      {item.hired}
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <span
                        className={`inline-block font-bold text-xs ${
                          item.hireRate > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground"
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
