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

  const utmSource = link.source.toLowerCase();
  const utmMedium = link.medium || "referral";
  const utmCampaign = link.campaign;

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <Sliders className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          {t("sourcing.details.configTitle")}
        </h3>
      </div>

      {/* Main Configurations */}
      <div className="space-y-3 text-xs">
        {/* Channel */}
        <div className="flex items-center justify-between py-1">
          <span className="text-slate-500 dark:text-slate-400 font-medium">
            {t("sourcing.details.configChannel")}
          </span>
          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
            <span className={`h-2 w-2 rounded-full ${channelColor}`} />
            <span>{channelName}</span>
          </div>
        </div>

        {/* Code */}
        <div className="flex items-center justify-between py-1">
          <span className="text-slate-500 dark:text-slate-400 font-medium">
            {t("sourcing.details.configCode")}
          </span>
          <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
            {link.token}
          </span>
        </div>

        {/* Job Scope */}
        <div className="flex items-center justify-between py-1">
          <span className="text-slate-500 dark:text-slate-400 font-medium">
            {t("sourcing.details.configJobScope")}
          </span>
          <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[180px] text-right">
            {link.jobTitle || t("sourcing.details.allJobs")}
          </span>
        </div>
      </div>

      {/* UTM Parameters Divider & Section */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {t("sourcing.details.configUtmParameters")}
        </p>

        <div className="space-y-2.5 text-xs">
          {/* UTM Source */}
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              {t("sourcing.details.configSource")}
            </span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {utmSource}
            </span>
          </div>

          {/* UTM Medium */}
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              {t("sourcing.details.configMedium")}
            </span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {utmMedium}
            </span>
          </div>

          {/* UTM Campaign */}
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              {t("sourcing.details.configCampaign")}
            </span>
            {utmCampaign ? (
              <span className="font-mono text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md truncate max-w-[180px]">
                {utmCampaign}
              </span>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
