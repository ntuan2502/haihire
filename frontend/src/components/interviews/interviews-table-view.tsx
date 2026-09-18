"use client";

import {
  ChevronRight,
  Clock,
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

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] font-bold">
              <th className="py-3 px-3.5">{t("interviews.tableHeaders.candidate")}</th>
              <th className="py-3 px-3.5">{t("interviews.tableHeaders.job")}</th>
              <th className="py-3 px-3.5">{t("interviews.tableHeaders.schedule")}</th>
              <th className="py-3 px-3.5">{t("interviews.tableHeaders.interviewer")}</th>
              <th className="py-3 px-3 text-center">{t("interviews.tableHeaders.rounds")}</th>
              <th className="py-3 px-3 text-center">{t("interviews.tableHeaders.status")}</th>
              <th className="py-3 px-3 text-center">{t("interviews.tableHeaders.rating")}</th>
              <th className="py-3 px-3.5 text-right">{t("interviews.tableHeaders.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {applications.map((app) => {
              const job = jobs.find((j) => String(j.id) === String(app.jobId));
              const allInterviews = getInterviewsFromApplication(app);
              const currentInterview = allInterviews[0];
              const displayName = getCandidateDisplayName(app);
              const initials = getInitials(displayName);

              return (
                <tr
                  key={app.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Candidate */}
                  <td className="py-3 px-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
                        {initials}
                      </div>
                      <div className="min-w-0 max-w-[140px] xl:max-w-[180px]">
                        <p className="font-bold text-slate-900 dark:text-white truncate">
                          {displayName}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {app.candidateEmail}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Job */}
                  <td className="py-3 px-3.5">
                    <div className="max-w-[140px] xl:max-w-[180px]">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {job?.title || t("interviews.defaultJob")}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {job?.department || t("interviews.defaultDepartment")}
                      </p>
                    </div>
                  </td>

                  {/* Next Interview: Stacked in 3 clean lines */}
                  <td className="py-3 px-3.5">
                    {currentInterview ? (
                      <div className="space-y-1 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-xs">
                          <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span>
                            {t("interviews.atTime", {
                              date: currentInterview.date,
                              time: currentInterview.time,
                            })}
                          </span>
                        </div>
                        <div>
                          <span className="inline-block px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200/80 dark:border-blue-900/60">
                            {getInterviewTypeLabel(currentInterview.type, t)}
                          </span>
                        </div>
                        <div>
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
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px] whitespace-nowrap">
                        {t("interviews.notScheduledYet")}
                      </span>
                    )}
                  </td>

                  {/* Interviewer */}
                  <td className="py-3 px-3.5 whitespace-nowrap">
                    {currentInterview ? (
                      <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium max-w-[140px] xl:max-w-[170px] truncate">
                        <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{currentInterview.interviewer}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Rounds */}
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    {allInterviews.length > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200/80 dark:border-blue-900/60">
                        {t("interviews.roundsCount", { count: allInterviews.length })}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    {allInterviews.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200/80 dark:border-emerald-900/60">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>{t("interviews.hasScheduleBadge")}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200/80 dark:border-amber-900/60">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <span>{t("interviews.awaitingScheduleBadge")}</span>
                      </span>
                    )}
                  </td>

                  {/* Scorecard Evaluation */}
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    {currentInterview?.scorecard ? (
                      <button
                        type="button"
                        onClick={() => onOpenScorecard(app, currentInterview)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200/80 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer transition-colors shadow-2xs"
                        title={t("interviews.scorecardTooltip")}
                      >
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span>{currentInterview.scorecard.overallRating} ⭐</span>
                      </button>
                    ) : currentInterview ? (
                      <button
                        type="button"
                        onClick={() => onOpenScorecard(app, currentInterview)}
                        className="text-[10px] text-amber-700 dark:text-amber-400 font-bold hover:underline cursor-pointer"
                      >
                        {t("interviews.rateNow")}
                      </button>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-3.5 text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      <div className="flex flex-col items-end gap-1">
                        {currentInterview?.linkOrLocation?.startsWith("http") && (
                          <a
                            href={currentInterview.linkOrLocation}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-6 px-2 rounded-md border border-blue-200 dark:border-blue-800 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 inline-flex items-center gap-1 transition-colors"
                            title={t("interviews.joinOnlineMeeting")}
                          >
                            <Video className="h-2.5 w-2.5" />
                            <span>{t("interviews.joinMeetingShort")}</span>
                          </a>
                        )}

                        {canEdit && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onOpenScheduleModal(app, undefined, currentInterview)}
                            className="h-6 px-2 rounded-md text-[10px] font-semibold cursor-pointer hover:border-blue-400 hover:text-blue-600 transition-colors"
                          >
                            {allInterviews.length > 0
                              ? t("interviews.editSchedule")
                              : t("interviews.scheduleNow")}
                          </Button>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (job) {
                            onNavigateToPipeline(job.id);
                          }
                        }}
                        className="h-7 w-6 p-0 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                        title={t("interviews.pipelineReviewTooltip")}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
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
