"use client";

import { useState } from "react";
import {
  Briefcase,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  History,
  MapPin,
  Star,
  User,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInitials, getCandidateDisplayName } from "@/lib/utils";
import {
  getInterviewsFromApplication,
  getInterviewTypeLabel,
  type ScheduledInterviewInfo,
} from "@/lib/interviews";
import { useI18n } from "@/i18n";
import type { Application, Job } from "@/types";

export interface InterviewsTableViewProps {
  applications: Application[];
  jobs: Job[];
  onOpenScheduleModal: (
    app: Application,
    dateStr?: string,
    interview?: ScheduledInterviewInfo,
  ) => void;
  onOpenScorecard: (app: Application, interview: ScheduledInterviewInfo) => void;
  onNavigateToPipeline: (jobId: string) => void;
  canEdit?: boolean;
}

export function InterviewsTableView({
  applications,
  jobs,
  onOpenScheduleModal,
  onOpenScorecard,
  onNavigateToPipeline,
  canEdit = true,
}: InterviewsTableViewProps) {
  const { t } = useI18n();
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRowHistory = (appId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [appId]: !prev[appId],
    }));
  };

  const getRecommendationBadge = (rec?: string) => {
    if (!rec) return null;
    const lower = rec.toLowerCase();
    if (lower.includes("tuyển ngay") || lower.includes("strong") || lower.includes("xuất sắc")) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
          {rec}
        </span>
      );
    }
    if (lower.includes("đồng ý") || lower.includes("yes") || lower.includes("đạt")) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60">
          {rec}
        </span>
      );
    }
    if (lower.includes("cân nhắc") || lower.includes("neutral")) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60">
          {rec}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60">
        {rec}
      </span>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-2xs overflow-hidden transition-all">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] font-bold">
              <th className="py-3.5 px-4">{t("interviews.tableHeaders.candidate")}</th>
              <th className="py-3.5 px-4">{t("interviews.tableHeaders.job")}</th>
              <th className="py-3.5 px-4">{t("interviews.tableHeaders.schedule")}</th>
              <th className="py-3.5 px-4">{t("interviews.tableHeaders.interviewer")}</th>
              <th className="py-3.5 px-3 text-center">{t("interviews.tableHeaders.rounds")}</th>
              <th className="py-3.5 px-3 text-center">{t("interviews.tableHeaders.status")}</th>
              <th className="py-3.5 px-3 text-center">{t("interviews.tableHeaders.rating")}</th>
              <th className="py-3.5 px-4 text-right">{t("interviews.tableHeaders.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {applications.map((app) => {
              const job = jobs.find((j) => String(j.id) === String(app.jobId));
              const allInterviews = getInterviewsFromApplication(app);
              const currentInterview = allInterviews[0];
              const previousInterviews = allInterviews.slice(1);
              const displayName = getCandidateDisplayName(app);
              const initials = getInitials(displayName);
              const isExpanded = expandedRows[app.id] ?? false;

              return (
                <tr key={app.id} className="group">
                  <td colSpan={8} className="p-0">
                    <div className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <div className="grid grid-cols-[minmax(180px,1.2fr)_minmax(150px,1fr)_minmax(200px,1.3fr)_minmax(150px,1fr)_85px_105px_120px_minmax(130px,0.9fr)] items-center py-3.5 px-4">
                        {/* 1. Candidate Info */}
                        <div className="flex items-center gap-3 pr-2 min-w-0">
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 shadow-2xs">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {displayName}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {app.candidateEmail}
                            </p>
                          </div>
                        </div>

                        {/* 2. Job Position */}
                        <div className="pr-2 min-w-0">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 truncate">
                            <Briefcase className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            <span className="truncate">{job?.title || t("interviews.defaultJob")}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate pl-5">
                            {job?.department || t("interviews.defaultDepartment")}
                          </p>
                        </div>

                        {/* 3. Schedule & Format */}
                        <div className="pr-2 min-w-0">
                          {currentInterview ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-xs whitespace-nowrap">
                                <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                <span>
                                  {currentInterview.date} • {currentInterview.time}
                                </span>
                              </div>
                              <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
                                <span className="inline-block px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200/80 dark:border-blue-900/60">
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
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline bg-blue-50/70 dark:bg-blue-950/40"
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

                        {/* 4. Interviewer */}
                        <div className="pr-2 min-w-0">
                          {currentInterview ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium truncate">
                                <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{currentInterview.interviewer}</span>
                              </div>
                              {currentInterview.round && (
                                <p className="text-[10px] text-slate-400 pl-5">
                                  {t("interviews.roundInterview", { round: currentInterview.round })}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>

                        {/* 5. Rounds & History Toggle */}
                        <div className="text-center">
                          {allInterviews.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => toggleRowHistory(app.id)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200/80 dark:border-blue-900/60 transition-colors cursor-pointer"
                              title={t("interviews.candidateInterviewsMultiple", { count: allInterviews.length })}
                            >
                              <span>{t("interviews.roundsCount", { count: allInterviews.length })}</span>
                              <ChevronDown
                                className={`h-3 w-3 transition-transform duration-200 ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                          ) : allInterviews.length === 1 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                              {t("interviews.roundsCount", { count: 1 })}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>

                        {/* 6. Status Badge */}
                        <div className="text-center">
                          {allInterviews.length > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200/80 dark:border-emerald-900/60">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              <span>{t("interviews.hasScheduleBadge")}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200/80 dark:border-amber-900/60">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              <span>{t("interviews.awaitingScheduleBadge")}</span>
                            </span>
                          )}
                        </div>

                        {/* 7. Rating / Scorecard */}
                        <div className="text-center">
                          {currentInterview?.scorecard ? (
                            <div className="space-y-1">
                              <button
                                type="button"
                                onClick={() => onOpenScorecard(app, currentInterview)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200/80 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer transition-colors shadow-2xs"
                                title={t("interviews.scorecardTooltip")}
                              >
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                <span>{currentInterview.scorecard.overallRating} ⭐</span>
                              </button>
                              {getRecommendationBadge(currentInterview.scorecard.recommendation)}
                            </div>
                          ) : currentInterview ? (
                            <button
                              type="button"
                              onClick={() => onOpenScorecard(app, currentInterview)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50/70 hover:bg-amber-100/70 dark:bg-amber-950/40 font-bold border border-amber-200/70 dark:border-amber-900/60 cursor-pointer transition-colors"
                            >
                              <Star className="h-2.5 w-2.5 text-amber-500" />
                              <span>{t("interviews.rateNow")}</span>
                            </button>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>

                        {/* 8. Actions */}
                        <div className="text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onOpenScheduleModal(app, undefined, currentInterview)}
                                className="h-7 px-2.5 rounded-xl text-[11px] font-semibold cursor-pointer hover:border-blue-400 hover:text-blue-600 transition-colors shadow-2xs"
                              >
                                {allInterviews.length > 0
                                  ? t("interviews.editSchedule")
                                  : t("interviews.scheduleNow")}
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (job) {
                                  onNavigateToPipeline(job.id);
                                }
                              }}
                              className="h-7 w-7 p-0 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                              title={t("interviews.pipelineReviewTooltip")}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Expandable History Drawer for previous rounds */}
                      {isExpanded && previousInterviews.length > 0 && (
                        <div className="bg-slate-50/90 dark:bg-slate-800/40 border-t border-slate-200/60 dark:border-slate-800 px-6 py-3.5 space-y-2.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                            <History className="h-3.5 w-3.5 text-blue-500" />
                            <span>{t("interviews.previousRoundsCount", { count: previousInterviews.length })}</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {previousInterviews.map((prev, pIdx) => (
                              <div
                                key={`${prev.date}-${prev.time}-${pIdx}`}
                                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1.5"
                              >
                                <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                                  <span>
                                    {prev.round
                                      ? t("interviews.roundInterview", { round: prev.round })
                                      : getInterviewTypeLabel(prev.type, t)}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    {prev.date} ({prev.time})
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3 text-slate-400" />
                                    <span>{prev.interviewer}</span>
                                  </div>
                                  <span>
                                    {prev.format === "OFFICE"
                                      ? t("interviews.atOffice")
                                      : t("interviews.onlineMeeting")}
                                  </span>
                                </div>

                                {prev.scorecard && (
                                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                                    <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                                      <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                                      {prev.scorecard.overallRating} ⭐
                                    </span>
                                    {getRecommendationBadge(prev.scorecard.recommendation)}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
