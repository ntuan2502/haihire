"use client";

import { useI18n } from "@/i18n";
import type { TrackingLinkItem } from "@haihire/shared";
import { getChannelColor } from "../channel-badge";
import { Sliders } from "lucide-react";

interface LinkConfigCardProps {
  link: TrackingLinkItem;
}

export function LinkConfigCard({ link }: LinkConfigCardProps) {
  const { t } = useI18n();

  const channelColor = getChannelColor(link.source);
  const channelName =
    (t as (key: string) => string)(`sourcing.channels.${link.source}`) ||
    link.customSource ||
    link.source;

  const utmSource = link.utmSource || link.source.toLowerCase();
  const utmMedium = link.utmMedium || link.medium || "—";
  const utmCampaign = link.utmCampaign || link.campaign || null;
  const utmTerm = link.utmTerm || null;
  const utmContent = link.utmContent || null;

  return (
    <div className="rounded-xl bg-card text-card-foreground border border-border shadow-2xs p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <Sliders className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-bold text-foreground">
          {t("sourcing.details.configTitle")}
        </h3>
      </div>

      {/* Main Configurations */}
      <div className="space-y-3 text-xs">
        {/* Channel */}
        <div className="flex items-center justify-between gap-3 py-1">
          <span className="text-muted-foreground font-medium shrink-0">
            {t("sourcing.details.configChannel")}
          </span>
          <div className="flex items-center gap-1.5 font-bold text-foreground min-w-0 truncate">
            <span className={`h-2 w-2 rounded-full shrink-0 ${channelColor}`} />
            <span className="truncate">{channelName}</span>
          </div>
        </div>

        {/* Code */}
        <div className="flex items-center justify-between gap-3 py-1">
          <span className="text-muted-foreground font-medium shrink-0">
            {t("sourcing.details.configCode")}
          </span>
          <span className="font-mono text-secondary-foreground font-semibold bg-secondary px-2 py-0.5 rounded-md min-w-0 max-w-[60%] truncate">
            {link.token}
          </span>
        </div>

        {/* Job Scope */}
        <div className="flex items-start justify-between gap-3 py-1">
          <span className="text-muted-foreground font-medium shrink-0">
            {t("sourcing.details.configJobScope")}
          </span>
          <span
            className="font-semibold text-foreground text-right min-w-0 break-words max-w-[260px] leading-relaxed"
            title={link.jobTitle || t("sourcing.details.allJobs")}
          >
            {link.jobTitle || t("sourcing.details.allJobs")}
          </span>
        </div>
      </div>

      {/* UTM Parameters Divider & Section */}
      <div className="pt-3 border-t border-border space-y-3">
        <p className="text-[10px] font-bold text-muted-foreground">
          {t("sourcing.details.configUtmParameters")}
        </p>

        <div className="space-y-2.5 text-xs">
          {/* UTM Source */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground font-medium shrink-0">
              {t("sourcing.details.configSource")}
            </span>
            <span className="font-mono text-foreground min-w-0 truncate text-right">
              {utmSource}
            </span>
          </div>

          {/* UTM Medium */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground font-medium shrink-0">
              {t("sourcing.details.configMedium")}
            </span>
            <span className="font-mono text-foreground min-w-0 truncate text-right">
              {utmMedium}
            </span>
          </div>

          {/* UTM Campaign */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground font-medium shrink-0">
              {t("sourcing.details.configCampaign")}
            </span>
            {utmCampaign ? (
              <span className="font-mono text-xs text-secondary-foreground bg-secondary px-2 py-0.5 rounded-md truncate min-w-0 max-w-[60%] sm:max-w-[180px]">
                {utmCampaign}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>

          {/* UTM Term */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground font-medium shrink-0">
              {t("sourcing.details.configTerm")}
            </span>
            {utmTerm ? (
              <span className="font-mono text-xs text-secondary-foreground bg-secondary px-2 py-0.5 rounded-md truncate min-w-0 max-w-[60%] sm:max-w-[180px]">
                {utmTerm}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>

          {/* UTM Content */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground font-medium shrink-0">
              {t("sourcing.details.configContent")}
            </span>
            {utmContent ? (
              <span className="font-mono text-xs text-secondary-foreground bg-secondary px-2 py-0.5 rounded-md truncate min-w-0 max-w-[60%] sm:max-w-[180px]">
                {utmContent}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
