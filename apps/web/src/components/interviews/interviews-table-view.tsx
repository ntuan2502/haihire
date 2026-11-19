"use client";

import { Fragment, useState, type ReactNode } from "react";
import { extractDateTimeInTimezone } from "@haihire/shared";
import { addDaysToYmd, resolveEffectiveTimezone } from "@/lib/utils";
import {
  getInterviewsFromApplication,
  type ScheduledInterviewInfo,
} from "@/lib/interviews";
import { useLocalization } from "@/components/providers/localization-provider";
import { useI18n } from "@/i18n";
import type { Application, Job } from "@/types";
import { InterviewsTableRow } from "./table/interviews-table-row";
import { InterviewsTableSubrow } from "./table/interviews-table-subrow";

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
  footer?: ReactNode;
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
  footer,
}: InterviewsTableViewProps) {
  const { t } = useI18n();
  const { localization, isConfigured } = useLocalization();
  const effectiveTimezone = resolveEffectiveTimezone(
    localization.timezone,
    isConfigured,
  );
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

  const getRelativeDateBadge = (isoString?: string) => {
    if (!isoString) return null;
    const dateYmd = extractDateTimeInTimezone(
      isoString,
      effectiveTimezone,
    ).date;
    const todayYmd = extractDateTimeInTimezone(
      new Date().toISOString(),
      effectiveTimezone,
    ).date;
    const tomorrowYmd = addDaysToYmd(todayYmd, 1);

    if (dateYmd === todayYmd) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800">
          {t("dashboard.today")}
        </span>
      );
    }
    if (dateYmd === tomorrowYmd) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
          {t("dashboard.tomorrow")}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-xs overflow-hidden transition-all">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-muted-foreground uppercase tracking-wider text-[11px] font-semibold">
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
          <tbody className="divide-y divide-border">
            {applications.map((app, index) => {
              const job = jobs.find((j) => String(j.id) === String(app.jobId));
              const allInterviews = getInterviewsFromApplication(app);
              const currentInterview = allInterviews[0];
              const previousInterviews = allInterviews.slice(1);
              const rowKey = currentInterview?.id
                ? `${app.id}-${currentInterview.id}`
                : `${app.id}-${index}`;
              const isExpanded = expandedRows[rowKey] ?? false;

              return (
                <Fragment key={rowKey}>
                  <InterviewsTableRow
                    app={app}
                    job={job}
                    currentInterview={currentInterview}
                    allInterviews={allInterviews}
                    isExpanded={isExpanded}
                    onToggleExpand={() => toggleRowHistory(rowKey)}
                    visibleColumns={visibleColumns}
                    onOpenScheduleModal={onOpenScheduleModal}
                    onOpenScorecard={onOpenScorecard}
                    onNavigateToPipeline={onNavigateToPipeline}
                    onCancelInterview={onCancelInterview}
                    canEdit={canEdit}
                    getRelativeDateBadge={getRelativeDateBadge}
                  />

                  {isExpanded && previousInterviews.length > 0 && (
                    <InterviewsTableSubrow
                      previousInterviews={previousInterviews}
                      visibleColumnCount={visibleColumnCount}
                    />
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {footer && (
        <div className="py-3 px-4 sm:px-5 border-t border-border bg-muted/30">
          {footer}
        </div>
      )}
    </div>
  );
}
