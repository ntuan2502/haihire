"use client";

import Link from "next/link";
import { Calendar, ArrowRight, Video, MapPin, User } from "lucide-react";
import { extractDateTimeInTimezone } from "@haihire/shared";
import {
  addDaysToYmd,
  formatDate,
  formatTime,
  getCandidateDisplayName,
  getInitials,
  resolveEffectiveTimezone,
} from "@/lib/utils";
import {
  getInterviewTypeLabel,
  type ScheduledInterviewInfo,
} from "@/lib/interviews";
import { useLocalization } from "@/components/providers/localization-provider";
import { useI18n } from "@/i18n";
import type { Job, Application } from "@/types";

export interface DashboardInterviewItem {
  application: Application;
  interview: ScheduledInterviewInfo;
  job?: Job;
}

interface DashboardUpcomingInterviewsProps {
  upcomingInterviews: DashboardInterviewItem[];
}

export function DashboardUpcomingInterviews({
  upcomingInterviews,
}: DashboardUpcomingInterviewsProps) {
  const { t } = useI18n();
  const { localization, isConfigured } = useLocalization();
  const effectiveTimezone = resolveEffectiveTimezone(
    localization.timezone,
    isConfigured,
  );
  const todayYmd = extractDateTimeInTimezone(
    new Date(),
    effectiveTimezone,
  ).date;
  const tomorrowYmd = addDaysToYmd(todayYmd, 1);

  return (
    <div className="flex flex-col h-[600px] rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
            {t("dashboard.upcomingInterviews")}
          </h3>
          {upcomingInterviews.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/60 shrink-0">
              {upcomingInterviews.length}
            </span>
          )}
        </div>
        <Link
          href="/dashboard/interviews"
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 transition-colors shrink-0"
        >
          <span>{t("common.viewAll")}</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Scrollable Interviews Content */}
      {upcomingInterviews.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-1">
            <Calendar className="h-5 w-5" />
          </div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {t("dashboard.noUpcomingInterviews")}
          </h4>
          <p className="text-[11px] text-slate-400">
            {t("dashboard.next7Days")}
          </p>
          <Link
            href="/dashboard/interviews"
            className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            <span>+ {t("dashboard.scheduleNew")}</span>
          </Link>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pt-1 pr-1.5 -mr-1.5 divide-y divide-slate-100 dark:divide-slate-800/80">
          {upcomingInterviews.map((item, idx) => {
            const { application: app, interview: intv, job } = item;
            const dateYmd = extractDateTimeInTimezone(
              intv.scheduledAt,
              effectiveTimezone,
            ).date;
            const formattedTime = formatTime(intv.scheduledAt);
            const isToday = Boolean(dateYmd && dateYmd === todayYmd);
            const isTomorrow = Boolean(dateYmd && dateYmd === tomorrowYmd);
            const isOnline = intv.format !== "OFFICE";
            const candidateDisplay = getCandidateDisplayName(app);
            const dateBadgeText = isToday
              ? `${t("dashboard.today")} ${formattedTime}`
              : isTomorrow
                ? `${t("dashboard.tomorrow")} ${formattedTime}`
                : `${formatDate(intv.scheduledAt)} ${formattedTime}`;

            return (
              <div
                key={intv.id || `${app.id}-${intv.scheduledAt}-${idx}`}
                className="py-3 px-1 space-y-2 group hover:bg-slate-50/60 dark:hover:bg-slate-800/40 rounded-xl transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-blue-100/80 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {getInitials(candidateDisplay)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          href="/dashboard/interviews"
                          className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors truncate max-w-[130px]"
                        >
                          {candidateDisplay}
                        </Link>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          •
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                          {getInterviewTypeLabel(intv.type, t)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {job?.title || t("jobs.title")}
                      </p>
                    </div>
                  </div>

                  {/* Date pill */}
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                      isToday
                        ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60"
                        : isTomorrow
                          ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80"
                    }`}
                  >
                    {dateBadgeText}
                  </span>
                </div>

                {/* Bottom details row */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pl-10.5">
                  <div className="flex items-center gap-3 truncate">
                    <span className="flex items-center gap-1 truncate max-w-[110px]">
                      <User className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate">{intv.interviewer}</span>
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      {isOnline ? (
                        <>
                          <Video className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[10px]">
                            {intv.format}
                          </span>
                        </>
                      ) : (
                        <>
                          <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                          <span className="text-rose-600 dark:text-rose-400 font-medium text-[10px]">
                            {t("dashboard.officeMeeting")}
                          </span>
                        </>
                      )}
                    </span>
                  </div>

                  {intv.linkOrLocation?.startsWith("http") && (
                    <a
                      href={intv.linkOrLocation}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-bold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors shrink-0"
                    >
                      <Video className="h-2.5 w-2.5" />
                      <span>{t("dashboard.joinMeeting")}</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
