"use client";

import { useState, useMemo, Suspense, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Navbar } from "@/components/layout";
import { ScheduleInterviewModal } from "@/components/interviews/schedule-interview-modal";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/shared/custom-select";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { SegmentedTabs } from "@/components/shared/segmented-tabs";
import { SlideOver } from "@/components/shared/slide-over";
import { usePersistedColumns } from "@/hooks/use-persisted-columns";
import { useTableParams } from "@/hooks/use-table-params";
import {
  useAllJobs,
  useAllApplications,
  useInterviews,
  useDeleteInterviewMutation,
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import {
  Calendar,
  CalendarDays,
  Plus,
  List,
  ArrowUpDown,
  Columns3,
  SlidersHorizontal,
  RotateCcw,
  X,
} from "lucide-react";
import {
  type ScheduledInterviewInfo,
} from "@/lib/interviews";
import { getCandidateDisplayName } from "@/lib/utils";
import { InterviewsCalendarView } from "@/components/interviews/interviews-calendar-view";
import { InterviewsTableView } from "@/components/interviews/interviews-table-view";
import { InterviewScorecardModal } from "@/components/interviews/interview-scorecard-modal";
import { CancelInterviewModal } from "@/components/interviews/cancel-interview-modal";
import { useI18n } from "@/i18n";
import type { Application } from "@/types";

type ViewMode = "table" | "calendar";
type SortOption = "upcoming" | "newest" | "name";

function InterviewsPageContent() {
  const router = useRouter();
  const { user, canEdit } = useAuth();
  const { t } = useI18n();

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedAppForSchedule, setSelectedAppForSchedule] = useState<Application | undefined>(undefined);
  const [scheduleDate, setScheduleDate] = useState<string | undefined>(undefined);
  const [selectedInterviewForEdit, setSelectedInterviewForEdit] = useState<ScheduledInterviewInfo | undefined>(undefined);

  // Scorecard modal state
  const [scorecardModalOpen, setScorecardModalOpen] = useState(false);
  const [selectedAppForScorecard, setSelectedAppForScorecard] = useState<Application | undefined>(undefined);
  const [selectedInterviewForScorecard, setSelectedInterviewForScorecard] = useState<ScheduledInterviewInfo | undefined>(undefined);

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
  const viewMode: ViewMode =
    rawViewMode === "calendar" ? "calendar" : "table";

  const rawSortBy = getParam("sortBy", "upcoming");
  const sortBy: SortOption =
    rawSortBy === "newest" || rawSortBy === "name" ? rawSortBy : "upcoming";

  // Filter Drawer State & Columns Dropdown State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const columnsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        columnsRef.current &&
        !columnsRef.current.contains(event.target as Node)
      ) {
        setIsColumnsOpen(false);
      }
    }
    if (isColumnsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isColumnsOpen]);

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

  const secondaryFiltersCount =
    (selectedJobFilter !== "ALL" ? 1 : 0) +
    (sortBy !== "upcoming" ? 1 : 0);
  const hasSecondaryFilters = secondaryFiltersCount > 0;

  const handleResetFilters = () => {
    setParam("jobId", "ALL");
    setParam("sortBy", "upcoming");
  };

  const { data: jobs = [], isLoading: jobsLoading } = useAllJobs(user?.organizationId);
  const { data: allApplications = [] } = useAllApplications(user?.organizationId);

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

  // Full interviews query for Calendar view (all scheduled events, up to 1000 items)
  const { data: calendarInterviewsData, isLoading: calendarLoading } = useInterviews({
    organizationId: user?.organizationId,
    limit: 1000,
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
      { id: "UPCOMING", label: t("interviews.kpiScheduled"), count: scheduledCount },
      { id: "AWAITING", label: t("interviews.kpiAwaiting"), count: awaitingCount },
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
  const handleOpenScorecard = (app: Application, intv: ScheduledInterviewInfo) => {
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
        candidatesCount={allApplications.length}
      />

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10 w-full space-y-4">
        {/* Standard Header Row matching Jobs, Candidates & Applications */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {t("interviews.title")}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80">
              {totalCandidateCount}
            </span>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {canEdit && (
              <Button
                size="sm"
                onClick={() => handleOpenScheduleModal()}
                className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>{t("interviews.scheduleNew")}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Modern Unified Responsive Toolbar matching Jobs, Candidates & Applications */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Quick Status Tabs using SegmentedTabs */}
          <SegmentedTabs
            tabs={interviewTabs}
            activeTab={activeTab}
            onChange={(tabId) => setParam("tab", tabId)}
          />

          {/* Right: View Mode Switcher + Search Box + Columns Dropdown + Filters Button */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            {/* View Mode Switcher (Table / Calendar) */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-100/90 dark:bg-slate-850 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setParam("viewMode", "table", false)}
                className={`h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
                title={t("interviews.tableTitle")}
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("interviews.table")}</span>
              </button>
              <button
                type="button"
                onClick={() => setParam("viewMode", "calendar", false)}
                className={`h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "calendar"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
                title={t("interviews.calendarTitle")}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("interviews.calendar")}</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="flex-1 sm:w-64 md:w-72 sm:flex-initial">
              <SearchInput
                placeholder={t("interviews.searchPlaceholder")}
                value={searchQuery}
                onChange={setSearch}
              />
            </div>

            {/* Columns Dropdown (Table View Only) */}
            {viewMode === "table" && (
              <div className="relative shrink-0" ref={columnsRef}>
                <button
                  type="button"
                  onClick={() => setIsColumnsOpen((prev) => !prev)}
                  className={`h-9 px-3 rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors ${
                    isColumnsOpen ? "ring-2 ring-blue-500/20 border-blue-500" : ""
                  }`}
                >
                  <Columns3 className="h-3.5 w-3.5 text-slate-500" />
                  <span>{t("common.columns")}</span>
                </button>

                {isColumnsOpen && (
                  <div className="absolute right-0 mt-1.5 w-44 rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xl p-2 z-50">
                    <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase select-none">
                      {t("interviews.toggleColumns")}
                    </div>
                    <div className="space-y-0.5 mt-1">
                      {[
                        { id: "candidate", label: t("interviews.columns.candidate"), locked: true },
                        { id: "job", label: t("interviews.columns.job") },
                        { id: "schedule", label: t("interviews.columns.schedule") },
                        { id: "interviewer", label: t("interviews.columns.interviewer") },
                        { id: "status", label: t("interviews.columns.status") },
                        { id: "rating", label: t("interviews.columns.rating") },
                      ].map((col) => {
                        const isChecked =
                          visibleColumns[col.id as keyof typeof visibleColumns];
                        const isLocked = col.locked;
                        return (
                          <label
                            key={col.id}
                            className={`flex items-center gap-2.5 px-2 py-1.5 rounded-xl text-xs font-semibold select-none transition-colors ${
                              isLocked
                                ? "opacity-60 cursor-not-allowed text-slate-500 dark:text-slate-400"
                                : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isLocked}
                              onChange={() =>
                                toggleColumn(
                                  col.id as keyof typeof visibleColumns,
                                )
                              }
                              className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <span>{col.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Filters Button */}
            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className="h-9 px-3.5 rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs shrink-0"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
              <span>{t("common.filter")}</span>
              {secondaryFiltersCount > 0 && (
                <span className="h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {secondaryFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        {hasSecondaryFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
            <span className="text-slate-400 font-medium text-[11px]">{t("common.filter")}:</span>
            {selectedJobFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60 text-xs font-medium">
                <span>{jobs.find((j) => j.id === selectedJobFilter)?.title || selectedJobFilter}</span>
                <button
                  type="button"
                  onClick={() => setParam("jobId", "ALL")}
                  className="hover:text-blue-900 dark:hover:text-blue-100 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {sortBy !== "upcoming" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60 text-xs font-medium">
                <span>
                  {sortBy === "newest"
                    ? t("interviews.sortNewest")
                    : t("interviews.sortName")}
                </span>
                <button
                  type="button"
                  onClick={() => setParam("sortBy", "upcoming")}
                  className="hover:text-blue-900 dark:hover:text-blue-100 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-medium cursor-pointer transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>{t("jobs.resetAll")}</span>
            </button>
          </div>
        )}

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
              onScheduleDate={(dateStr) => handleOpenScheduleModal(undefined, dateStr)}
              onEditSchedule={(app, intv) => handleOpenScheduleModal(app, intv.date, intv)}
              onOpenScorecard={(app, intv) => handleOpenScorecard(app, intv)}
              canEdit={canEdit}
            />
          )
        ) : (jobsLoading || appsLoading) && !interviewsData ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : filteredAndSortedList.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-8 shadow-2xs">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t("interviews.noInterviewsFound")}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {t("interviews.noInterviewsFoundDesc")}
            </p>
            {canEdit && (
              <Button
                onClick={() => handleOpenScheduleModal()}
                className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t("interviews.scheduleNew")}</span>
              </Button>
            )}
          </div>
        ) : (
          <InterviewsTableView
            applications={paginatedList}
            jobs={jobs}
            visibleColumns={visibleColumns}
            onOpenScheduleModal={handleOpenScheduleModal}
            onOpenScorecard={handleOpenScorecard}
            onCancelInterview={(app, interview) => setCancelInterviewState({ app, interview })}
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
              router.push(`/dashboard/jobs/${jobId}/pipeline?${query.toString()}`);
            }}
            canEdit={canEdit}
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
        applications={allApplications}
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
        job={jobs.find((j) => String(j.id) === String(selectedAppForScorecard?.jobId))}
      />

      {/* Cancel Interview Confirmation Modal */}
      {cancelInterviewState && (
        <CancelInterviewModal
          isOpen={!!cancelInterviewState}
          onClose={() => setCancelInterviewState(null)}
          onConfirm={async () => {
            if (cancelInterviewState.interview?.id) {
              await deleteInterviewMutation.mutateAsync(cancelInterviewState.interview.id);
              setCancelInterviewState(null);
            }
          }}
          candidateName={getCandidateDisplayName(cancelInterviewState.app)}
          isCanceling={deleteInterviewMutation.isPending}
        />
      )}

      {/* Interviews Filter Drawer (SlideOver) matching Jobs / Applications / Candidates UX */}
      <SlideOver
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title={t("applications.filters")}
        description={t("jobs.filterJobsDesc")}
        width="max-w-md"
      >
        <div className="flex flex-col h-full">
          <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
            {/* 1. FILTER BY JOB */}
            <div className="space-y-2.5">
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block">
                {t("applications.filterByJob")}
              </span>
              <CustomSelect
                value={selectedJobFilter}
                onChange={(val) => setParam("jobId", val)}
                options={[
                  { value: "ALL", label: t("interviews.allJobsOption") },
                  ...jobs.map((j) => ({
                    value: j.id,
                    label: `${j.title} (${j.department})`,
                  })),
                ]}
                className="w-full"
                triggerClassName="h-9 text-xs font-normal bg-white dark:bg-slate-950 rounded-xl"
              />
            </div>

            {/* 2. STATUS TAB PILLS */}
            <div className="space-y-2.5">
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block">
                {t("interviews.tableHeaders.status")}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: "ALL", label: t("interviews.tabAll", { count: totalCandidateCount }) },
                  { id: "UPCOMING", label: t("interviews.tabScheduled", { count: scheduledCount }) },
                  { id: "AWAITING", label: t("interviews.tabAwaiting", { count: awaitingCount }) },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setParam("tab", item.id)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      activeTab === item.id
                        ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. SORT BY */}
            <div className="space-y-2.5">
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block">
                {t("jobs.sortByUpper")}
              </span>
              <CustomSelect
                value={sortBy}
                onChange={(val) => setParam("sortBy", val)}
                icon={ArrowUpDown}
                options={[
                  { value: "upcoming", label: t("interviews.sortUpcoming") },
                  { value: "newest", label: t("interviews.sortNewest") },
                  { value: "name", label: t("interviews.sortName") },
                ]}
                className="w-full"
                triggerClassName="h-9 text-xs font-normal bg-white dark:bg-slate-950 rounded-xl"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t("jobs.resetAll")}</span>
            </button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFilterOpen(false)}
                className="h-8 px-4 text-xs font-semibold rounded-xl cursor-pointer"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setIsFilterOpen(false)}
                className="h-8 px-4 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                {t("jobs.done")}
              </Button>
            </div>
          </div>
        </div>
      </SlideOver>
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
