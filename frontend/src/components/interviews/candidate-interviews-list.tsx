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
import { useMemo } from "react";
import {
  parseAllInterviewsFromNotes,
  getInterviewsFromApplication,
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
  onSchedule?: () => void;
  onCancelInterview?: () => void;
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

  const allInterviews = useMemo(() => {
    if (interviews && Array.isArray(interviews) && interviews.length > 0) {
      return getInterviewsFromApplication({ interviews, notes });
    }
    if (application) {
      return getInterviewsFromApplication(application);
    }
    return parseAllInterviewsFromNotes(notes);
  }, [application, interviews, notes]);

  const formatInterviewType = (type?: string) => {
    if (!type) return "";
    if (type.includes("HR Screening") || type.includes("Sơ bộ")) return t("interviews.types.hrScreening");
    if (type.includes("Technical") || type.includes("Kỹ thuật")) return t("interviews.types.technical");
    if (type.includes("Culture") || type.includes("Văn hóa")) return t("interviews.types.cultureFit");
    if (type.includes("Final") || type.includes("Vòng cuối")) return t("interviews.types.finalRound");
    if (type.includes("Assessment") || type.includes("Đánh giá")) return t("interviews.types.assessment");
    return type;
  };

  if (allInterviews.length === 0) {
    if (hideIfEmpty) {
      return null;
    }
    return (
      <div className={`space-y-4 ${className}`}>
        {showSectionHeader && (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span>{title || t("applications.sections.interviews")}</span>
            </h3>
            {canEdit && onSchedule && (
              <Button
                size="sm"
                onClick={onSchedule}
                className="h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>+ {t("applications.scheduleInterview")}</span>
              </Button>
            )}
          </div>
        )}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-center space-y-3">
          <Calendar className="h-8 w-8 text-slate-400 mx-auto" />
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {t("applications.noInterviews")}
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {t("applications.noInterviewsDesc")}
          </p>
          {canEdit && onSchedule && (
            <Button
              size="sm"
              onClick={onSchedule}
              className="mt-2 h-8 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
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
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span>{title || t("applications.sections.interviews")}</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200/60 dark:border-blue-900/40">
              {allInterviews.length}
            </span>
          </div>
          {canEdit && onSchedule && (
            <Button
              size="sm"
              onClick={onSchedule}
              className="h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
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
            key={`${scheduled.date}-${scheduled.time}-${idx}`}
            className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/50 shrink-0">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {formatInterviewType(scheduled.type)}
                    </h4>
                    {allInterviews.length > 1 && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                        {scheduled.round
                          ? `${t("interviews.round")} ${scheduled.round}`
                          : `#${allInterviews.length - idx}`}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {idx === 0
                      ? t("interviews.latestUpcomingSchedule")
                      : t("interviews.previousRoundSchedule")}
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-900/60 shrink-0">
                {idx === 0 ? t("interviews.currentScheduleBadge") : t("interviews.completedScheduleBadge")}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/80 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 block">{t("interviews.timeLabel")}</span>
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  {t("interviews.atTime", {
                    date: scheduled.date,
                    time: scheduled.time,
                  })}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block">{t("interviews.formatLabelShort")}</span>
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
                <span className="text-slate-400 block">{t("interviews.tableHeaders.interviewer")}</span>
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  {scheduled.interviewer}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block">
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
                    className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    <span>{t("interviews.openMeetingShort")}</span>
                  </a>
                ) : (
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {scheduled.linkOrLocation || "—"}
                  </span>
                )}
              </div>
            </div>

            {scheduled.notes && (
              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs space-y-1">
                <span className="font-bold text-blue-950 dark:text-blue-200">
                  {t("interviews.notesAttached")}
                </span>
                <p className="text-blue-800 dark:text-blue-300">
                  {scheduled.notes}
                </p>
              </div>
            )}

            {/* Scorecard Overview */}
            {scheduled.scorecard && (
              <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 space-y-2.5 text-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                    <span>{t("interviews.ratingResult", { score: scheduled.scorecard.overallRating })}</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 shadow-2xs">
                    {t("interviews.recommendationLabel", { recommendation: scheduled.scorecard.recommendation })}
                  </span>
                </div>

                {/* Criteria breakdown */}
                {(scheduled.scorecard.technicalScore ||
                  scheduled.scorecard.communicationScore ||
                  scheduled.scorecard.cultureScore ||
                  scheduled.scorecard.problemSolvingScore) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-amber-200/60 dark:border-amber-800/60">
                    {scheduled.scorecard.technicalScore && (
                      <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-amber-200/50 dark:border-amber-900/40">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{t("interviews.technicalCriteria")}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {scheduled.scorecard.technicalScore}/5
                        </span>
                      </div>
                    )}
                    {scheduled.scorecard.communicationScore && (
                      <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-amber-200/50 dark:border-amber-900/40">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{t("interviews.communicationCriteria")}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {scheduled.scorecard.communicationScore}/5
                        </span>
                      </div>
                    )}
                    {scheduled.scorecard.cultureScore && (
                      <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-amber-200/50 dark:border-amber-900/40">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{t("interviews.cultureFitCriteria")}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {scheduled.scorecard.cultureScore}/5
                        </span>
                      </div>
                    )}
                    {scheduled.scorecard.problemSolvingScore && (
                      <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-amber-200/50 dark:border-amber-900/40">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{t("interviews.problemSolvingCriteria")}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {scheduled.scorecard.problemSolvingScore}/5
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {scheduled.scorecard.feedback && (
                  <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/60">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-400 block mb-0.5">
                      {t("interviews.detailedFeedback")}:
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 italic bg-white/60 dark:bg-slate-900/40 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/30">
                      &ldquo;{scheduled.scorecard.feedback}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            )}

            {canEdit && (
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                {idx === 0 && onCancelInterview && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onCancelInterview}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold cursor-pointer"
                  >
                    {t("interviews.cancelThisSchedule")}
                  </Button>
                )}
                {onSchedule && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onSchedule}
                    className="text-xs font-semibold cursor-pointer"
                  >
                    {idx === 0 ? t("interviews.editScheduleBtn") : t("interviews.updateBtn")}
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
