"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Navbar } from "@/components/layout";
import { ApplyToJobModal } from "@/components/candidates/apply-to-job-modal";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { SegmentedTabs } from "@/components/shared/segmented-tabs";
import { useTableParams } from "@/hooks/use-table-params";
import {
  useAllJobs,
  useCandidates,
  useCandidate,
  useDeleteCandidateMutation,
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { SlideOver } from "@/components/shared/slide-over";
import { CustomSelect } from "@/components/shared/custom-select";
import { usePersistedColumns } from "@/hooks/use-persisted-columns";
import {
  Users,
  Plus,
  Columns3,
  Mail,
  Phone,
  ArrowUpDown,
  ArrowDown,
  SlidersHorizontal,
  X,
  RotateCcw,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";

import {
  formatDate,
  type CandidateItem,
} from "@/lib/utils";
import { ScheduleInterviewModal } from "@/components/interviews/schedule-interview-modal";
import { CandidateDrawer } from "@/components/candidates/candidate-drawer";
import { DeleteCandidateModal } from "@/components/candidates/delete-candidate-modal";
import type { Application } from "@/types";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import { useI18n } from "@/i18n";

type SortField = "name" | "email" | "phone" | "applications" | "added";
type SortDirection = "asc" | "desc";

function CandidatesPageContent() {
  const router = useRouter();
  const { user, canEdit } = useAuth();
  const { t } = useI18n();
  const { data: jobs = [], isLoading: jobsLoading } = useAllJobs(
    user?.organizationId,
  );

  // Synchronized URL Query State for Pagination & Search
  const {
    page: currentPage,
    limit: rowsPerPage,
    search,
    setSearch,
    setPage: setCurrentPage,
    setLimit: setRowsPerPage,
  } = useTableParams();

  const { data: pagedResult, isLoading: candidatesLoading } =
    useCandidates(user?.organizationId, {
      page: currentPage,
      limit: rowsPerPage,
      search: search.trim() || undefined,
    });

  const candidates = useMemo(() => pagedResult?.data || [], [pagedResult?.data]);
  const totalCount = pagedResult?.total || 0;
  const totalPages = Math.max(1, pagedResult?.totalPages || 1);
  const loading = jobsLoading || candidatesLoading;

  // Selected Candidate for Right Slide-over Sidebar Drawer
  const [selectedCandidate, setSelectedCandidate] =
    useState<CandidateItem | null>(null);
  const { data: selectedCandidateFull } = useCandidate(selectedCandidate?.id);
  const [applyToJobModalCandidate, setApplyToJobModalCandidate] =
    useState<CandidateItem | null>(null);
  const [scheduleInterviewApp, setScheduleInterviewApp] =
    useState<Application | null>(null);
  const [editingInterview, setEditingInterview] =
    useState<ScheduledInterviewInfo | null>(null);

  const deleteCandidateMutation = useDeleteCandidateMutation();
  const [candidateToDelete, setCandidateToDelete] = useState<CandidateItem | null>(null);

  const handleConfirmDeleteCandidate = async () => {
    if (!candidateToDelete) return;
    try {
      await deleteCandidateMutation.mutateAsync(candidateToDelete.id);
      setCandidateToDelete(null);
    } catch (err) {
      console.error("Failed to delete candidate:", err);
    }
  };



  // Filter Drawer State & Secondary Filter
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>("ALL");

  // Column Visibility Toggle State & Ref (Persisted in localStorage)
  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const columnsRef = useRef<HTMLDivElement>(null);
  const { columns: visibleColumns, toggleColumn } = usePersistedColumns(
    "haihire_candidates_columns_v1",
    {
      name: true,
      email: true,
      phone: true,
      applications: true,
      added: true,
      quickNotes: true,
    },
  );

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

  // Sorting State
  const [sortField, setSortField] = useState<SortField>("added");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Real candidates from Candidate database (Server-paginated)
  const candidateRows: CandidateItem[] = useMemo(() => {
    return candidates.map((cand) => ({
      id: cand.id,
      name: cand.name,
      email: cand.email,
      phone: cand.phone || "—",
      applicationsCount: cand.applicationsCount ?? (cand.applications?.length ?? 0),
      createdAt: cand.createdAt,
      updatedAt: cand.updatedAt,
      notes: cand.notes || "",
      resumeUrl: cand.resumeUrl,
      resumeFileName: cand.resumeFileName,
      resumeFileSize: cand.resumeFileSize,
      resumeMimeType: cand.resumeMimeType,
      candidate: cand,
    }));
  }, [candidates]);

  const [candidateFilter, setCandidateFilter] = useState<string[]>([]);

  const toggleCandidateFilter = (filterId: string) => {
    setCandidateFilter((prev) =>
      prev.includes(filterId)
        ? prev.filter((x) => x !== filterId)
        : [...prev, filterId],
    );
  };

  const candidateCounts = useMemo(() => {
    let withResume = 0;
    let hasApplications = 0;
    let unassigned = 0;
    for (const c of candidateRows) {
      const hasCv = Boolean(c.resumeUrl || (c.resumeFileName && c.resumeFileName !== "—"));
      if (hasCv) withResume++;
      if (c.applicationsCount > 0) hasApplications++;
      else unassigned++;
    }
    return {
      all: totalCount,
      withResume,
      hasApplications,
      unassigned,
    };
  }, [candidateRows, totalCount]);

  const candidateTabs = useMemo(
    () => [
      { id: "ALL", label: t("common.all"), count: candidateCounts.all },
      { id: "WITH_RESUME", label: t("candidates.withCv"), count: candidateCounts.withResume },
      { id: "HAS_APPLICATIONS", label: t("candidates.hasApplications"), count: candidateCounts.hasApplications },
      { id: "UNASSIGNED", label: t("candidates.unassigned"), count: candidateCounts.unassigned },
    ],
    [t, candidateCounts],
  );

  const filteredCandidateRows = useMemo(() => {
    return candidateRows.filter((c) => {
      if (candidateFilter.length > 0) {
        const hasCv = Boolean(c.resumeUrl || (c.resumeFileName && c.resumeFileName !== "—"));
        const matchCv = candidateFilter.includes("WITH_RESUME") ? hasCv : false;
        const matchActive = candidateFilter.includes("HAS_APPLICATIONS") ? c.applicationsCount > 0 : false;
        const matchUnassigned = candidateFilter.includes("UNASSIGNED") ? c.applicationsCount === 0 : false;
        if (!matchCv && !matchActive && !matchUnassigned) return false;
      }
      if (selectedJobId !== "ALL") {
        const matched = c.candidate?.applications?.some((a) => a.jobId === selectedJobId);
        if (!matched) return false;
      }
      return true;
    });
  }, [candidateRows, candidateFilter, selectedJobId]);

  const secondaryFiltersCount = selectedJobId !== "ALL" ? 1 : 0;
  const hasSecondaryFilters = secondaryFiltersCount > 0;

  const handleResetFilters = () => {
    setSelectedJobId("ALL");
    setCandidateFilter([]);
    setSortField("added");
    setSortDirection("desc");
  };

  // Sorter for current page items
  const paginatedCandidates = useMemo(() => {
    return [...filteredCandidateRows].sort((a, b) => {
      let diff = 0;
      switch (sortField) {
        case "name":
          diff = a.name.localeCompare(b.name);
          break;
        case "email":
          diff = a.email.localeCompare(b.email);
          break;
        case "phone":
          diff = a.phone.localeCompare(b.phone);
          break;
        case "applications":
          diff = a.applicationsCount - b.applicationsCount;
          break;
        case "added":
        default:
          diff =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDirection === "asc" ? diff : -diff;
    });
  }, [filteredCandidateRows, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const selectedCandidateApps = useMemo(() => {
    if (!selectedCandidate) return [];
    return (
      (selectedCandidateFull?.applications ||
        selectedCandidate.candidate?.applications ||
        []) as Application[]
    );
  }, [selectedCandidate, selectedCandidateFull]);



  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Navbar */}
      <Navbar
        activeTab="candidates"
        onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
        jobsCount={jobs.length}
        candidatesCount={totalCount}
      />

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10 w-full space-y-4">
        {/* Standard Header Row matching Jobs & Applications */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {t("candidates.title")}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80">
              {totalCount}
            </span>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {canEdit && (
              <Button
                size="sm"
                onClick={() => router.push("/dashboard/candidates/new")}
                className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>{t("candidates.addCandidate")}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Modern Unified Responsive Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Quick Filter Tabs (Swipeable horizontally on mobile/tablet) */}
          <SegmentedTabs
            multiSelect
            tabs={candidateTabs}
            activeTabs={candidateFilter}
            onToggleTab={toggleCandidateFilter}
            onClearAll={() => setCandidateFilter([])}
          />

          {/* Right: Search Box + Columns Dropdown */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            <div className="flex-1 sm:w-64 md:w-72 sm:flex-initial">
              <SearchInput
                placeholder={t("candidates.searchCandidates")}
                value={search}
                onChange={setSearch}
              />
            </div>

            {/* Columns Dropdown (Existing Working Feature) */}
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
                    {t("candidates.toggleColumns")}
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {[
                      { id: "name", label: t("candidates.columns.name"), locked: true },
                      { id: "email", label: t("candidates.columns.email") },
                      { id: "phone", label: t("candidates.columns.phone") },
                      { id: "applications", label: t("candidates.columns.applications") },
                      { id: "added", label: t("candidates.columns.added") },
                      { id: "quickNotes", label: t("candidates.columns.quickNotes") },
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

        {/* Active Filter Chips Bar (Shown when secondary filters are applied) */}
        {hasSecondaryFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
            <span className="text-slate-400 font-medium text-[11px]">{t("common.filter")}:</span>
            {selectedJobId !== "ALL" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60 text-xs font-medium">
                <span>{jobs.find((j) => j.id === selectedJobId)?.title || selectedJobId}</span>
                <button
                  type="button"
                  onClick={() => setSelectedJobId("ALL")}
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

        {/* Content Area */}
        {loading && !pagedResult ? (
          <LoadingSpinner />
        ) : candidateRows.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-white p-16 text-center dark:border-slate-800 dark:bg-slate-900 shadow-xs w-full my-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 mb-4">
              <Users className="h-8 w-8 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t("candidates.noCandidatesYet")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6">
              {t("candidates.noCandidatesYetDesc")}
            </p>
            {canEdit && (
              <Button
                onClick={() => router.push("/dashboard/candidates/new")}
                className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 rounded-xl shadow-xs gap-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                {t("candidates.addCandidate")}
              </Button>
            )}
          </div>
        ) : (
          /* Main Candidates Table View matching Screenshot */
          <div className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                {/* Table Header */}
                <thead className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 text-[11px] font-semibold text-slate-500">
                  <tr>
                    {visibleColumns.name && (
                      <th
                        onClick={() => handleSort("name")}
                        className="py-3 px-5 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        <span className="flex items-center gap-1">
                          {t("candidates.columns.name")}
                          {sortField === "name" ? (
                            <ArrowDown
                              className={`h-3 w-3 transition-transform ${
                                sortDirection === "asc" ? "rotate-180" : ""
                              }`}
                            />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-400" />
                          )}
                        </span>
                      </th>
                    )}
                    {visibleColumns.email && (
                      <th
                        onClick={() => handleSort("email")}
                        className="py-3 px-5 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        <span className="flex items-center gap-1">
                          {t("candidates.columns.email")}
                          {sortField === "email" ? (
                            <ArrowDown
                              className={`h-3 w-3 transition-transform ${
                                sortDirection === "asc" ? "rotate-180" : ""
                              }`}
                            />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-400" />
                          )}
                        </span>
                      </th>
                    )}
                    {visibleColumns.phone && (
                      <th
                        onClick={() => handleSort("phone")}
                        className="py-3 px-5 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        <span className="flex items-center gap-1">
                          {t("candidates.columns.phone")}
                          {sortField === "phone" ? (
                            <ArrowDown
                              className={`h-3 w-3 transition-transform ${
                                sortDirection === "asc" ? "rotate-180" : ""
                              }`}
                            />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-400" />
                          )}
                        </span>
                      </th>
                    )}
                    {visibleColumns.applications && (
                      <th
                        onClick={() => handleSort("applications")}
                        className="py-3 px-5 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        <span className="flex items-center gap-1">
                          {t("candidates.columns.applications")}
                          {sortField === "applications" ? (
                            <ArrowDown
                              className={`h-3 w-3 transition-transform ${
                                sortDirection === "asc" ? "rotate-180" : ""
                              }`}
                            />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-400" />
                          )}
                        </span>
                      </th>
                    )}
                    {visibleColumns.added && (
                      <th
                        onClick={() => handleSort("added")}
                        className="py-3 px-5 cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-bold">
                          {t("candidates.columns.added")}
                          {sortField === "added" ? (
                            <ArrowDown
                              className={`h-3 w-3 text-slate-700 dark:text-slate-300 transition-transform ${
                                sortDirection === "asc" ? "rotate-180" : ""
                              }`}
                            />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-400" />
                          )}
                        </span>
                      </th>
                    )}
                    {visibleColumns.quickNotes && (
                      <th className="py-3 px-5 font-semibold text-slate-500">
                        {t("candidates.columns.quickNotes")}
                      </th>
                    )}
                    <th className="py-3 px-5 text-right min-w-[100px] font-semibold text-slate-500">
                      {t("common.actions")}
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {paginatedCandidates.map((candidate) => (
                    <tr
                      key={candidate.id}
                      onClick={() => setSelectedCandidate(candidate)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      {/* Name */}
                      {visibleColumns.name && (
                        <td className="py-4 px-5 font-bold text-slate-900 dark:text-white">
                          <span className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            {candidate.name}
                          </span>
                        </td>
                      )}

                      {/* Email */}
                      {visibleColumns.email && (
                        <td className="py-4 px-5">
                          <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{candidate.email}</span>
                          </span>
                        </td>
                      )}

                      {/* Phone */}
                      {visibleColumns.phone && (
                        <td className="py-4 px-5">
                          {candidate.phone ? (
                            <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                              <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span>{candidate.phone}</span>
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                      )}

                      {/* Applications Count */}
                      {visibleColumns.applications && (
                        <td className="py-4 px-5 text-slate-500 dark:text-slate-400">
                          {candidate.applicationsCount}
                        </td>
                      )}

                      {/* Added Date */}
                      {visibleColumns.added && (
                        <td className="py-4 px-5 text-slate-500 dark:text-slate-400">
                          {formatDate(candidate.createdAt)}
                        </td>
                      )}

                      {/* Quick notes */}
                      {visibleColumns.quickNotes && (
                        <td className="py-4 px-5 max-w-xs">
                          {candidate.notes ? (
                            <span
                              className="inline-block text-xs text-slate-600 dark:text-slate-300 truncate max-w-[220px]"
                              title={candidate.notes}
                            >
                              {candidate.notes}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                      )}

                      {/* Actions */}
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick View */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/candidates/${candidate.id}`);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center"
                            title={t("common.view")}
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Quick Edit (Dedicated Edit Page) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/candidates/${candidate.id}/edit`);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center"
                            title={t("common.edit")}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          {/* Quick Delete */}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCandidateToDelete(candidate);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer inline-flex items-center"
                              title={t("common.delete")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination & Rows Footer */}
            <div className="py-3 px-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/30">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalCount}
                pageSize={rowsPerPage}
                pageSizeOptions={[10, 20, 50, 100]}
                onPageChange={setCurrentPage}
                onPageSizeChange={setRowsPerPage}
                itemLabel={t("candidates.candidateName").toLowerCase()}
              />
            </div>
          </div>
        )}
      </main>

      {/* Slide-over Sidebar Drawer */}
      <CandidateDrawer
        candidate={selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        jobs={jobs}
        canEdit={canEdit}
        onApplyToJob={(candidate) => setApplyToJobModalCandidate(candidate)}
        onScheduleInterview={(app, interview) => {
          setScheduleInterviewApp(app);
          setEditingInterview(interview || null);
        }}
      />

      {/* Apply to Job Modal */}
      <ApplyToJobModal
        isOpen={!!applyToJobModalCandidate}
        onClose={() => setApplyToJobModalCandidate(null)}
        candidate={applyToJobModalCandidate}
        existingApplications={selectedCandidateApps}
      />

      {/* Schedule Interview Modal */}
      {scheduleInterviewApp && (
        <ScheduleInterviewModal
          isOpen={!!scheduleInterviewApp}
          onClose={() => {
            setScheduleInterviewApp(null);
            setEditingInterview(null);
          }}
          jobs={jobs}
          applications={selectedCandidateApps}
          selectedJobId={scheduleInterviewApp.jobId || undefined}
          selectedApplicationId={scheduleInterviewApp.id}
          editingInterview={editingInterview}
        />
      )}

      {/* Delete Candidate Confirmation Modal */}
      {candidateToDelete && (
        <DeleteCandidateModal
          isOpen={!!candidateToDelete}
          onClose={() => setCandidateToDelete(null)}
          onConfirm={handleConfirmDeleteCandidate}
          candidateName={candidateToDelete.name}
          isDeleting={deleteCandidateMutation.isPending}
        />
      )}



      {/* Candidates Filter Drawer (SlideOver) matching Jobs UX */}
      <SlideOver
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title={t("candidates.filters")}
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
                value={selectedJobId}
                onChange={(val) => setSelectedJobId(val)}
                options={[
                  { value: "ALL", label: t("applications.allJobs") },
                  ...jobs.map((j) => ({ value: j.id, label: j.title })),
                ]}
                className="w-full"
                triggerClassName="h-9 text-xs font-normal bg-white dark:bg-slate-950 rounded-xl"
              />
            </div>

            {/* 2. PROFILE STATUS */}
            <div className="space-y-2.5">
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block">
                {t("jobs.statusUpper")}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: "WITH_RESUME", label: t("candidates.withCv") },
                  { id: "HAS_APPLICATIONS", label: t("candidates.hasApplications") },
                  { id: "UNASSIGNED", label: t("candidates.unassigned") },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => toggleCandidateFilter(st.id)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      candidateFilter.includes(st.id)
                        ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. SORT BY */}
            <div className="space-y-2.5">
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block">
                {t("jobs.sortByUpper")}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <CustomSelect
                  value={sortField}
                  onChange={(val) => setSortField(val as SortField)}
                  options={[
                    { value: "added", label: t("candidates.columns.added") },
                    { value: "name", label: t("candidates.columns.name") },
                    { value: "email", label: t("candidates.columns.email") },
                    { value: "phone", label: t("candidates.columns.phone") },
                    { value: "applications", label: t("candidates.columns.applications") },
                  ]}
                  className="w-full"
                  triggerClassName="h-9 text-xs font-normal bg-white dark:bg-slate-950 rounded-xl"
                />

                <CustomSelect
                  value={sortDirection}
                  onChange={(val) => setSortDirection(val as SortDirection)}
                  options={[
                    { value: "desc", label: t("jobs.descending") },
                    { value: "asc", label: t("jobs.ascending") },
                  ]}
                  className="w-full"
                  triggerClassName="h-9 text-xs font-normal bg-white dark:bg-slate-950 rounded-xl"
                />
              </div>
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

export default function CandidatesPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <CandidatesPageContent />
      </Suspense>
    </AuthGuard>
  );
}
