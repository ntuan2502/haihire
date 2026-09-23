"use client";

import { useState, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Navbar } from "@/components/layout";
import { ScheduleInterviewModal } from "@/components/interviews/schedule-interview-modal";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/shared/custom-select";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { useTableParams } from "@/hooks/use-table-params";
import {
  useAllJobs,
  useAllApplications,
  useInterviews,
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import {
  Calendar,
  CalendarDays,
  Clock,
  Plus,
  List,
  ArrowUpDown,
  Users,
} from "lucide-react";
import {
  type ScheduledInterviewInfo,
} from "@/lib/interviews";
import { InterviewsCalendarView } from "@/components/interviews/interviews-calendar-view";
import { InterviewsTableView } from "@/components/interviews/interviews-table-view";
import { InterviewScorecardModal } from "@/components/interviews/interview-scorecard-modal";
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

  // KPIs
  const scheduledCount = upcomingData?.total ?? 0;
  const awaitingCount = awaitingData?.total ?? 0;
  const totalCandidateCount = allData?.total ?? 0;

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
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 space-y-6">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {t("interviews.title")}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/60">
                {t("interviews.candidatesCount", { count: totalCandidateCount })}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t("interviews.pageSubtitle")}
            </p>
          </div>

          {canEdit && (
            <Button
              onClick={() => handleOpenScheduleModal()}
              className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t("interviews.scheduleNew")}</span>
            </Button>
          )}
        </div>

        {/* 3 KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between transition-all hover:shadow-xs">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t("interviews.kpiScheduled")}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{scheduledCount}</span>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{t("interviews.kpiReady")}</span>
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/50">
              <Calendar className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between transition-all hover:shadow-xs">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t("interviews.kpiAwaiting")}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">{awaitingCount}</span>
                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">{t("interviews.kpiActionRequired")}</span>
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900/50">
              <Clock className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between transition-all hover:shadow-xs">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t("interviews.kpiTotalCandidates")}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{totalCandidateCount}</span>
                <span className="text-[11px] font-semibold text-slate-400">{t("interviews.candidatesUnit")}</span>
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-slate-700">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Filters, Tabs & View Controls */}
        <div className="space-y-3 pt-1">
          {/* Row 1: Status Tabs & 2-Mode View Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 w-fit border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setParam("tab", "ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "ALL"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {t("interviews.tabAll", { count: totalCandidateCount })}
              </button>
              <button
                type="button"
                onClick={() => setParam("tab", "UPCOMING")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "UPCOMING"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {t("interviews.tabScheduled", { count: scheduledCount })}
              </button>
              <button
                type="button"
                onClick={() => setParam("tab", "AWAITING")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "AWAITING"
                    ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {t("interviews.tabAwaiting", { count: awaitingCount })}
              </button>
            </div>

            {/* Right Controls: Item Count + 2 View Modes (Danh sách / Lịch biểu) */}
            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">
                {t("interviews.candidatesCount", { count: totalItems })}
              </span>
              <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setParam("viewMode", "table", false)}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
                    viewMode === "table"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  title={t("interviews.tableTitle")}
                >
                  <List className="h-3.5 w-3.5" />
                  <span>{t("interviews.table")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setParam("viewMode", "calendar", false)}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
                    viewMode === "calendar"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  title={t("interviews.calendarTitle")}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>{t("interviews.calendar")}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Search, Filter & Sort Strip */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <SearchInput
              placeholder={t("interviews.searchPlaceholder")}
              value={searchQuery}
              onChange={setSearch}
              inputClassName="h-9.5"
            />

            {/* Job Filter Dropdown */}
            <div className="sm:w-64">
              <CustomSelect
                value={selectedJobFilter}
                onChange={(val) => setParam("jobId", val)}
                options={[
                  { value: "ALL", label: t("interviews.allJobsOption") },
                  ...jobs.map((job) => ({
                    value: job.id,
                    label: `${job.title} (${job.department})`,
                  })),
                ]}
                className="w-full"
                triggerClassName="h-9.5 text-xs font-medium"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="sm:w-56">
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
                triggerClassName="h-9.5 text-xs font-medium"
              />
            </div>
          </div>
        </div>

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
            onOpenScheduleModal={handleOpenScheduleModal}
            onOpenScorecard={handleOpenScorecard}
            onNavigateToPipeline={(jobId) =>
              router.push(`/dashboard/jobs/${jobId}/pipeline?stage=INTERVIEW`)
            }
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
