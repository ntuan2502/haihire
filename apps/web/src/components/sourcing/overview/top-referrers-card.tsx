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
    <div className="p-5 sm:p-6 rounded-xl bg-card text-card-foreground border border-border shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-bold text-foreground">
          {t("sourcing.overview.topReferrers")}
        </h2>
      </div>

      {/* Referrers List */}
      {referrers.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          {t("sourcing.overview.noReferrersYet")}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {referrers.map((item) => (
            <div
              key={item.domain}
              className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium text-foreground truncate">
                  {item.domain}
                </span>
              </div>
              <span className="font-bold text-foreground shrink-0">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
