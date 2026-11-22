"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { usePersistedColumns } from "@/hooks/use-persisted-columns";
import { useTableParams } from "@/hooks/use-table-params";
import {
  useAllJobs,
  useApplications,
  useInterviews,
  useDeleteInterviewMutation,
} from "@/hooks/use-queries";
import { useInterview } from "@/hooks/use-interview-queries";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { type ScheduledInterviewInfo } from "@/lib/interviews";
import { resolveEffectiveTimezone } from "@/lib/utils";
import {
  InterviewsHeader,
  InterviewsFilterBar,
  type ViewMode,
  type SortOption,
} from "@/components/interviews/dashboard";
import { InterviewsContentView } from "@/components/interviews/dashboard/interviews-content-view";
import { InterviewsModalsBundle } from "@/components/interviews/dashboard/interviews-modals-bundle";
import { useLocalization } from "@/components/providers/localization-provider";
import { useI18n } from "@/i18n";
import { useHasPermission } from "@/hooks/use-has-permission";
import type { Application } from "@/types";

function InterviewsPageContent() {
  const router = useRouter();
  const { user, canEdit: _canEdit } = useAuth();
  const { t } = useI18n();
  const { localization, isConfigured } = useLocalization();
  const effectiveTimezone = resolveEffectiveTimezone(
    localization.timezone,
    isConfigured,
  );

  const canCreateInterview = useHasPermission("interview:create");
  const canDeleteInterview = useHasPermission("interview:delete");

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedAppForSchedule, setSelectedAppForSchedule] = useState<
    Application | undefined
  >(undefined);
  const [scheduleDate, setScheduleDate] = useState<string | undefined>(
    undefined,
  );
  const [selectedInterviewForEdit, setSelectedInterviewForEdit] = useState<
    ScheduledInterviewInfo | undefined
  >(undefined);

  // Scorecard modal state
  const [scorecardModalOpen, setScorecardModalOpen] = useState(false);
  const [selectedAppForScorecard, setSelectedAppForScorecard] = useState<
    Application | undefined
  >(undefined);
  const [selectedInterviewForScorecard, setSelectedInterviewForScorecard] =
    useState<ScheduledInterviewInfo | undefined>(undefined);

  // Cancel interview modal state
  const deleteInterviewMutation = useDeleteInterviewMutation();
  const [cancelInterviewState, setCancelInterviewState] = useState<{
    app: Application;
    interview: ScheduledInterviewInfo;
  } | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Synchronized URL Query State for Pagination, Search & Filters
  const {
    page: currentPage,
    limit: pageSize,
    search: searchQuery,
    setSearch,
    setPage: setCurrentPage,
    setLimit: setPageSize,
    setParam,
    setParams,
    getParam,
    searchParams,
  } = useTableParams();

  const focusedInterviewId = getParam("interviewId", "");
  const focusedInterview = useInterview(
    focusedInterviewId,
    user?.organizationId,
  );
  const selectedJobFilter = getParam("jobId", "ALL");
  const rawTab = getParam("tab", "ALL");
  const activeTab: "ALL" | "UPCOMING" | "AWAITING" =
    rawTab === "UPCOMING" || rawTab === "AWAITING" ? rawTab : "ALL";

  const rawViewMode = getParam("viewMode", "table");
  const viewMode: ViewMode = rawViewMode === "calendar" ? "calendar" : "table";

  const rawCalendarMode = getParam("calendarMode", "month");
  const calendarMode: "month" | "week" =
    rawCalendarMode === "week" ? "week" : "month";
  const activeMonthParam = getParam("month", "") || undefined;
  const activeDateParam = getParam("date", "") || undefined;

  const rawSortBy = getParam("sortBy", "upcoming");
  const sortBy: SortOption =
    rawSortBy === "newest" || rawSortBy === "name" ? rawSortBy : "upcoming";

  useEffect(() => {
    if (
      viewMode === "calendar" &&
      (getParam("tab") ||
        getParam("sortBy") ||
        getParam("page") ||
        getParam("limit"))
    ) {
      setParams({ tab: null, sortBy: null, limit: null }, true);
    } else if (
      viewMode === "table" &&
      (getParam("calendarMode") || getParam("month") || getParam("date"))
    ) {
      setParams({ calendarMode: null, month: null, date: null }, false);
    }
  }, [viewMode, searchParams, getParam, setParams]);

  // Filter Drawer State
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Calendar Visible Range State for dynamic date-window queries
  const [calendarRange, setCalendarRange] = useState<{
    startDate?: string;
    endDate?: string;
  }>({});

  const { columns: visibleColumns, toggleColumn } = usePersistedColumns(
    "haihire_interviews_columns_v1",
    {
      candidate: true,
      job: true,
      schedule: true,
      interviewer: true,
      status: true,
      rating: true,
    },
  );

  const handleResetFilters = () => {
    if (viewMode === "calendar") {
      setParam("jobId", null, false);
    } else {
      setParams({ jobId: null, sortBy: null, tab: null }, true);
    }
  };

  const handleViewModeChange = (mode: ViewMode) => {
    if (mode === "calendar") {
      setParams(
        {
          viewMode: "calendar",
          calendarMode: "month",
          interviewId: null,
          tab: null,
          sortBy: null,
          limit: null,
        },
        true,
      );
    } else {
      setParams(
        {
          viewMode: null,
          calendarMode: null,
          month: null,
          date: null,
        },
        false,
      );
    }
  };

  const { data: jobs = [], isLoading: jobsLoading } = useAllJobs(
    user?.organizationId,
  );

  // Lazy-load applications only when the schedule modal is open (scoped to selected job to avoid tenant scan)
  const [scheduleModalJobId, setScheduleModalJobId] = useState<string>("");
  const effectiveScheduleJobId =
    scheduleModalJobId || selectedAppForSchedule?.jobId || "";
  const { data: modalApplicationsData } = useApplications({
    organizationId: user?.organizationId,
    jobId: effectiveScheduleJobId || undefined,
    limit: 1000,
    enabled: scheduleModalOpen,
  });

  const modalApplications = useMemo(() => {
    const list = modalApplicationsData?.data ?? [];
    if (
      selectedAppForSchedule &&
      !list.some((a) => a.id === selectedAppForSchedule.id)
    ) {
      return [selectedAppForSchedule, ...list];
    }
    return list;
  }, [modalApplicationsData?.data, selectedAppForSchedule]);

  // Paginated interviews query from server API (for Table view & Total KPIs)
  const { data: interviewsData, isLoading: appsLoading } = useInterviews({
    organizationId: user?.organizationId,
    page: currentPage,
    limit: pageSize,
    search: searchQuery.trim() || undefined,
    jobId: selectedJobFilter !== "ALL" ? selectedJobFilter : undefined,
    tab: activeTab,
    sortBy,
    enabled: !focusedInterviewId && viewMode === "table",
  });

  // Range-scoped interviews query for Calendar view (wait until date bounds are known)
  const { data: calendarInterviewsData, isLoading: calendarLoading } =
    useInterviews({
      organizationId: user?.organizationId,
      startDate: calendarRange.startDate,
      endDate: calendarRange.endDate,
      search: searchQuery.trim() || undefined,
      jobId: selectedJobFilter !== "ALL" ? selectedJobFilter : undefined,
      enabled:
        viewMode === "calendar" &&
        Boolean(calendarRange.startDate && calendarRange.endDate),
    });

  // Efficient KPI queries
  const { data: upcomingData } = useInterviews({
    organizationId: user?.organizationId,
    tab: "UPCOMING",
    limit: 1,
  });
  const { data: awaitingData } = useInterviews({
    organizationId: user?.organizationId,
    tab: "AWAITING",
    limit: 1,
  });
  const { data: allData } = useInterviews({
    organizationId: user?.organizationId,
    tab: "ALL",
    limit: 1,
  });

  const totalItems = interviewsData?.total ?? 0;
  const totalPages = interviewsData?.totalPages ?? 1;

  const paginatedList = useMemo(() => {
    if (focusedInterviewId) {
      const interview = focusedInterview.data;
      if (!interview?.application) return [];
      return [
        { ...interview.application, interviews: [interview] } as Application,
      ];
    }
    return (interviewsData?.data || [])
      .map((intv) => intv.application as Application)
      .filter(Boolean);
  }, [focusedInterview.data, focusedInterviewId, interviewsData]);

  const calendarApplications = useMemo(() => {
    return (calendarInterviewsData?.data || [])
      .map((intv) => intv.application as Application)
      .filter(Boolean);
  }, [calendarInterviewsData]);

  const filteredAndSortedList = paginatedList;

  // Status counts for SegmentedTabs
  const scheduledCount = upcomingData?.total ?? 0;
  const awaitingCount = awaitingData?.total ?? 0;
  const totalCandidateCount = allData?.total ?? 0;

  const interviewTabs = useMemo(
    () => [
      {
        id: "ALL",
        label: t("common.all"),
        count: allData ? totalCandidateCount : undefined,
      },
      {
        id: "UPCOMING",
        label: t("interviews.kpiScheduled"),
        count: upcomingData ? scheduledCount : undefined,
      },
      {
        id: "AWAITING",
        label: t("interviews.kpiAwaiting"),
        count: awaitingData ? awaitingCount : undefined,
      },
    ],
    [
      t,
      allData,
      totalCandidateCount,
      upcomingData,
      scheduledCount,
      awaitingData,
      awaitingCount,
    ],
  );

  // Open Schedule Modal (for new schedule or editing existing interview)
  const handleOpenScheduleModal = (
    prefilledApp?: Application,
    dateStr?: string,
    interviewToEdit?: ScheduledInterviewInfo,
  ) => {
    setSelectedAppForSchedule(prefilledApp);
    setScheduleDate(dateStr);
    setSelectedInterviewForEdit(interviewToEdit);
    setScheduleModalOpen(true);
  };

  // Open Scorecard Modal
  const handleOpenScorecard = (
    app: Application,
    intv: ScheduledInterviewInfo,
  ) => {
    setSelectedAppForScorecard(app);
    setSelectedInterviewForScorecard(intv);
    setScorecardModalOpen(true);
  };

  return (
    <div className="flex-1 w-full p-4 sm:p-6 space-y-4">
      {/* Standard Header Row */}
      <InterviewsHeader
        totalCount={allData ? totalCandidateCount : undefined}
        canEdit={canCreateInterview}
        onOpenScheduleModal={() => handleOpenScheduleModal()}
      />

      {/* Modern Unified Responsive Toolbar */}
      <InterviewsFilterBar
        tabs={interviewTabs}
        activeTab={activeTab}
        onTabChange={(tabId) => setParam("tab", tabId)}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        searchQuery={searchQuery}
        onSearchChange={setSearch}
        visibleColumns={visibleColumns}
        onToggleColumn={toggleColumn}
        onOpenFilterDrawer={() => setIsFilterOpen(true)}
        selectedJobFilter={selectedJobFilter}
        sortBy={sortBy}
        jobs={jobs}
        onResetFilters={handleResetFilters}
        onClearJobFilter={() =>
          setParam("jobId", null, viewMode !== "calendar")
        }
        onClearSortFilter={() => setParam("sortBy", null)}
      />

      {/* Content Section */}
      <InterviewsContentView
        viewMode={viewMode}
        calendarMode={calendarMode}
        activeMonthParam={activeMonthParam}
        activeDateParam={activeDateParam}
        effectiveTimezone={effectiveTimezone}
        calendarLoading={calendarLoading}
        hasCalendarData={Boolean(calendarInterviewsData)}
        calendarApplications={calendarApplications}
        jobs={jobs}
        jobsLoading={jobsLoading}
        appsLoading={appsLoading}
        hasInterviewsData={Boolean(interviewsData)}
        focusedInterviewId={focusedInterviewId}
        focusedInterviewLoading={focusedInterview.isLoading}
        focusedInterviewIsError={focusedInterview.isError}
        focusedInterviewError={focusedInterview.error}
        paginatedList={filteredAndSortedList}
        visibleColumns={visibleColumns}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        canCreateInterview={canCreateInterview}
        canDeleteInterview={canDeleteInterview}
        onCalendarStateChange={(next) =>
          setParams(
            {
              calendarMode: next.calendarMode,
              month: next.month,
              date: next.date,
            },
            false,
          )
        }
        onVisibleRangeChange={setCalendarRange}
        onOpenScheduleModal={handleOpenScheduleModal}
        onOpenScorecard={handleOpenScorecard}
        onRequestCancel={(app, interview) => {
          setCancelInterviewState({ app, interview });
          setIsCancelModalOpen(true);
        }}
        onNavigateToPipeline={(jobId, applicationId, stage) => {
          const query = new URLSearchParams();
          query.set("stage", stage || "INTERVIEW");
          if (applicationId) {
            query.set("applicationId", applicationId);
          }
          router.push(`/jobs/${jobId}/pipeline?${query.toString()}`);
        }}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        onResetFocused={() => router.push("/interviews")}
      />

      <InterviewsModalsBundle
        jobs={jobs}
        modalApplications={modalApplications}
        scheduleModalOpen={scheduleModalOpen}
        onCloseScheduleModal={() => {
          setScheduleModalOpen(false);
          setScheduleModalJobId("");
          setSelectedAppForSchedule(undefined);
          setScheduleDate(undefined);
          setSelectedInterviewForEdit(undefined);
        }}
        selectedAppForSchedule={selectedAppForSchedule}
        scheduleDate={scheduleDate}
        selectedInterviewForEdit={selectedInterviewForEdit}
        onScheduleJobChange={setScheduleModalJobId}
        scorecardModalOpen={scorecardModalOpen}
        onCloseScorecardModal={() => {
          setScorecardModalOpen(false);
          setSelectedAppForScorecard(undefined);
          setSelectedInterviewForScorecard(undefined);
        }}
        selectedAppForScorecard={selectedAppForScorecard}
        selectedInterviewForScorecard={selectedInterviewForScorecard}
        isCancelModalOpen={isCancelModalOpen}
        onCloseCancelModal={() => setIsCancelModalOpen(false)}
        cancelInterviewState={cancelInterviewState}
        onDeleteInterview={(id) => deleteInterviewMutation.mutateAsync(id)}
        isCancellingInterview={deleteInterviewMutation.isPending}
        isFilterOpen={isFilterOpen}
        onCloseFilter={() => setIsFilterOpen(false)}
        selectedJobFilter={selectedJobFilter}
        onJobFilterChange={(val) => setParam("jobId", val)}
        activeTab={activeTab}
        onTabChange={(tabId) => setParam("tab", tabId)}
        totalCandidateCount={totalCandidateCount}
        scheduledCount={scheduledCount}
        awaitingCount={awaitingCount}
        sortBy={sortBy}
        onSortByChange={(val) => setParam("sortBy", val)}
        onResetFilters={handleResetFilters}
        viewMode={viewMode}
      />
    </div>
  );
}

export default function InterviewsPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <InterviewsPageContent />
    </Suspense>
  );
}
