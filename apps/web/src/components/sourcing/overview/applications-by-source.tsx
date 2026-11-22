"use client";

import { useI18n } from "@/i18n";
import type { ChannelBreakdownItem } from "@haihire/shared";
import { getChannelColor } from "../channel-badge";
import { BarChart3 } from "lucide-react";

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
    <div className="p-5 sm:p-6 rounded-xl bg-card text-card-foreground border border-border shadow-2xs space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-lg bg-primary/10 text-primary">
            <BarChart3 className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-bold text-foreground">
            {t("sourcing.overview.applicationsBySource")}
          </h2>
        </div>
        <span className="text-xs font-semibold text-muted-foreground">
          {t("sourcing.overview.totalApplications", {
            total: totalApplications,
          })}
        </span>
      </div>

      {/* Progress Bars */}
      {data.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          {t("sourcing.overview.noLinksYet")}
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((item) => {
            const channelKey = item.channel;
            const channelName =
              (t as (key: string) => string)(
                `sourcing.channels.${channelKey}`,
              ) || channelKey;
            const dotColor = getChannelColor(channelKey);

            return (
              <div key={item.channel} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                    <span className="font-semibold text-foreground">
                      {channelName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground font-medium">
                    <span className="text-muted-foreground">
                      {item.percentage}%
                    </span>
                    <span className="font-bold text-foreground min-w-[20px] text-right">
                      {item.count}
                    </span>
                  </div>
                </div>

                {/* Progress bar container */}
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${dotColor}`}
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
