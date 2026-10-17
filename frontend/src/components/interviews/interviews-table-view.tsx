"use client";

import { Fragment, useState } from "react";
import {
  Briefcase,
  ChevronDown,
  Clock,
  ExternalLink,
  History,
  MapPin,
  Star,
  User,
  Video,
  Trash2,
  Pencil,
  Calendar,
} from "lucide-react";
import { getInitials, getCandidateDisplayName } from "@/lib/utils";
import {
  getInterviewsFromApplication,
  getInterviewTypeLabel,
  getRecommendationLabel,
  type ScheduledInterviewInfo,
} from "@/lib/interviews";
import { useI18n } from "@/i18n";
import type { Application, Job } from "@/types";

export interface InterviewsTableViewProps {
  applications: Application[];
  jobs: Job[];
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
}

export function InterviewsTableView({
  applications,
  jobs,
  visibleColumns,
  onOpenScheduleModal,
  onOpenScorecard,
  onNavigateToPipeline,
  onCancelInterview,
  canEdit = true,
}: InterviewsTableViewProps) {
  const { t } = useI18n();
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const visibleColumnCount =
    1 +
    (visibleColumns?.job !== false ? 1 : 0) +
    (visibleColumns?.schedule !== false ? 1 : 0) +
    (visibleColumns?.interviewer !== false ? 1 : 0) +
    (visibleColumns?.status !== false ? 1 : 0) +
    (visibleColumns?.rating !== false ? 1 : 0) +
    1;

  const toggleRowHistory = (appId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [appId]: !prev[appId],
    }));
  };

  const getRecommendationBadge = (rec?: string) => {
    if (!rec) return null;
    const label = getRecommendationLabel(rec, t);
    const key = rec.toUpperCase();
    if (
      key === "STRONG_YES" ||
      key.includes("STRONG") ||
      key.includes("TUYỂN NGAY")
    ) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 whitespace-nowrap">
          {label}
        </span>
      );
    }
    if (key === "YES" || key.includes("ĐỒNG Ý")) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 whitespace-nowrap">
          {label}
        </span>
      );
    }
    if (key === "NEUTRAL" || key.includes("CÂN NHẮC")) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 whitespace-nowrap">
          {label}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60 whitespace-nowrap">
        {label}
      </span>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-2xs overflow-hidden transition-all">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] font-bold">
              <th scope="col" className="py-3.5 px-4 text-left">
                {t("interviews.tableHeaders.candidate")}
              </th>
              {visibleColumns?.job !== false && (
                <th scope="col" className="py-3.5 px-4 text-left">
                  {t("interviews.tableHeaders.job")}
                </th>
              )}
              {visibleColumns?.schedule !== false && (
                <th scope="col" className="py-3.5 px-4 text-left">
                  {t("interviews.tableHeaders.schedule")}
                </th>
              )}
              {visibleColumns?.interviewer !== false && (
                <th scope="col" className="py-3.5 px-4 text-left">
                  {t("interviews.tableHeaders.interviewer")}
                </th>
              )}
              {visibleColumns?.status !== false && (
                <th scope="col" className="py-3.5 px-3 text-center">
                  {t("interviews.tableHeaders.status")}
                </th>
              )}
              {visibleColumns?.rating !== false && (
                <th scope="col" className="py-3.5 px-3 text-center">
                  {t("interviews.tableHeaders.rating")}
                </th>
              )}
              <th scope="col" className="py-3.5 px-4 text-right">
                {t("interviews.tableHeaders.actions")}
              </th>
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
                <Fragment key={app.id}>
                  <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
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
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 shadow-2xs group-hover/cand:scale-105 transition-transform">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate group-hover/cand:text-blue-600 dark:group-hover/cand:text-blue-400 group-hover/cand:underline transition-colors">
                            {displayName}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {app.candidateEmail}
                          </p>
                        </div>
                      </button>
                    </td>

                    {/* 2. Job Position */}
                    {visibleColumns?.job !== false && (
                      <td className="py-3.5 px-4 align-middle">
                        <div className="pr-2 min-w-0">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 truncate">
                            <Briefcase className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            <span className="truncate">
                              {job?.title || t("interviews.defaultJob")}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate pl-5">
                            {job?.department ||
                              t("interviews.defaultDepartment")}
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
                              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-xs whitespace-nowrap">
                                <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                <span>
                                  {currentInterview.date} •{" "}
                                  {currentInterview.time}
                                </span>
                              </div>
                              <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
                                <span className="inline-block px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200/80 dark:border-blue-900/60">
                                  {getInterviewTypeLabel(
                                    currentInterview.type,
                                    t,
                                  )}
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

                                {currentInterview.linkOrLocation?.startsWith(
                                  "http",
                                ) && (
                                  <a
                                    href={currentInterview.linkOrLocation}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline bg-blue-50/70 dark:bg-blue-950/40"
                                    title={t("interviews.joinOnlineMeeting")}
                                  >
                                    <span>
                                      {t("interviews.joinMeetingShort")}
                                    </span>
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
                              <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium truncate">
                                <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">
                                  {currentInterview.interviewer}
                                </span>
                              </div>
                              {currentInterview.round && (
                                <p className="text-[10px] text-slate-400 pl-5">
                                  {t("interviews.roundInterview", {
                                    round: currentInterview.round,
                                  })}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* 5. Status (Stacked 2 lines: Status badge above, Rounds badge below) */}
                    {visibleColumns?.status !== false && (
                      <td className="py-3.5 px-3 text-center align-middle">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          {/* Line 1: Status */}
                          {allInterviews.length > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200/80 dark:border-emerald-900/60 whitespace-nowrap">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              <span>{t("interviews.hasScheduleBadge")}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200/80 dark:border-amber-900/60 whitespace-nowrap">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              <span>
                                {t("interviews.awaitingScheduleBadge")}
                              </span>
                            </span>
                          )}

                          {/* Line 2: Rounds & History Toggle */}
                          {allInterviews.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => toggleRowHistory(app.id)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200/80 dark:border-blue-900/60 transition-colors cursor-pointer whitespace-nowrap"
                              title={t(
                                "interviews.candidateInterviewsMultiple",
                                { count: allInterviews.length },
                              )}
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
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold whitespace-nowrap">
                              {t("interviews.roundsCount", { count: 1 })}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">
                              —
                            </span>
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
                              onClick={() =>
                                onOpenScorecard(app, currentInterview)
                              }
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200/80 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer transition-colors shadow-2xs"
                              title={t("interviews.scorecardTooltip")}
                              aria-label={`${t("interviews.scorecardTooltip")} - ${displayName}`}
                            >
                              <Star
                                className="h-3 w-3 fill-amber-400 text-amber-400"
                                aria-hidden="true"
                              />
                              <span>
                                {currentInterview.scorecard.overallRating} ⭐
                              </span>
                            </button>
                            {getRecommendationBadge(
                              currentInterview.scorecard.recommendation,
                            )}
                          </div>
                        ) : currentInterview ? (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenScorecard(app, currentInterview)
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50/70 hover:bg-amber-100/70 dark:bg-amber-950/40 font-bold border border-amber-200/70 dark:border-amber-900/60 cursor-pointer transition-colors"
                            aria-label={`${t("interviews.rateNow")} - ${displayName}`}
                          >
                            <Star
                              className="h-2.5 w-2.5 text-amber-500"
                              aria-hidden="true"
                            />
                            <span>{t("interviews.rateNow")}</span>
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
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
                              onOpenScheduleModal(
                                app,
                                undefined,
                                currentInterview,
                              );
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center"
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
                              <Calendar
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
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
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer inline-flex items-center"
                            title={t("interviews.cancelThisSchedule")}
                            aria-label={`${t("interviews.cancelThisSchedule")} - ${displayName}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expandable History Drawer for previous rounds */}
                  {isExpanded && previousInterviews.length > 0 && (
                    <tr className="bg-slate-50/90 dark:bg-slate-800/40 border-t border-slate-200/60 dark:border-slate-800">
                      <td colSpan={visibleColumnCount} className="px-6 py-3.5">
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                            <History className="h-3.5 w-3.5 text-blue-500" />
                            <span>
                              {t("interviews.previousRoundsCount", {
                                count: previousInterviews.length,
                              })}
                            </span>
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
                                      ? t("interviews.roundInterview", {
                                          round: prev.round,
                                        })
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
                                    {getRecommendationBadge(
                                      prev.scorecard.recommendation,
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
