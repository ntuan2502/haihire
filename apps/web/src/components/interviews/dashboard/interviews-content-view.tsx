"use client";

import Link from "next/link";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Pagination } from "@/components/shared/pagination";
import { StatusState } from "@/components/shared/status-state";
import { InterviewsCalendarView } from "@/components/interviews/interviews-calendar-view";
import { InterviewsTableView } from "@/components/interviews/interviews-table-view";
import { InterviewsEmptyState, type ViewMode } from "./index";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import { extractDateTimeInTimezone } from "@haihire/shared";
import type { Application, Job } from "@/types";

interface InterviewsContentViewProps {
  viewMode: ViewMode;
  calendarMode: "month" | "week";
  activeMonthParam?: string;
  activeDateParam?: string;
  effectiveTimezone: string;
  calendarLoading: boolean;
  hasCalendarData: boolean;
  calendarApplications: Application[];
  jobs: Job[];
  jobsLoading: boolean;
  appsLoading: boolean;
  hasInterviewsData: boolean;
  focusedInterviewId: string;
  focusedInterviewLoading: boolean;
  focusedInterviewIsError: boolean;
  focusedInterviewError: unknown;
  paginatedList: Application[];
  visibleColumns: {
    candidate: boolean;
    job: boolean;
    schedule: boolean;
    interviewer: boolean;
    status: boolean;
    rating: boolean;
  };
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  canCreateInterview: boolean;
  canDeleteInterview: boolean;
  onCalendarStateChange: (next: {
    calendarMode: "month" | "week";
    month?: string | null;
    date?: string | null;
  }) => void;
  onVisibleRangeChange: (range: {
    startDate?: string;
    endDate?: string;
  }) => void;
  onOpenScheduleModal: (
    app?: Application,
    dateStr?: string,
    interview?: ScheduledInterviewInfo,
  ) => void;
  onOpenScorecard: (
    app: Application,
    interview: ScheduledInterviewInfo,
  ) => void;
  onRequestCancel: (
    app: Application,
    interview: ScheduledInterviewInfo,
  ) => void;
  onNavigateToPipeline: (
    jobId: string,
    applicationId?: string,
    stage?: string,
  ) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onResetFocused: () => void;
}

/**
 * Renders either the Calendar view, Table view with pagination, or empty/error states.
 */
export function InterviewsContentView({
  viewMode,
  calendarMode,
  activeMonthParam,
  activeDateParam,
  effectiveTimezone,
  calendarLoading,
  hasCalendarData,
  calendarApplications,
  jobs,
  jobsLoading,
  appsLoading,
  hasInterviewsData,
  focusedInterviewId,
  focusedInterviewLoading,
  focusedInterviewIsError,
  focusedInterviewError,
  paginatedList,
  visibleColumns,
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  canCreateInterview,
  canDeleteInterview,
  onCalendarStateChange,
  onVisibleRangeChange,
  onOpenScheduleModal,
  onOpenScorecard,
  onRequestCancel,
  onNavigateToPipeline,
  onPageChange,
  onPageSizeChange,
  onResetFocused,
}: InterviewsContentViewProps) {
  const { t } = useI18n();

  if (viewMode === "calendar") {
    return (
      <div className="space-y-3">
        {calendarLoading && !hasCalendarData && (
          <div className="py-4 flex justify-center">
            <LoadingSpinner />
          </div>
        )}
        <InterviewsCalendarView
          applications={calendarApplications}
          jobs={jobs}
          calendarMode={calendarMode}
          activeMonth={activeMonthParam}
          activeDate={activeDateParam}
          onCalendarStateChange={onCalendarStateChange}
          onScheduleDate={(dateStr) => onOpenScheduleModal(undefined, dateStr)}
          onEditSchedule={(app, intv) =>
            onOpenScheduleModal(
              app,
              extractDateTimeInTimezone(intv.scheduledAt, effectiveTimezone)
                .date,
              intv,
            )
          }
          onOpenScorecard={onOpenScorecard}
          onCancelInterview={canDeleteInterview ? onRequestCancel : undefined}
          onVisibleRangeChange={onVisibleRangeChange}
          canEdit={canCreateInterview}
        />
      </div>
    );
  }

  if (
    (jobsLoading || appsLoading || focusedInterviewLoading) &&
    !hasInterviewsData
  ) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (focusedInterviewId && focusedInterviewIsError) {
    return (
      <StatusState
        status="404"
        variant="card"
        title={getApiErrorMessage(focusedInterviewError, t)}
        actionLabel={t("common.viewAll")}
        onAction={onResetFocused}
      />
    );
  }

  if (paginatedList.length === 0) {
    return (
      <InterviewsEmptyState
        canEdit={canCreateInterview}
        onOpenScheduleModal={() => onOpenScheduleModal()}
      />
    );
  }

  return (
    <>
      <InterviewsTableView
        applications={paginatedList}
        jobs={jobs}
        visibleColumns={visibleColumns}
        onOpenScheduleModal={onOpenScheduleModal}
        onOpenScorecard={onOpenScorecard}
        onCancelInterview={canDeleteInterview ? onRequestCancel : undefined}
        onNavigateToPipeline={onNavigateToPipeline}
        canEdit={canCreateInterview}
        footer={
          !focusedInterviewId && paginatedList.length > 0 ? (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 50, 100]}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
              itemLabel={t("nav.interviews").toLowerCase()}
            />
          ) : undefined
        }
      />

      {focusedInterviewId && (
        <Link
          href="/interviews"
          className="text-sm font-medium text-primary underline"
        >
          {t("common.viewAll")}
        </Link>
      )}
    </>
  );
}
