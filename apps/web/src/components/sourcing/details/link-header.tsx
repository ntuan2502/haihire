"use client";

import { useI18n } from "@/i18n";
import type { TrackingLinkItem, TimeRangeFilter } from "@haihire/shared";
import { ChannelBadge } from "../channel-badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Calendar,
  Briefcase,
  Pencil,
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface LinkHeaderProps {
  link: TrackingLinkItem;
  timeRange: TimeRangeFilter;
  onTimeRangeChange: (range: TimeRangeFilter) => void;
  onOpenEdit?: () => void;
  onCopyUrl: () => void;
  isCopied: boolean;
}

export function LinkHeader({
  link,
  timeRange,
  onTimeRangeChange,
  onOpenEdit,
  onCopyUrl,
  isCopied,
}: LinkHeaderProps) {
  const { t } = useI18n();

  const timeOptions: { key: TimeRangeFilter; label: string }[] = [
    { key: "7d", label: "7D" },
    { key: "30d", label: "30D" },
    { key: "90d", label: "90D" },
    { key: "all", label: t("sourcing.timeAll") },
  ];

  return (
    <div className="space-y-4">
      {/* Back button */}
      <div>
        <Link
          href="/source-tracking"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{t("sourcing.details.backToTracking")}</span>
        </Link>
      </div>

      {/* Main Title & Action Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title + Badges + Metadata */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              {link.name}
            </h1>
            <ChannelBadge
              channel={link.source}
              customLabel={link.customSource}
              size="sm"
            />
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                link.isActive
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80"
                  : "bg-secondary text-muted-foreground border-border"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  link.isActive ? "bg-emerald-500" : "bg-muted-foreground"
                }`}
              />
              {link.isActive
                ? t("sourcing.details.active")
                : t("sourcing.details.inactive")}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{link.jobTitle || t("sourcing.details.allJobs")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                {t("sourcing.details.createdOn", {
                  date: formatDate(link.createdAt),
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Right controls: TimeRange Pills + Edit + Copy URL */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Time Filter Segmented Pill Group */}
          <div className="inline-flex items-center p-1 rounded-lg bg-muted border border-border">
            {timeOptions.map((opt) => {
              const active = timeRange === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => onTimeRangeChange(opt.key)}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    active
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Edit Button */}
          {onOpenEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenEdit}
              className="h-8 px-3 rounded-md border-input text-foreground text-xs font-semibold hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{t("sourcing.details.edit")}</span>
            </Button>
          )}

          {/* Copy URL Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCopyUrl}
            className="h-8 px-3 rounded-md border-input text-foreground text-xs font-semibold hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {isCopied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400">
                  {t("sourcing.details.copied")}
                </span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{t("sourcing.details.copyUrl")}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
