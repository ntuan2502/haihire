import { Clock, MapPin, Star, User, Video } from "lucide-react";
import { useLocalization } from "@/components/providers/localization-provider";
import { formatTime, getCandidateDisplayName } from "@/lib/utils";
import { useI18n } from "@/i18n";
import type { CalendarEventItem } from "../types";

export interface CalendarWeekCardProps {
  event: CalendarEventItem;
  onSelectEvent: (event: CalendarEventItem) => void;
}

export function CalendarWeekCard({
  event,
  onSelectEvent,
}: CalendarWeekCardProps) {
  const { t } = useI18n();
  const { localization, isConfigured } = useLocalization();
  const locOverrides = isConfigured ? localization : undefined;

  const candidateName = getCandidateDisplayName(
    event.application,
    locOverrides,
  );
  const formattedTime = formatTime(event.interview.scheduledAt, locOverrides);
  const hasScorecard = Boolean(event.interview.scorecard);
  const isOffice = event.interview.format === "OFFICE";

  return (
    <button
      type="button"
      onClick={() => onSelectEvent(event)}
      aria-label={t("interviews.interviewEventAria", {
        candidate: candidateName,
        time: formattedTime,
      })}
      className={`w-full text-left p-2.5 rounded-lg border border-l-2 space-y-1 transition-all cursor-pointer shadow-2xs hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        hasScorecard
          ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80 border-l-emerald-500"
          : "bg-muted/40 hover:bg-muted/70 border-border border-l-primary"
      }`}
    >
      {/* Line 1: Time + Format Icon + Round Badge + Optional Rating Pill */}
      <div className="flex items-center justify-between gap-1 text-[11px]">
        <span className="font-bold text-foreground inline-flex items-center gap-1 font-mono shrink-0">
          <Clock className="h-3 w-3 text-primary" aria-hidden="true" />
          <span>{formattedTime}</span>
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {isOffice ? (
            <MapPin
              className="h-3 w-3 text-rose-500"
              aria-label={t("interviews.atOffice")}
            />
          ) : (
            <Video
              className="h-3 w-3 text-emerald-500"
              aria-label={t("interviews.onlineMeeting")}
            />
          )}

          {event.interview.round ? (
            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">
              {t("interviews.roundShort", {
                round: event.interview.round,
              })}
            </span>
          ) : null}

          {hasScorecard && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
              <Star
                className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500"
                aria-hidden="true"
              />
              <span>{event.interview.scorecard?.overallRating}</span>
            </span>
          )}
        </div>
      </div>

      {/* Line 2: Candidate Name */}
      <h4 className="font-semibold text-xs text-foreground truncate">
        {candidateName}
      </h4>

      {/* Line 3: Job Title (full text, no truncation) */}
      {event.job?.title && (
        <p className="text-[11px] text-muted-foreground whitespace-normal break-words leading-snug">
          {event.job.title}
        </p>
      )}

      {/* Line 4: Interviewer */}
      {event.interview.interviewer && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-0.5">
          <User className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{event.interview.interviewer}</span>
        </div>
      )}
    </button>
  );
}
