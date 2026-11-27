"use client";

import { useI18n } from "@/i18n";
import type { TopTrackingLinkItem } from "@haihire/shared";
import { ChannelBadge } from "../channel-badge";
import { Link2, ArrowUpRight, MousePointerClick, FileText } from "lucide-react";

interface TopLinksCardProps {
  links: TopTrackingLinkItem[];
  onViewAll?: () => void;
}

export function TopLinksCard({ links, onViewAll }: TopLinksCardProps) {
  const { t } = useI18n();

  return (
    <div className="p-5 sm:p-6 rounded-xl bg-card text-card-foreground border border-border shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-bold text-foreground">
            {t("sourcing.overview.topLinks")}
          </h2>
        </div>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline transition-colors cursor-pointer"
          >
            <span>{t("common.viewAll")}</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Links List */}
      {links.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          {t("sourcing.overview.noLinksYet")}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {links.map((link) => (
            <div
              key={link.id}
              className="py-3 first:pt-0 last:pb-0 space-y-1.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground truncate">
                    {link.name}
                  </p>
                  {link.jobTitle && (
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {link.jobTitle}
                    </p>
                  )}
                </div>
                <ChannelBadge channel={link.source} size="sm" />
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MousePointerClick className="h-3 w-3 text-muted-foreground" />
                  <span>
                    {link.clicks} {t("sourcing.overview.clicks")}
                  </span>
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3 w-3 text-muted-foreground" />
                  <span>
                    {link.apps} {t("sourcing.overview.apps")}
                  </span>
                </span>
                <span>•</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {link.cvr}% {t("sourcing.overview.cvr")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
