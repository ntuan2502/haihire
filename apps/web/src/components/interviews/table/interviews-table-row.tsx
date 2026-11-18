"use client";

import {
  Briefcase,
  Calendar,
  ChevronDown,
  Clock,
  ExternalLink,
  MapPin,
  Pencil,
  Star,
  Trash2,
  User,
  Video,
} from "lucide-react";
import {
  formatDate,
  formatTime,
  getCandidateDisplayName,
  getInitials,
} from "@/lib/utils";
import {
  getInterviewTypeLabel,
  getRecommendationLabel,
  type ScheduledInterviewInfo,
} from "@/lib/interviews";
import { useI18n } from "@/i18n";
import type { Application, Job } from "@/types";

interface InterviewsTableRowProps {
  app: Application;
  job?: Job;
  currentInterview?: ScheduledInterviewInfo;
  allInterviews: ScheduledInterviewInfo[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  visibleColumns?: {
    candidate?: boolean;
    job?: boolean;
    schedule?: boolean;
    interviewer?: boolean;
    status?: boolean;
    rating?: boolean;
  };
  onOpenScheduleModal: (
    app: Application,
    dateStr?: string,
    interview?: ScheduledInterviewInfo,
  ) => void;
  onOpenScorecard: (
    app: Application,
    interview: ScheduledInterviewInfo,
  ) => void;
  onNavigateToPipeline: (
    jobId: string,
    applicationId?: string,
    stage?: string,
  ) => void;
  onCancelInterview?: (
    app: Application,
    interview: ScheduledInterviewInfo,
  ) => void;
  canEdit?: boolean;
  getRelativeDateBadge: (isoString?: string) => React.ReactNode;
}

export function InterviewsTableRow({
  app,
  job,
  currentInterview,
  allInterviews,
  isExpanded,
  onToggleExpand,
  visibleColumns,
  onOpenScheduleModal,
  onOpenScorecard,
  onNavigateToPipeline,
  onCancelInterview,
  canEdit = true,
  getRelativeDateBadge,
}: InterviewsTableRowProps) {
  const { t } = useI18n();
  const displayName = getCandidateDisplayName(app);
  const initials = getInitials(displayName);

  const getRecommendationBadge = (rec?: string) => {
    if (!rec) return null;
    const isYes = rec === "YES" || rec === "STRONG_YES";
    const label = getRecommendationLabel(rec, t);
    return (
      <span
        className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
          isYes
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
            : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
        }`}
      >
        {label}
      </span>
    );
  };

  return (
    <tr className="hover:bg-muted/50 transition-colors">
      {/* 1. Candidate Info */}
      <td className="py-3.5 px-4 align-middle">
        <button
          type="button"
          className="flex items-center gap-3 pr-2 min-w-0 cursor-pointer group/cand text-left"
          onClick={() => {
            if (job) {
              onNavigateToPipeline(job.id, app.id, app.stage);
            }
          }}
          title={t("interviews.viewCandidateInPipeline")}
          aria-label={`${t("interviews.viewCandidateInPipeline")}: ${displayName}`}
        >
          <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground font-black text-[11px] flex items-center justify-center shrink-0 shadow-2xs group-hover/cand:scale-105 transition-transform">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground truncate group-hover/cand:text-primary group-hover/cand:underline transition-colors">
              {displayName}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {app.candidateEmail}
            </p>
          </div>
        </button>
      </td>

      {/* 2. Job Position */}
      {visibleColumns?.job !== false && (
        <td className="py-3.5 px-4 align-middle">
          <div className="pr-2 min-w-0">
            <div className="flex items-center gap-1.5 font-semibold text-foreground truncate">
              <Briefcase className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">
                {job?.title || t("interviews.defaultJob")}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate pl-5">
              {job?.department || t("interviews.defaultDepartment")}
            </p>
          </div>
        </td>
      )}

      {/* 3. Schedule & Format */}
      {visibleColumns?.schedule !== false && (
        <td className="py-3.5 px-4 align-middle">
          <div className="pr-2 min-w-0">
            {currentInterview ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-foreground text-xs whitespace-nowrap">
                  <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>
                    {formatDate(currentInterview.scheduledAt)} •{" "}
                    {formatTime(currentInterview.scheduledAt)}
                  </span>
                  {getRelativeDateBadge(currentInterview.scheduledAt)}
                </div>
                <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
                  <span className="inline-block px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold border border-primary/20">
                    {getInterviewTypeLabel(currentInterview.type, t)}
                  </span>

                  {currentInterview.format === "OFFICE" ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50">
                      <MapPin className="h-2.5 w-2.5" />
                      <span>{t("interviews.atOffice")}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50">
                      <Video className="h-2.5 w-2.5" />
                      <span>{t("interviews.onlineMeeting")}</span>
                    </span>
                  )}

                  {currentInterview.linkOrLocation?.startsWith("http") && (
                    <a
                      href={currentInterview.linkOrLocation}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-primary hover:underline bg-primary/10"
                      title={t("interviews.joinOnlineMeeting")}
                    >
                      <span>{t("interviews.joinMeetingShort")}</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium text-[11px] bg-amber-50/80 dark:bg-amber-950/30 px-2 py-1 rounded-lg border border-amber-200/60 dark:border-amber-900/40">
                <Clock className="h-3 w-3 shrink-0" />
                <span>{t("interviews.notScheduledYet")}</span>
              </div>
            )}
          </div>
        </td>
      )}

      {/* 4. Interviewer */}
      {visibleColumns?.interviewer !== false && (
        <td className="py-3.5 px-4 align-middle">
          <div className="pr-2 min-w-0">
            {currentInterview ? (
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-foreground font-medium truncate">
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">
                    {currentInterview.interviewer}
                  </span>
                </div>
                {currentInterview.round && (
                  <p className="text-[10px] text-muted-foreground pl-5">
                    {t("interviews.roundInterview", {
                      round: currentInterview.round,
                    })}
                  </p>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </td>
      )}

      {/* 5. Status (Stacked 2 lines: Status badge above, Rounds badge below) */}
      {visibleColumns?.status !== false && (
        <td className="py-3.5 px-3 text-center align-middle">
          <div className="flex flex-col items-center justify-center gap-1.5">
            {allInterviews.length > 0 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200/80 dark:border-emerald-900/60 whitespace-nowrap">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>{t("interviews.hasScheduleBadge")}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200/80 dark:border-amber-900/60 whitespace-nowrap">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span>{t("interviews.awaitingScheduleBadge")}</span>
              </span>
            )}

            {allInterviews.length > 1 ? (
              <button
                type="button"
                onClick={onToggleExpand}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold border border-primary/20 transition-colors cursor-pointer whitespace-nowrap"
                title={t("interviews.candidateInterviewsMultiple", {
                  count: allInterviews.length,
                })}
              >
                <span>
                  {t("interviews.roundsCount", {
                    count: allInterviews.length,
                  })}
                </span>
                <ChevronDown
                  className={`h-3 w-3 transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>
            ) : allInterviews.length === 1 ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-bold whitespace-nowrap">
                {currentInterview?.round
                  ? t("interviews.roundBadge", {
                      round: currentInterview.round,
                    })
                  : t("interviews.roundsCount", { count: 1 })}
              </span>
            ) : (
              <span className="text-muted-foreground text-[10px]">—</span>
            )}
          </div>
        </td>
      )}

      {/* 6. Rating / Scorecard */}
      {visibleColumns?.rating !== false && (
        <td className="py-3.5 px-3 text-center align-middle">
          {currentInterview?.scorecard ? (
            <div className="flex flex-col items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => onOpenScorecard(app, currentInterview)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200/80 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer transition-colors shadow-2xs"
                title={t("interviews.scorecardTooltip")}
                aria-label={`${t("interviews.scorecardTooltip")} - ${displayName}`}
              >
                <Star
                  className="h-3 w-3 fill-amber-400 text-amber-400"
                  aria-hidden="true"
                />
                <span>{currentInterview.scorecard.overallRating} ⭐</span>
              </button>
              {getRecommendationBadge(
                currentInterview.scorecard.recommendation,
              )}
            </div>
          ) : currentInterview ? (
            <button
              type="button"
              onClick={() => onOpenScorecard(app, currentInterview)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50/70 hover:bg-amber-100/70 dark:bg-amber-950/40 font-bold border border-amber-200/70 dark:border-amber-900/60 cursor-pointer transition-colors"
              aria-label={`${t("interviews.rateNow")} - ${displayName}`}
            >
              <Star className="h-2.5 w-2.5 text-amber-500" aria-hidden="true" />
              <span>{t("interviews.rateNow")}</span>
            </button>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
      )}

      {/* 7. Actions */}
      <td className="py-3.5 px-4 text-right align-middle whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          {canEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenScheduleModal(app, undefined, currentInterview);
              }}
              className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer inline-flex items-center"
              title={
                allInterviews.length > 0
                  ? t("interviews.editSchedule")
                  : t("interviews.scheduleNow")
              }
              aria-label={
                allInterviews.length > 0
                  ? `${t("interviews.editSchedule")} - ${displayName}`
                  : `${t("interviews.scheduleNow")} - ${displayName}`
              }
            >
              {allInterviews.length > 0 ? (
                <Pencil className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Calendar className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )}
          {canEdit && currentInterview && onCancelInterview && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCancelInterview(app, currentInterview);
              }}
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer inline-flex items-center"
              title={t("interviews.cancelThisSchedule")}
              aria-label={`${t("interviews.cancelThisSchedule")} - ${displayName}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
