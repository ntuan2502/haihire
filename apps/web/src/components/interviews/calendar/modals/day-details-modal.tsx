"use client";

import { useMemo } from "react";
import {
  Briefcase,
  CalendarPlus,
  Clock,
  ExternalLink,
  MapPin,
  Star,
  User,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DetailModal } from "@/components/shared";
import { useLocalization } from "@/components/providers/localization-provider";
import { getInterviewTypeLabel } from "@/lib/interviews";
import {
  formatDate,
  formatTime,
  getCandidateDisplayName,
  resolveEffectiveTimezone,
} from "@/lib/utils";
import { useI18n } from "@/i18n";
import type { CalendarEventItem, DayDetailsInfo } from "../types";

export interface DayDetailsModalProps {
  isOpen: boolean;
  openDayDetails: DayDetailsInfo | null;
  events: CalendarEventItem[];
  onClose: () => void;
  onSelectEvent: (event: CalendarEventItem) => void;
  onScheduleDate: (dateStr: string) => void;
  canEdit?: boolean;
}

export function DayDetailsModal({
  isOpen,
  openDayDetails,
  events,
  onClose,
  onSelectEvent,
  onScheduleDate,
  canEdit = true,
}: DayDetailsModalProps) {
  const { t, locale } = useI18n();
  const { localization, isConfigured } = useLocalization();
  const locOverrides = isConfigured ? localization : undefined;
  const effectiveTimezone = resolveEffectiveTimezone(
    localization.timezone,
    isConfigured,
  );

  const formattedDate = useMemo(() => {
    if (!openDayDetails) return "";
    return formatDate(openDayDetails.dateStr, "numeric", locOverrides);
  }, [openDayDetails, locOverrides]);

  const dayDetailsTitle = useMemo(() => {
    if (!openDayDetails) return "";
    const [y, m, d] = openDayDetails.dateStr.split("-").map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const weekday = dateObj.toLocaleDateString(
      locale === "vi" ? "vi-VN" : "en-US",
      {
        weekday: "long",
        timeZone: effectiveTimezone,
      },
    );
    return weekday ? `${weekday}, ${formattedDate}` : formattedDate;
  }, [openDayDetails, locale, effectiveTimezone, formattedDate]);

  return (
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={dayDetailsTitle || t("common.details")}
      badge={
        events.length > 0 ? (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">
            {events.length}
          </span>
        ) : undefined
      }
      headerActions={
        canEdit && openDayDetails ? (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => {
              const d = openDayDetails.dateStr;
              onClose();
              onScheduleDate(d);
            }}
            className="h-8 px-3 text-xs font-medium gap-1.5 cursor-pointer"
          >
            <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t("interviews.scheduleNew")}</span>
          </Button>
        ) : undefined
      }
      footer={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          className="h-8 px-4 text-xs cursor-pointer"
        >
          {t("common.close")}
        </Button>
      }
      size="lg"
      bodyClassName="p-4 sm:p-5 bg-background space-y-3"
    >
      <div className="flex items-center justify-between pb-3 border-b border-border gap-2">
        <span className="text-xs font-semibold text-muted-foreground">
          {t("interviews.candidateInterviewsMultiple", {
            count: events.length,
          })}
        </span>
        {formattedDate && (
          <span className="text-xs font-mono font-medium text-muted-foreground shrink-0">
            {formattedDate}
          </span>
        )}
      </div>

      {/* Detailed Event list */}
      <div className="space-y-3">
        {events.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
            <Clock
              className="h-8 w-8 text-muted-foreground/50"
              aria-hidden="true"
            />
            <p className="text-xs text-muted-foreground">
              {t("interviews.noScheduleForDay")}
            </p>
          </div>
        ) : (
          events.map((evt, idx) => {
            const candidateName = getCandidateDisplayName(
              evt.application,
              locOverrides,
            );
            const hasScorecard = Boolean(evt.interview.scorecard);
            const formattedTime = formatTime(
              evt.interview.scheduledAt,
              locOverrides,
            );
            const isOffice = evt.interview.format === "OFFICE";
            const rawLocation = evt.interview.linkOrLocation?.trim();
            const isHttpUrl = Boolean(
              rawLocation && rawLocation.startsWith("http"),
            );
            const roundTypeLabel = evt.interview.type
              ? getInterviewTypeLabel(evt.interview.type, t)
              : null;

            const handleOpenDetail = () => {
              onClose();
              onSelectEvent(evt);
            };

            return (
              <div
                key={evt.interview.id || `${evt.application.id}-${idx}`}
                role="button"
                tabIndex={0}
                onClick={handleOpenDetail}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleOpenDetail();
                  }
                }}
                aria-label={t("interviews.interviewEventAria", {
                  candidate: candidateName,
                  time: formattedTime,
                })}
                className={`w-full text-left p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-colors hover:border-primary/50 space-y-2.5 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  hasScorecard
                    ? "bg-emerald-50/70 hover:bg-emerald-100/70 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 border-emerald-200/80 dark:border-emerald-800/60"
                    : "bg-card hover:bg-muted/40 border-border text-card-foreground"
                }`}
              >
                {/* Row 1: Time + Candidate + Round/Type + Status/Format Badge */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="font-bold text-primary shrink-0 font-mono text-xs px-2.5 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                      {formattedTime}
                    </span>
                    <span className="font-semibold text-sm text-foreground truncate">
                      {candidateName}
                    </span>
                    {(evt.interview.round || roundTypeLabel) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-border text-[11px] font-medium">
                        {evt.interview.round
                          ? `${t("interviews.roundInterview", { round: evt.interview.round })}${roundTypeLabel ? ` • ${roundTypeLabel}` : ""}`
                          : roundTypeLabel}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {hasScorecard && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 font-bold text-xs">
                        <Star
                          className="h-3 w-3 fill-amber-400"
                          aria-hidden="true"
                        />
                        <span>{evt.interview.scorecard?.overallRating}</span>
                      </span>
                    )}

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                        isOffice
                          ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                          : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                      }`}
                    >
                      {isOffice ? (
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <Video className="h-3 w-3" aria-hidden="true" />
                      )}
                      <span>
                        {isOffice
                          ? t("interviews.atOffice")
                          : t("interviews.onlineFormat", {
                              format: evt.interview.format || "ONLINE",
                            })}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Row 2: Job + Interviewer */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    <Briefcase
                      className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="font-medium text-foreground/90 truncate">
                      {evt.job?.title || t("interviews.defaultJob")}
                    </span>
                  </span>

                  {evt.interview.interviewer && (
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                      <User
                        className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0"
                        aria-hidden="true"
                      />
                      <span>
                        {t("interviews.tableHeaders.interviewer")}:{" "}
                        <strong className="font-semibold text-foreground">
                          {evt.interview.interviewer}
                        </strong>
                      </span>
                    </span>
                  )}
                </div>

                {/* Row 3: Full Address or Online Meeting URL */}
                {rawLocation && (
                  <div className="pt-2 border-t border-border/70 flex items-start gap-2 text-xs">
                    {isOffice || !isHttpUrl ? (
                      <>
                        <MapPin
                          className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1 text-foreground">
                          <span className="text-muted-foreground font-medium mr-1">
                            {t("interviews.addressLabel")}:
                          </span>
                          <span className="whitespace-normal break-words leading-relaxed font-medium">
                            {rawLocation}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Video
                          className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-muted-foreground font-medium mr-1">
                            {t("interviews.meetingUrlLabel")}:
                          </span>
                          <a
                            href={rawLocation}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-primary font-medium hover:underline break-all inline-flex items-center gap-1"
                          >
                            <span>{rawLocation}</span>
                            <ExternalLink
                              className="h-3 w-3 shrink-0"
                              aria-hidden="true"
                            />
                          </a>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </DetailModal>
  );
}
