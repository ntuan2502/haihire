"use client";

import {
  Calendar,
  Clock,
  User,
  ExternalLink,
  MapPin,
  Video,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { formatDate, formatTime } from "@/lib/utils";
import { CancelInterviewModal } from "./cancel-interview-modal";
import {
  getInterviewsFromApplication,
  getInterviewTypeLabel,
  getRecommendationLabel,
  type ScheduledInterviewInfo,
} from "@/lib/interviews";
import { useI18n } from "@/i18n";
import type { Interview } from "@/types";

export interface CandidateInterviewsListProps {
  application?: {
    interviews?: Interview[] | null;
    notes?: string | null;
  } | null;
  interviews?: Interview[] | null;
  notes?: string | null;
  onSchedule?: (interview?: ScheduledInterviewInfo) => void;
  onCancelInterview?: (interview?: ScheduledInterviewInfo) => void;
  canEdit?: boolean;
  title?: string;
  showSectionHeader?: boolean;
  className?: string;
  hideIfEmpty?: boolean;
}

export function CandidateInterviewsList({
  application,
  interviews,
  notes,
  onSchedule,
  onCancelInterview,
  canEdit = true,
  title,
  showSectionHeader = true,
  className = "",
  hideIfEmpty = false,
}: CandidateInterviewsListProps) {
  const { t } = useI18n();
  const [interviewToCancel, setInterviewToCancel] =
    useState<ScheduledInterviewInfo | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleConfirmCancel = async () => {
    if (!interviewToCancel) return;
    try {
      setIsCancelling(true);
      await onCancelInterview?.(interviewToCancel);
      setInterviewToCancel(null);
    } finally {
      setIsCancelling(false);
    }
  };

  const allInterviews = useMemo(() => {
    if (interviews && Array.isArray(interviews) && interviews.length > 0) {
      return getInterviewsFromApplication({ interviews, notes });
    }
    if (application) {
      return getInterviewsFromApplication(application);
    }
    return [];
  }, [application, interviews, notes]);

  const formatInterviewType = (type?: string) => {
    return getInterviewTypeLabel(type, t);
  };

  if (allInterviews.length === 0) {
    if (hideIfEmpty) {
      return null;
    }
    return (
      <div className={`space-y-4 ${className}`}>
        {showSectionHeader && (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{title || t("applications.sections.interviews")}</span>
            </h3>
            {canEdit && onSchedule && (
              <Button
                size="sm"
                onClick={() => onSchedule?.()}
                className="h-8 px-3 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>+ {t("applications.scheduleInterview")}</span>
              </Button>
            )}
          </div>
        )}
        <div className="rounded-xl border border-border bg-card text-card-foreground p-8 shadow-xs text-center space-y-3">
          <Calendar className="h-8 w-8 text-muted-foreground mx-auto" />
          <h4 className="text-xs font-bold text-foreground">
            {t("applications.noInterviews")}
          </h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {t("applications.noInterviewsDesc")}
          </p>
          {canEdit && onSchedule && (
            <Button
              size="sm"
              onClick={() => onSchedule?.()}
              className="mt-2 h-8 px-4 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>{t("applications.scheduleInterview")}</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {showSectionHeader && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{title || t("applications.sections.interviews")}</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
              {allInterviews.length}
            </span>
          </div>
          {canEdit && onSchedule && (
            <Button
              size="sm"
              onClick={() => onSchedule?.()}
              className="h-8 px-3 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>+ {t("applications.scheduleInterview")}</span>
            </Button>
          )}
        </div>
      )}

      <div className="space-y-4">
        {allInterviews.map((scheduled, idx) => (
          <div
            key={scheduled.id || `${scheduled.scheduledAt}-${idx}`}
            className="rounded-xl border border-border bg-card text-card-foreground p-5 sm:p-6 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-foreground">
                      {formatInterviewType(scheduled.type)}
                    </h4>
                    {allInterviews.length > 1 && (
                      <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-[10px] font-bold">
                        {scheduled.round
                          ? `${t("interviews.round")} ${scheduled.round}`
                          : `#${allInterviews.length - idx}`}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {idx === 0
                      ? t("interviews.latestUpcomingSchedule")
                      : t("interviews.previousRoundSchedule")}
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-900/60 shrink-0">
                {idx === 0
                  ? t("interviews.currentScheduleBadge")
                  : t("interviews.completedScheduleBadge")}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-4 rounded-xl bg-muted/40 border border-border text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground block">
                  {t("interviews.timeLabel")}
                </span>
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                  {t("interviews.atTime", {
                    date: formatDate(scheduled.scheduledAt),
                    time: formatTime(scheduled.scheduledAt),
                  })}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground block">
                  {t("interviews.formatLabelShort")}
                </span>
                {scheduled.format === "OFFICE" ? (
                  <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {t("interviews.atOffice")}
                  </span>
                ) : (
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Video className="h-3.5 w-3.5 shrink-0" />
                    {t("interviews.onlineFormat", { format: scheduled.format })}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground block">
                  {t("interviews.tableHeaders.interviewer")}
                </span>
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {scheduled.interviewer}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground block">
                  {scheduled.format === "OFFICE"
                    ? t("interviews.officeAddressLabel")
                    : t("interviews.meetingUrlLabel")}
                </span>
                {scheduled.linkOrLocation &&
                scheduled.linkOrLocation.startsWith("http") ? (
                  <a
                    href={scheduled.linkOrLocation}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    <span>{t("interviews.openMeetingShort")}</span>
                  </a>
                ) : (
                  <span className="font-semibold text-foreground">
                    {scheduled.linkOrLocation || "—"}
                  </span>
                )}
              </div>
            </div>

            {scheduled.notes && (
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs space-y-1">
                <span className="font-bold text-foreground">
                  {t("interviews.notesAttached")}
                </span>
                <p className="text-foreground/90">{scheduled.notes}</p>
              </div>
            )}

            {/* Scorecard Overview */}
            {scheduled.scorecard && (
              <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 space-y-2.5 text-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                    <span>
                      {t("interviews.ratingResult", {
                        score: scheduled.scorecard.overallRating,
                      })}
                    </span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-card text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 shadow-2xs">
                    {t("interviews.recommendationLabel", {
                      recommendation: getRecommendationLabel(
                        scheduled.scorecard.recommendation,
                        t,
                      ),
                    })}
                  </span>
                </div>

                {/* Criteria breakdown */}
                {(scheduled.scorecard.technicalScore ||
                  scheduled.scorecard.communicationScore ||
                  scheduled.scorecard.cultureScore ||
                  scheduled.scorecard.problemSolvingScore) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-amber-200/60 dark:border-amber-800/60">
                    {scheduled.scorecard.technicalScore && (
                      <div className="p-2 rounded-lg bg-card/80 border border-amber-200/50 dark:border-amber-900/40">
                        <span className="text-[10px] text-muted-foreground block">
                          {t("interviews.technicalCriteria")}
                        </span>
                        <span className="font-bold text-foreground flex items-center gap-1 mt-0.5">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {scheduled.scorecard.technicalScore}/5
                        </span>
                      </div>
                    )}
                    {scheduled.scorecard.communicationScore && (
                      <div className="p-2 rounded-lg bg-card/80 border border-amber-200/50 dark:border-amber-900/40">
                        <span className="text-[10px] text-muted-foreground block">
                          {t("interviews.communicationCriteria")}
                        </span>
                        <span className="font-bold text-foreground flex items-center gap-1 mt-0.5">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {scheduled.scorecard.communicationScore}/5
                        </span>
                      </div>
                    )}
                    {scheduled.scorecard.cultureScore && (
                      <div className="p-2 rounded-lg bg-card/80 border border-amber-200/50 dark:border-amber-900/40">
                        <span className="text-[10px] text-muted-foreground block">
                          {t("interviews.cultureFitCriteria")}
                        </span>
                        <span className="font-bold text-foreground flex items-center gap-1 mt-0.5">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {scheduled.scorecard.cultureScore}/5
                        </span>
                      </div>
                    )}
                    {scheduled.scorecard.problemSolvingScore && (
                      <div className="p-2 rounded-lg bg-card/80 border border-amber-200/50 dark:border-amber-900/40">
                        <span className="text-[10px] text-muted-foreground block">
                          {t("interviews.problemSolvingCriteria")}
                        </span>
                        <span className="font-bold text-foreground flex items-center gap-1 mt-0.5">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {scheduled.scorecard.problemSolvingScore}/5
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {scheduled.scorecard.feedback && (
                  <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/60">
                    <span className="text-[10px] font-semibold text-muted-foreground block mb-0.5">
                      {t("interviews.detailedFeedback")}:
                    </span>
                    <p className="text-foreground/90 italic bg-card/60 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/30">
                      &ldquo;{scheduled.scorecard.feedback}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            )}

            {canEdit && (
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
                {idx === 0 && onCancelInterview && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setInterviewToCancel(scheduled)}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold cursor-pointer"
                  >
                    {t("interviews.cancelThisSchedule")}
                  </Button>
                )}
                {onSchedule && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSchedule(scheduled)}
                    className="text-xs font-semibold cursor-pointer"
                  >
                    {idx === 0
                      ? t("interviews.editScheduleBtn")
                      : t("interviews.updateBtn")}
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <CancelInterviewModal
        isOpen={!!interviewToCancel}
        onClose={() => setInterviewToCancel(null)}
        onConfirm={handleConfirmCancel}
        isCancelling={isCancelling}
      />
    </div>
  );
}
