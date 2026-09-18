"use client";

import {
  Briefcase,
  Calendar,
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

export interface InterviewsGridViewProps {
  applications: Application[];
  jobs: Job[];
  expandedCards: Record<string, boolean>;
  onToggleCardHistory: (id: string) => void;
  onOpenScheduleModal: (
    app: Application,
    dateStr?: string,
    interview?: ScheduledInterviewInfo,
  ) => void;
  onOpenScorecard: (app: Application, interview: ScheduledInterviewInfo) => void;
  onNavigateToPipeline: (jobId: string) => void;
  canEdit?: boolean;
}

export function InterviewsGridView({
  applications,
  jobs,
  expandedCards,
  onToggleCardHistory,
  onOpenScheduleModal,
  onOpenScorecard,
  onNavigateToPipeline,
  canEdit = true,
}: InterviewsGridViewProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
        {applications.map((app) => {
          const job = jobs.find((j) => String(j.id) === String(app.jobId));
          const allInterviews = getInterviewsFromApplication(app);
          const currentInterview = allInterviews[0];
          const previousInterviews = allInterviews.slice(1);
          const displayName = getCandidateDisplayName(app);
          const initials = getInitials(displayName);
          const isExpanded = expandedCards[app.id] ?? false;

          return (
            <div
              key={app.id}
              className="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs hover:shadow-md hover:border-blue-300/80 dark:hover:border-blue-900/80 transition-all flex flex-col justify-between space-y-4"
            >
              {/* Top: Header, Job, Schedule */}
              <div className="space-y-3.5">
                {/* Candidate Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {displayName}
                      </h3>
                      <p className="text-xs text-slate-400 truncate">{app.candidateEmail}</p>
                    </div>
                  </div>

                  {allInterviews.length > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200/80 dark:border-emerald-900/60 shrink-0 whitespace-nowrap">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span>
                        {allInterviews.length > 1
                          ? t("interviews.roundsBadge", { count: allInterviews.length })
                          : t("interviews.hasScheduleBadge")}
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[11px] font-bold border border-amber-200/80 dark:border-amber-900/60 shrink-0 whitespace-nowrap">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      <span>{t("interviews.awaitingScheduleBadge")}</span>
                    </span>
                  )}
                </div>

                {/* Job Position Line */}
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <Briefcase className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {job?.title || t("interviews.defaultJob")}
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {job?.department || t("interviews.defaultDepartment")}
                  </span>
                </div>

                {/* Primary Interview Box */}
                {currentInterview ? (
                  <div className="rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 p-3.5 space-y-2.5">
                    {/* Time & Round Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-xs whitespace-nowrap">
                        <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="whitespace-nowrap">{currentInterview.date}</span>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span className="text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {currentInterview.time}
                        </span>
                      </div>
                      {currentInterview.round ? (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200/80 dark:border-blue-800/60 shrink-0 whitespace-nowrap">
                          {t("interviews.roundInterview", { round: currentInterview.round })}
                        </span>
                      ) : allInterviews.length > 1 ? (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200/80 dark:border-blue-800/60 shrink-0 whitespace-nowrap">
                          {t("interviews.latestBadge")}
                        </span>
                      ) : null}
                    </div>

                    {/* Interview Type Badge */}
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-slate-200/80 dark:border-slate-700 shadow-2xs max-w-full truncate">
                        {getInterviewTypeLabel(currentInterview.type, t)}
                      </span>
                    </div>

                    {/* Meta: Interviewer & Format */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="text-[11px] text-slate-400">{t("interviews.interviewerLabel")}</span>
                        <strong className="text-slate-800 dark:text-slate-200 text-xs truncate">
                          {currentInterview.interviewer}
                        </strong>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        {currentInterview.format === "OFFICE" ? (
                          <>
                            <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            <span className="text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                              {t("interviews.atOffice")}
                            </span>
                          </>
                        ) : (
                          <>
                            <Video className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                              {t("interviews.onlineFormat", { format: currentInterview.format })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Meeting Link or Location */}
                    {currentInterview.linkOrLocation && (
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                        {currentInterview.linkOrLocation.startsWith("http") ? (
                          <a
                            href={currentInterview.linkOrLocation}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline"
                          >
                            <Video className="h-3.5 w-3.5" />
                            <span>{t("interviews.joinOnlineMeeting")}</span>
                            <ExternalLink className="h-3 w-3 ml-0.5" />
                          </a>
                        ) : (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {t("interviews.locationLabel", { location: currentInterview.linkOrLocation })}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Scorecard Display or Rating Button */}
                    {currentInterview.scorecard ? (
                      <div
                        onClick={() => onOpenScorecard(app, currentInterview)}
                        className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs cursor-pointer hover:opacity-85 transition-opacity"
                        title={t("interviews.scorecardTooltip")}
                      >
                        <div className="flex items-center gap-1 font-bold text-amber-700 dark:text-amber-400">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span>{currentInterview.scorecard.overallRating} / 5</span>
                          <span className="text-[10px] font-normal text-slate-400 ml-0.5 hidden sm:inline">
                            {t("interviews.ratedStatus")}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 shadow-2xs">
                          {currentInterview.scorecard.recommendation}
                        </span>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                        <button
                          type="button"
                          onClick={() => onOpenScorecard(app, currentInterview)}
                          className="w-full py-1.5 px-3 rounded-xl bg-amber-50/70 hover:bg-amber-100/70 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[11px] font-bold border border-amber-200/70 dark:border-amber-800/60 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span>{t("interviews.scorecardAction")}</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 p-3.5 space-y-1">
                    <p className="font-bold text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                      {t("interviews.kpiReady")}
                    </p>
                    <p className="text-[11px] text-amber-700/80 dark:text-amber-400">
                      {t("interviews.readyForInterviewDesc")}
                    </p>
                  </div>
                )}

                {/* Previous Rounds Collapsible */}
                {previousInterviews.length > 0 && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => onToggleCardHistory(app.id)}
                      className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-1.5">
                        <History className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                          {t("interviews.previousRoundsCount", { count: previousInterviews.length })}
                        </span>
                      </div>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="space-y-2 p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60 divide-y divide-slate-100 dark:divide-slate-800">
                        {previousInterviews.map((prev, pIdx) => (
                          <div
                            key={`${prev.date}-${prev.time}-${pIdx}`}
                            className={`text-[11px] space-y-1 ${pIdx > 0 ? "pt-2" : ""}`}
                          >
                            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-medium gap-2">
                              <span className="whitespace-nowrap">
                                {prev.date} ({prev.time})
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 font-bold shrink-0 truncate max-w-[140px]">
                                {prev.round
                                  ? t("interviews.roundInterview", { round: prev.round })
                                  : getInterviewTypeLabel(prev.type, t)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>{t("interviews.pvPrefix", { interviewer: prev.interviewer })}</span>
                              <span>
                                {prev.format === "OFFICE"
                                  ? t("interviews.atOffice")
                                  : t("interviews.onlineMeeting")}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions Row - Anchored to bottom with mt-auto */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (job) {
                      onNavigateToPipeline(job.id);
                    }
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>{t("interviews.scorecardBoard")}</span>
                  <ChevronRight className="h-3 w-3" />
                </button>

                {canEdit && (
                  <Button
                    size="sm"
                    onClick={() => onOpenScheduleModal(app, undefined, currentInterview)}
                    variant="outline"
                    className="h-7.5 px-3 rounded-xl text-xs font-semibold cursor-pointer hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-800 transition-colors"
                  >
                    {allInterviews.length > 0
                      ? t("interviews.updateSchedule")
                      : t("interviews.scheduleNow")}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
