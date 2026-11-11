"use client";

import { useState, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Navbar } from "@/components/layout";
import { ScheduleInterviewModal } from "@/components/interviews/schedule-interview-modal";
import { useAuth } from "@/context/auth-context";
import { Pagination } from "@/components/shared/pagination";
import { usePersistedColumns } from "@/hooks/use-persisted-columns";
import { useTableParams } from "@/hooks/use-table-params";
import {
  useAllJobs,
  useApplications,
  useInterviews,
  useDeleteInterviewMutation,
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { extractDateTimeInTimezone } from "@haihire/shared";
import { type ScheduledInterviewInfo } from "@/lib/interviews";
import { getCandidateDisplayName, resolveEffectiveTimezone } from "@/lib/utils";
import { InterviewsCalendarView } from "@/components/interviews/interviews-calendar-view";
import { InterviewsTableView } from "@/components/interviews/interviews-table-view";
import { InterviewScorecardModal } from "@/components/interviews/interview-scorecard-modal";
import { CancelInterviewModal } from "@/components/interviews/cancel-interview-modal";
import {
  InterviewsHeader,
  InterviewsFilterBar,
  InterviewsFilterDrawer,
  InterviewsEmptyState,
  type ViewMode,
  type SortOption,
} from "@/components/interviews/dashboard";
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

  // Synchronized URL Query State for Pagination, Search & Filters
  const {
    page: currentPage,
    limit: pageSize,
    search: searchQuery,
    setSearch,
    setPage: setCurrentPage,
    setLimit: setPageSize,
    setParam,
    getParam,
  } = useTableParams();

  const selectedJobFilter = getParam("jobId", "ALL");
  const rawTab = getParam("tab", "ALL");
  const activeTab: "ALL" | "UPCOMING" | "AWAITING" =
    rawTab === "UPCOMING" || rawTab === "AWAITING" ? rawTab : "ALL";

  const rawViewMode = getParam("viewMode", "table");
  const viewMode: ViewMode = rawViewMode === "calendar" ? "calendar" : "table";

  const rawSortBy = getParam("sortBy", "upcoming");
  const sortBy: SortOption =
    rawSortBy === "newest" || rawSortBy === "name" ? rawSortBy : "upcoming";

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
    setParam("jobId", "ALL");
    setParam("sortBy", "upcoming");
  };

  const { data: jobs = [], isLoading: jobsLoading } = useAllJobs(
    user?.organizationId,
  );

  // Lazy-load applications only when the schedule modal is open (preventing full tenant scan)
  const { data: modalApplicationsData } = useApplications({
    organizationId: user?.organizationId,
    limit: 100,
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
  });

  // Range-scoped interviews query for Calendar view (only visible month/week window)
  const { data: calendarInterviewsData, isLoading: calendarLoading } =
    useInterviews({
      organizationId: user?.organizationId,
      startDate: calendarRange.startDate,
      endDate: calendarRange.endDate,
      search: searchQuery.trim() || undefined,
      jobId: selectedJobFilter !== "ALL" ? selectedJobFilter : undefined,
      tab: activeTab,
      enabled: viewMode === "calendar",
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
    return (interviewsData?.data || [])
      .map((intv) => intv.application as Application)
      .filter(Boolean);
  }, [interviewsData]);

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
      { id: "ALL", label: t("common.all"), count: totalCandidateCount },
      {
        id: "UPCOMING",
        label: t("interviews.kpiScheduled"),
        count: scheduledCount,
      },
      {
        id: "AWAITING",
        label: t("interviews.kpiAwaiting"),
        count: awaitingCount,
      },
    ],
    [t, totalCandidateCount, scheduledCount, awaitingCount],
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
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Navbar */}
      <Navbar
        activeTab="interviews"
        onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
        jobsCount={jobs.length}
        candidatesCount={totalCandidateCount}
      />

      {/* Main Content */}
      <main
        id="main-content"
        className="flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10 w-full space-y-4"
      >
        {/* Standard Header Row */}
        <InterviewsHeader
          totalCount={totalCandidateCount}
          canEdit={canCreateInterview}
          onOpenScheduleModal={() => handleOpenScheduleModal()}
        />

        {/* Modern Unified Responsive Toolbar */}
        <InterviewsFilterBar
          tabs={interviewTabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setParam("tab", tabId)}
          viewMode={viewMode}
          onViewModeChange={(mode) => setParam("viewMode", mode, false)}
          searchQuery={searchQuery}
          onSearchChange={setSearch}
          visibleColumns={visibleColumns}
          onToggleColumn={toggleColumn}
          onOpenFilterDrawer={() => setIsFilterOpen(true)}
          selectedJobFilter={selectedJobFilter}
          sortBy={sortBy}
          jobs={jobs}
          onResetFilters={handleResetFilters}
          onClearJobFilter={() => setParam("jobId", "ALL")}
          onClearSortFilter={() => setParam("sortBy", "upcoming")}
        />

        {/* Content Section */}
        {viewMode === "calendar" ? (
          calendarLoading && !calendarInterviewsData ? (
            <div className="py-20 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <InterviewsCalendarView
              applications={calendarApplications}
              jobs={jobs}
              onScheduleDate={(dateStr) =>
                handleOpenScheduleModal(undefined, dateStr)
              }
              onEditSchedule={(app, intv) =>
                handleOpenScheduleModal(
                  app,
                  extractDateTimeInTimezone(intv.scheduledAt, effectiveTimezone)
                    .date,
                  intv,
                )
              }
              onOpenScorecard={(app, intv) => handleOpenScorecard(app, intv)}
              onVisibleRangeChange={setCalendarRange}
              canEdit={canCreateInterview}
            />
          )
        ) : (jobsLoading || appsLoading) && !interviewsData ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : filteredAndSortedList.length === 0 ? (
          <InterviewsEmptyState
            canEdit={canCreateInterview}
            onOpenScheduleModal={() => handleOpenScheduleModal()}
          />
        ) : (
          <InterviewsTableView
            applications={paginatedList}
            jobs={jobs}
            visibleColumns={visibleColumns}
            onOpenScheduleModal={handleOpenScheduleModal}
            onOpenScorecard={handleOpenScorecard}
            onCancelInterview={
              canDeleteInterview
                ? (app, interview) =>
                    setCancelInterviewState({ app, interview })
                : undefined
            }
            onNavigateToPipeline={(jobId, applicationId, stage) => {
              const query = new URLSearchParams();
              if (stage) {
                query.set("stage", stage);
              } else {
                query.set("stage", "INTERVIEW");
              }
              if (applicationId) {
                query.set("applicationId", applicationId);
              }
              router.push(
                `/dashboard/jobs/${jobId}/pipeline?${query.toString()}`,
              );
            }}
            canEdit={canCreateInterview}
          />
        )}

        {/* Pagination Bar (Only for Table mode) */}
        {filteredAndSortedList.length > 0 && viewMode !== "calendar" && (
          <div className="pt-2">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 50, 100]}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel={t("nav.interviews").toLowerCase()}
            />
          </div>
        )}
      </main>

      {/* Schedule Interview Reusable Modal */}
      <ScheduleInterviewModal
        isOpen={scheduleModalOpen}
        onClose={() => {
          setScheduleModalOpen(false);
          setSelectedAppForSchedule(undefined);
          setScheduleDate(undefined);
          setSelectedInterviewForEdit(undefined);
        }}
        jobs={jobs}
        applications={modalApplications}
        selectedJobId={selectedAppForSchedule?.jobId || undefined}
        selectedApplicationId={selectedAppForSchedule?.id || undefined}
        initialDate={scheduleDate}
        editingInterview={selectedInterviewForEdit}
      />

      {/* Post-Interview Scorecard Modal */}
      <InterviewScorecardModal
        isOpen={scorecardModalOpen}
        onClose={() => {
          setScorecardModalOpen(false);
          setSelectedAppForScorecard(undefined);
          setSelectedInterviewForScorecard(undefined);
        }}
        application={selectedAppForScorecard}
        interview={selectedInterviewForScorecard}
        job={jobs.find(
          (j) => String(j.id) === String(selectedAppForScorecard?.jobId),
        )}
      />

      {/* Cancel Interview Confirmation Modal */}
      {cancelInterviewState && (
        <CancelInterviewModal
          isOpen={!!cancelInterviewState}
          onClose={() => setCancelInterviewState(null)}
          onConfirm={async () => {
            if (cancelInterviewState.interview?.id) {
              await deleteInterviewMutation.mutateAsync(
                cancelInterviewState.interview.id,
              );
              setCancelInterviewState(null);
            }
          }}
          candidateName={getCandidateDisplayName(cancelInterviewState.app)}
          isCancelling={deleteInterviewMutation.isPending}
        />
      )}

      {/* Interviews Filter Drawer */}
      <InterviewsFilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        jobs={jobs}
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
      />
    </div>
  );
}

export default function InterviewsPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <InterviewsPageContent />
      </Suspense>
    </AuthGuard>
  );
}
