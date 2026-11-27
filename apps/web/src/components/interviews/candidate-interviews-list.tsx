"use client";

import {
  Calendar,
  CalendarPlus,
  Clock,
  User,
  ExternalLink,
  MapPin,
  Pencil,
  Video,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApplicationSectionCard } from "@/components/applications/detail/application-section-card";
import { useMemo, useState } from "react";
import { formatDate, formatTime } from "@/lib/utils";
import { CancelInterviewModal } from "./cancel-interview-modal";
import {
  getInterviewsFromApplication,
  getInterviewTypeLabel,
  getRecommendationLabel,
  type ScheduledInterviewInfo,
} from "@/lib/interviews";
import { useLocalization } from "@/components/providers/localization-provider";
import { useI18n } from "@/i18n";
import { useHasPermission } from "@/hooks/use-has-permission";
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
  const { localization, isConfigured } = useLocalization();
  const locOverrides = isConfigured ? localization : undefined;
  const hasCreateInterview = useHasPermission("interview:create");
  const hasUpdateInterview = useHasPermission("interview:update");
  const hasDeleteInterview = useHasPermission("interview:delete");
  const canScheduleNew = canEdit && hasCreateInterview;
  const canUpdateSchedule = canEdit && hasUpdateInterview;
  const canCancelSchedule = canEdit && hasDeleteInterview;
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

  const scheduleButton =
    canScheduleNew && onSchedule ? (
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={() => onSchedule?.()}
        className="h-8 px-3 text-xs font-medium gap-1.5 cursor-pointer shrink-0"
      >
        <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{t("applications.scheduleInterview")}</span>
      </Button>
    ) : null;

  if (allInterviews.length === 0) {
    if (hideIfEmpty) {
      return null;
    }

    if (!showSectionHeader) {
      return (
        <div className={`space-y-4 ${className}`}>
          <div className="rounded-xl border border-border bg-background/40 p-6 text-center space-y-2">
            <Calendar className="h-7 w-7 text-muted-foreground mx-auto" />
            <h4 className="text-xs font-semibold text-foreground">
              {t("applications.noInterviews")}
            </h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {t("applications.noInterviewsDesc")}
            </p>
          </div>
        </div>
      );
    }

    return (
      <ApplicationSectionCard
        icon={Calendar}
        title={title || t("applications.sections.interviews")}
        statusMeta={
          <span className="text-xs text-muted-foreground">
            {t("applications.noInterviews")}
          </span>
        }
        headerActions={scheduleButton}
        collapsible
        bodyDivider
        testId="candidate-interviews-section"
        className={className}
      >
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {t("applications.noInterviewsDesc")}
        </p>
      </ApplicationSectionCard>
    );
  }

  const interviewCards = (
    <div className="space-y-3">
      {allInterviews.map((scheduled, idx) => (
        <div
          key={scheduled.id || `${scheduled.scheduledAt}-${idx}`}
          className="rounded-xl border border-border bg-background/40 text-card-foreground p-4 sm:p-5 space-y-4"
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
                  date: formatDate(
                    scheduled.scheduledAt,
                    "numeric",
                    locOverrides,
                  ),
                  time: formatTime(scheduled.scheduledAt, locOverrides),
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
              <span className="font-bold text-foreground flex items-center gap-1.5 min-w-0 break-words">
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="min-w-0 break-words">
                  {scheduled.interviewer}
                </span>
              </span>
            </div>

            <div className="space-y-1 min-w-0">
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
                <span className="font-semibold text-foreground break-words block">
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
                  <p className="text-foreground/90 bg-card/60 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/30">
                    &ldquo;{scheduled.scorecard.feedback}&rdquo;
                  </p>
                </div>
              )}
            </div>
          )}

          {(canCancelSchedule || canUpdateSchedule) && (
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border">
              {idx === 0 && canCancelSchedule && onCancelInterview && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setInterviewToCancel(scheduled)}
                  className="h-8 px-3 text-xs font-medium gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t("interviews.cancelThisSchedule")}</span>
                </Button>
              )}
              {canUpdateSchedule && onSchedule && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSchedule(scheduled)}
                  className="h-8 px-3 text-xs font-medium gap-1.5 cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {idx === 0
                      ? t("interviews.editScheduleBtn")
                      : t("interviews.updateBtn")}
                  </span>
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  if (!showSectionHeader) {
    return (
      <div className={`space-y-4 ${className}`}>
        {interviewCards}
        <CancelInterviewModal
          isOpen={!!interviewToCancel}
          onClose={() => setInterviewToCancel(null)}
          onConfirm={handleConfirmCancel}
          isCancelling={isCancelling}
        />
      </div>
    );
  }

  return (
    <ApplicationSectionCard
      icon={Calendar}
      title={title || t("applications.sections.interviews")}
      statusMeta={
        <span className="text-xs text-muted-foreground">
          {t("interviews.roundsCount", { count: allInterviews.length })}
        </span>
      }
      headerActions={scheduleButton}
      collapsible
      testId="candidate-interviews-section"
      className={className}
    >
      {interviewCards}
      <CancelInterviewModal
        isOpen={!!interviewToCancel}
        onClose={() => setInterviewToCancel(null)}
        onConfirm={handleConfirmCancel}
        isCancelling={isCancelling}
      />
    </ApplicationSectionCard>
  );
}
