import { ExternalLink, Star, Video } from "lucide-react";
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

export function EventDetailsCard({ event }: EventDetailsCardProps) {
  const { t } = useI18n();

  return (
    <>
      <div className="p-4 rounded-xl bg-card text-card-foreground border border-border space-y-2.5 text-xs shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t("interviews.role")}:</span>
          <span className="font-bold text-foreground">
            {event.job?.title || t("interviews.defaultJob")}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            {t("interviews.roundType")}:
          </span>
          <span className="font-bold text-primary">
            {getInterviewTypeLabel(event.interview.type, t)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            {t("interviews.timeLabel")}:
          </span>
          <span className="font-bold text-primary">
            {t("interviews.atTime", {
              date: formatDate(event.interview.scheduledAt),
              time: formatTime(event.interview.scheduledAt),
            })}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            {t("interviews.tableHeaders.interviewer")}:
          </span>
          <span className="font-semibold text-foreground">
            {event.interview.interviewer}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            {t("interviews.formatLabel")}:
          </span>
          <span className="font-semibold text-foreground">
            {event.interview.format === "OFFICE"
              ? t("interviews.atOffice")
              : t("interviews.onlineFormat", {
                  format: event.interview.format,
                })}
          </span>
        </div>

        {event.interview.linkOrLocation && (
          <div className="pt-2 border-t border-border flex items-center justify-between">
            <span className="text-muted-foreground">
              {t("interviews.meetingUrlLabel")}:
            </span>
            {event.interview.linkOrLocation.startsWith("http") ? (
              <a
                href={event.interview.linkOrLocation}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-primary hover:underline inline-flex items-center gap-1"
              >
                <Video className="h-3.5 w-3.5" />
                <span>{t("interviews.openMeetingShort")}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="font-medium text-foreground truncate max-w-[200px]">
                {event.interview.linkOrLocation}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Existing Scorecard Overview if present */}
      {event.interview.scorecard && (
        <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
              <span>
                {t("interviews.ratingResult", {
                  score: event.interview.scorecard.overallRating,
                })}
              </span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-card font-bold text-[10px] text-emerald-600 border border-emerald-200 dark:border-emerald-800">
              {getRecommendationLabel(
                event.interview.scorecard.recommendation,
                t,
              )}
            </span>
          </div>
          {event.interview.scorecard.feedback && (
            <p className="text-[11px] text-muted-foreground italic pt-1 line-clamp-2">
              &ldquo;{event.interview.scorecard.feedback}&rdquo;
            </p>
          )}
        </div>
      )}
    </>
  );
}
