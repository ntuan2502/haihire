"use client";

import { ExternalLink, MapPin, Star, Video } from "lucide-react";
import { cn } from "cn";
import { useLocalization } from "@/components/providers/localization-provider";
import { useI18n } from "@/i18n";
import { formatDate, formatTime } from "@/lib/utils";
import {
  getInterviewTypeLabel,
  getRecommendationLabel,
} from "@/lib/interviews";
import type { CalendarEventItem } from "../types";

export interface EventDetailsCardProps {
  event: CalendarEventItem;
}

function getRecommendationBadgeClass(
  recommendation?: "STRONG_YES" | "YES" | "NEUTRAL" | "NO" | "STRONG_NO",
): string {
  switch (recommendation) {
    case "NO":
    case "STRONG_NO":
      return "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800";
    case "NEUTRAL":
      return "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    case "STRONG_YES":
    case "YES":
    default:
      return "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
  }
}

export function EventDetailsCard({ event }: EventDetailsCardProps) {
  const { t } = useI18n();
  const { localization, isConfigured } = useLocalization();
  const locOverrides = isConfigured ? localization : undefined;

  const isOffice = event.interview.format === "OFFICE";
  const rawLocation = event.interview.linkOrLocation?.trim();
  const isHttpUrl = Boolean(rawLocation && rawLocation.startsWith("http"));

  return (
    <>
      <div className="p-4 rounded-xl bg-card text-card-foreground border border-border space-y-2.5 text-xs shadow-2xs">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground shrink-0">
            {t("interviews.role")}:
          </span>
          <span className="font-bold text-foreground min-w-0 truncate text-right">
            {event.job?.title || t("interviews.defaultJob")}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground shrink-0">
            {t("interviews.roundType")}:
          </span>
          <span className="font-bold text-primary min-w-0 truncate text-right">
            {getInterviewTypeLabel(event.interview.type, t)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground shrink-0">
            {t("interviews.timeLabel")}:
          </span>
          <span className="font-bold text-primary min-w-0 truncate text-right">
            {t("interviews.atTime", {
              date: formatDate(
                event.interview.scheduledAt,
                "numeric",
                locOverrides,
              ),
              time: formatTime(event.interview.scheduledAt, locOverrides),
            })}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground shrink-0">
            {t("interviews.tableHeaders.interviewer")}:
          </span>
          <span className="font-semibold text-foreground min-w-0 truncate text-right">
            {event.interview.interviewer}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground shrink-0">
            {t("interviews.formatLabel")}:
          </span>
          <span className="font-semibold text-foreground min-w-0 truncate text-right">
            {isOffice
              ? t("interviews.atOffice")
              : t("interviews.onlineFormat", {
                  format: event.interview.format,
                })}
          </span>
        </div>

        {rawLocation && (
          <div className="pt-2 border-t border-border flex items-start justify-between gap-4">
            <span className="text-muted-foreground shrink-0">
              {isOffice
                ? t("interviews.addressLabel")
                : t("interviews.meetingUrlLabel")}
              :
            </span>
            {!isOffice && isHttpUrl ? (
              <a
                href={rawLocation}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-primary hover:underline inline-flex items-center gap-1 shrink-0"
              >
                <Video className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t("interviews.openMeetingShort")}</span>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            ) : (
              <div className="inline-flex items-start justify-end gap-1.5 min-w-0 flex-1 text-right font-medium text-foreground">
                <MapPin
                  className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span className="whitespace-normal break-words leading-relaxed">
                  {rawLocation}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Existing Scorecard Overview if present */}
      {event.interview.scorecard && (
        <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 space-y-1 text-xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
              <Star
                className="h-3.5 w-3.5 fill-amber-500 text-amber-500"
                aria-hidden="true"
              />
              <span>
                {t("interviews.ratingResult", {
                  score: event.interview.scorecard.overallRating,
                })}
              </span>
            </span>
            <span
              className={cn(
                "px-2 py-0.5 rounded-md font-bold text-[10px] border",
                getRecommendationBadgeClass(
                  event.interview.scorecard.recommendation,
                ),
              )}
            >
              {getRecommendationLabel(
                event.interview.scorecard.recommendation,
                t,
              )}
            </span>
          </div>
          {event.interview.scorecard.feedback && (
            <p className="text-[11px] text-muted-foreground pt-1 line-clamp-2">
              &ldquo;{event.interview.scorecard.feedback}&rdquo;
            </p>
          )}
        </div>
      )}
    </>
  );
}
