"use client";

import { useState, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Navbar } from "@/components/layout";
import { ApplyModal } from "@/components/applications/apply-modal";
import { ScheduleInterviewModal } from "@/components/interviews/schedule-interview-modal";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/shared/custom-select";
import {
  useJobs,
  useAllApplications,
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import {
  Calendar,
  CalendarDays,
  Star,
  Clock,
  Video,
  MapPin,
  Search,
  Plus,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Users,
  Briefcase,
  User,
  LayoutGrid,
  List,
  History,
  ArrowUpDown,
  X,
} from "lucide-react";
import { getInitials, getCandidateDisplayName } from "@/lib/utils";
import {
  parseInterviewFromNotes,
  parseAllInterviewsFromNotes,
  type ScheduledInterviewInfo,
} from "@/lib/interviews";
import { InterviewsCalendarView } from "@/components/interviews/interviews-calendar-view";
import { InterviewScorecardModal } from "@/components/interviews/interview-scorecard-modal";
import { useI18n } from "@/i18n";
import type { Application } from "@/types";

type ViewMode = "grid" | "table" | "calendar";
type SortOption = "upcoming" | "newest" | "name";

function InterviewsPageContent() {
  const router = useRouter();
  const { user, canEdit } = useAuth();
  const { t } = useI18n();

  const { data: jobs = [], isLoading: jobsLoading } = useJobs(user?.organizationId);
  const { data: applications = [], isLoading: appsLoading } = useAllApplications(user?.organizationId);

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedAppForSchedule, setSelectedAppForSchedule] = useState<Application | undefined>(undefined);
  const [scheduleDate, setScheduleDate] = useState<string | undefined>(undefined);

  // Scorecard modal state
  const [scorecardModalOpen, setScorecardModalOpen] = useState(false);
  const [selectedAppForScorecard, setSelectedAppForScorecard] = useState<Application | undefined>(undefined);
  const [selectedInterviewForScorecard, setSelectedInterviewForScorecard] = useState<ScheduledInterviewInfo | undefined>(undefined);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"ALL" | "UPCOMING" | "AWAITING">("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortOption>("upcoming");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const pageSize = viewMode === "grid" ? 12 : 15;

  // Candidates currently in INTERVIEW stage or having a scheduled interview
  const interviewApplications = useMemo(() => {
    return applications.filter((app) => {
      const hasScheduled = parseInterviewFromNotes(app.notes) !== null;
      return app.stage === "INTERVIEW" || hasScheduled;
    });
  }, [applications]);

  // Open Schedule Modal prefilled
  const handleOpenScheduleModal = (prefilledApp?: Application, dateStr?: string) => {
    setSelectedAppForSchedule(prefilledApp);
    setScheduleDate(dateStr);
    setScheduleModalOpen(true);
  };

  // Open Scorecard Modal
  const handleOpenScorecard = (app: Application, intv: ScheduledInterviewInfo) => {
    setSelectedAppForScorecard(app);
    setSelectedInterviewForScorecard(intv);
    setScorecardModalOpen(true);
  };

  // Toggle card history expansion
  const toggleCardHistory = (appId: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [appId]: !prev[appId],
    }));
  };

  // Filtered & Sorted list
  const filteredAndSortedList = useMemo(() => {
    const list = interviewApplications.filter((app) => {
      // Job filter
      if (selectedJobFilter !== "ALL" && String(app.jobId) !== String(selectedJobFilter)) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = app.candidateName.toLowerCase().includes(q);
        const emailMatch = app.candidateEmail.toLowerCase().includes(q);
        if (!nameMatch && !emailMatch) return false;
      }

      // Tab filter
      const scheduled = parseInterviewFromNotes(app.notes);
      if (activeTab === "UPCOMING") {
        return scheduled !== null;
      }
      if (activeTab === "AWAITING") {
        return scheduled === null && app.stage === "INTERVIEW";
      }

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "name") {
        return a.candidateName.localeCompare(b.candidateName);
      }
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      // Default: "upcoming"
      const scheduledA = parseInterviewFromNotes(a.notes);
      const scheduledB = parseInterviewFromNotes(b.notes);

      if (scheduledA && !scheduledB) return -1;
      if (!scheduledA && scheduledB) return 1;
      if (scheduledA && scheduledB) {
        const dtA = `${scheduledA.date} ${scheduledA.time}`;
        const dtB = `${scheduledB.date} ${scheduledB.time}`;
        return dtA.localeCompare(dtB);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return list;
  }, [interviewApplications, selectedJobFilter, searchQuery, activeTab, sortBy]);

  // Pagination calculation
  const totalItems = filteredAndSortedList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPageClamped = Math.min(currentPage, totalPages);
  const paginatedList = useMemo(() => {
    const start = (currentPageClamped - 1) * pageSize;
    return filteredAndSortedList.slice(start, start + pageSize);
  }, [filteredAndSortedList, currentPageClamped, pageSize]);

  // KPIs
  const scheduledCount = interviewApplications.filter((a) => parseInterviewFromNotes(a.notes) !== null).length;
  const awaitingCount = interviewApplications.filter((a) => a.stage === "INTERVIEW" && parseInterviewFromNotes(a.notes) === null).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Navbar */}
      <Navbar
        activeTab="interviews"
        onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
        onOpenApplyModal={() => setApplyModalOpen(true)}
        jobsCount={jobs.length}
        candidatesCount={applications.length}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {t("interviews.title")}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/60">
                {t("interviews.candidatesCount", { count: interviewApplications.length })}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t("interviews.pageSubtitle")}
            </p>
          </div>

          {canEdit && (
            <Button
              onClick={() => handleOpenScheduleModal()}
              className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
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
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{interviewApplications.length}</span>
                <span className="text-[11px] font-semibold text-slate-400">{t("interviews.candidatesCount", { count: interviewApplications.length })}</span>
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-slate-700">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Filters, Tabs & View Controls */}
        <div className="space-y-3 pt-1">
          {/* Row 1: Status Tabs & View Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 w-fit border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("ALL");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "ALL"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {t("interviews.tabAll", { count: interviewApplications.length })}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("UPCOMING");
                  setCurrentPage(1);
                }}
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
                onClick={() => {
                  setActiveTab("AWAITING");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "AWAITING"
                    ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {t("interviews.tabAwaiting", { count: awaitingCount })}
              </button>
            </div>

            {/* Right Controls: Item Count + View Mode Switcher */}
            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">
                {t("interviews.candidatesCount", { count: filteredAndSortedList.length })}
              </span>
              <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  title={t("interviews.gridTitle")}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{t("interviews.grid")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
                    viewMode === "table"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  title={t("interviews.tableTitle")}
                >
                  <List className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{t("interviews.table")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("calendar")}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
                    viewMode === "calendar"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  title={t("interviews.calendarTitle")}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{t("interviews.calendar")}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Search, Filter & Sort Strip */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder={t("interviews.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-8 h-9.5 rounded-xl text-xs bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Job Filter Dropdown */}
            <div className="sm:w-64">
              <CustomSelect
                value={selectedJobFilter}
                onChange={(val) => {
                  setSelectedJobFilter(val);
                  setCurrentPage(1);
                }}
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
                onChange={(val) => setSortBy(val as SortOption)}
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
        {jobsLoading || appsLoading ? (
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
        ) : viewMode === "calendar" ? (
          <InterviewsCalendarView
            applications={filteredAndSortedList}
            jobs={jobs}
            onScheduleDate={(dateStr) => handleOpenScheduleModal(undefined, dateStr)}
            onEditSchedule={(app, intv) => handleOpenScheduleModal(app, intv.date)}
            onOpenScorecard={(app, intv) => handleOpenScorecard(app, intv)}
            canEdit={canEdit}
          />
        ) : viewMode === "grid" ? (
          /* ========================================================= */
          /*                       GRID VIEW                           */
          /* ========================================================= */
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
              {paginatedList.map((app) => {
                const job = jobs.find((j) => String(j.id) === String(app.jobId));
                const allInterviews = parseAllInterviewsFromNotes(app.notes);
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
                            <span>{allInterviews.length > 1 ? t("interviews.roundsBadge", { count: allInterviews.length }) : t("interviews.hasScheduleBadge")}</span>
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
                              <span className="text-blue-600 dark:text-blue-400 whitespace-nowrap">{currentInterview.time}</span>
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

                          {/* Interview Type Badge: Own row so it never squishes date/time */}
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-slate-200/80 dark:border-slate-700 shadow-2xs max-w-full truncate">
                              {currentInterview.type}
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
                              onClick={() => handleOpenScorecard(app, currentInterview)}
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
                                onClick={() => handleOpenScorecard(app, currentInterview)}
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
                            onClick={() => toggleCardHistory(app.id)}
                            className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-800"
                          >
                            <div className="flex items-center gap-1.5">
                              <History className="h-3.5 w-3.5 text-slate-400" />
                              <span>{t("interviews.previousRoundsCount", { count: previousInterviews.length })}</span>
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
                                    <span className="whitespace-nowrap">{prev.date} ({prev.time})</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 font-bold shrink-0 truncate max-w-[140px]">
                                      {prev.round ? t("interviews.roundInterview", { round: prev.round }) : prev.type}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                                    <span>{t("interviews.pvPrefix", { interviewer: prev.interviewer })}</span>
                                    <span>{prev.format === "OFFICE" ? t("interviews.atOffice") : t("interviews.onlineMeeting")}</span>
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
                            router.push(`/dashboard/jobs/${job.id}/pipeline?stage=INTERVIEW`);
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
                          onClick={() => handleOpenScheduleModal(app)}
                          variant="outline"
                          className="h-7.5 px-3 rounded-xl text-xs font-semibold cursor-pointer hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-800 transition-colors"
                        >
                          {allInterviews.length > 0 ? t("interviews.updateSchedule") : t("interviews.scheduleNow")}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /*                       TABLE VIEW                          */
          /* ========================================================= */
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
                  {paginatedList.map((app) => {
                    const job = jobs.find((j) => String(j.id) === String(app.jobId));
                    const allInterviews = parseAllInterviewsFromNotes(app.notes);
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
                              {/* Dòng 1: Ngày giờ */}
                              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-xs">
                                <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
                                <span>{t("interviews.atTime", { date: currentInterview.date, time: currentInterview.time })}</span>
                              </div>
                              {/* Dòng 2: Loại vòng phỏng vấn */}
                              <div>
                                <span className="inline-block px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200/80 dark:border-blue-900/60">
                                  {currentInterview.type}
                                </span>
                              </div>
                              {/* Dòng 3: Cắt trực tuyến / văn phòng xuống dòng */}
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
                            <span className="text-slate-400 italic text-[11px] whitespace-nowrap">{t("interviews.notScheduledYet")}</span>
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
                              onClick={() => handleOpenScorecard(app, currentInterview)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200/80 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer transition-colors shadow-2xs"
                              title={t("interviews.scorecardTooltip")}
                            >
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              <span>{currentInterview.scorecard.overallRating} ⭐</span>
                            </button>
                          ) : currentInterview ? (
                            <button
                              type="button"
                              onClick={() => handleOpenScorecard(app, currentInterview)}
                              className="text-[10px] text-amber-700 dark:text-amber-400 font-bold hover:underline cursor-pointer"
                            >
                              {t("interviews.rateNow")}
                            </button>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Actions: Họp & Sửa lịch xếp 2 dòng, Chevron bên cạnh */}
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
                                  onClick={() => handleOpenScheduleModal(app)}
                                  className="h-6 px-2 rounded-md text-[10px] font-semibold cursor-pointer hover:border-blue-400 hover:text-blue-600 transition-colors"
                                >
                                  {allInterviews.length > 0 ? t("interviews.editSchedule") : t("interviews.scheduleNow")}
                                </Button>
                              )}
                            </div>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (job) {
                                  router.push(`/dashboard/jobs/${job.id}/pipeline?stage=INTERVIEW`);
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
        )}

        {/* Pagination Bar (Only for Grid and Table modes) */}
        {filteredAndSortedList.length > 0 && viewMode !== "calendar" && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400">
            <div>
              {t("interviews.showingPagination", {
                start: (currentPageClamped - 1) * pageSize + 1,
                end: Math.min(currentPageClamped * pageSize, totalItems),
                total: totalItems,
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPageClamped <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2.5 text-xs rounded-xl cursor-pointer disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  <span>{t("interviews.previous")}</span>
                </Button>

                {/* Page Number Pills (Show window around current page) */}
                <div className="flex items-center gap-1 mx-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        (p >= currentPageClamped - 1 && p <= currentPageClamped + 1),
                    )
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      return (
                        <Fragment key={p}>
                          {prev && p - prev > 1 && (
                            <span className="px-1 text-slate-400">...</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(p)}
                            className={`h-8 min-w-[32px] px-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                              currentPageClamped === p
                                ? "bg-blue-600 text-white shadow-xs"
                                : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            {p}
                          </button>
                        </Fragment>
                      );
                    })}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPageClamped >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-2.5 text-xs rounded-xl cursor-pointer disabled:opacity-40"
                >
                  <span>{t("interviews.next")}</span>
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            )}
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
        }}
        jobs={jobs}
        applications={applications}
        selectedJobId={selectedAppForSchedule?.jobId || undefined}
        selectedApplicationId={selectedAppForSchedule?.id || undefined}
        initialDate={scheduleDate}
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

      {/* Global Apply Modal */}
      <ApplyModal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        jobs={jobs}
      />
    </div>
  );
}

export default function InterviewsPage() {
  return (
    <AuthGuard>
      <InterviewsPageContent />
    </AuthGuard>
  );
}
