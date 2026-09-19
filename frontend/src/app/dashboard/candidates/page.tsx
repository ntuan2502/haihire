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
import { useTableParams } from "@/hooks/use-table-params";
import {
  useAllJobs,
  useCandidates,
  useCandidate,
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import {
  Users,
  Plus,
  SlidersHorizontal,
  Columns3,
  Maximize2,
  ChevronDown,
  Mail,
  Phone,
  ArrowUpDown,
  ArrowDown,
  UploadCloud,
} from "lucide-react";

import {
  formatDate,
  type CandidateItem,
} from "@/lib/utils";
import { ScheduleInterviewModal } from "@/components/interviews/schedule-interview-modal";
import { CandidateDrawer } from "@/components/candidates/candidate-drawer";
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



  // Column Visibility Toggle State & Ref
  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const columnsRef = useRef<HTMLDivElement>(null);
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    email: true,
    phone: true,
    applications: true,
    added: true,
    quickNotes: true,
  });

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    if (key === "name") return; // locked
    setVisibleColumns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

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

  // Sorter for current page items
  const paginatedCandidates = useMemo(() => {
    return [...candidateRows].sort((a, b) => {
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
  }, [candidateRows, sortField, sortDirection]);

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
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto space-y-4">
        {/* Candidates Toolbar matching Screenshot */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <SearchInput
            placeholder={t("candidates.searchCandidates")}
            value={search}
            onChange={setSearch}
          />

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Views Button */}
            <div className="relative">
              <button
                type="button"
                disabled
                className="h-9 px-3 rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-400 dark:text-slate-500 shadow-xs cursor-not-allowed opacity-50 flex items-center gap-1.5 transition-colors"
                title={`${t("common.views")} (${t("common.comingSoon")})`}
              >
                <span>{t("common.views")}</span>
                <ChevronDown className="h-3 w-3 text-slate-400 opacity-70" />
              </button>
            </div>

            {/* Columns Dropdown matching Screenshot */}
            <div className="relative" ref={columnsRef}>
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

            {/* Filters */}
            <button
              type="button"
              disabled
              className="h-9 px-3 rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-400 dark:text-slate-500 shadow-xs cursor-not-allowed opacity-50 flex items-center gap-1.5 transition-colors"
              title={`${t("candidates.filters")} (${t("common.comingSoon")})`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
              <span>{t("candidates.filters")}</span>
            </button>

            {/* Fullscreen icon */}
            <button
              type="button"
              disabled
              className="h-9 w-9 rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-400 shadow-xs cursor-not-allowed opacity-50 inline-flex items-center justify-center transition-colors"
              title={`${t("candidates.fullscreen")} (${t("common.comingSoon")})`}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>

            {/* Import CSV */}
            <button
              type="button"
              disabled
              className="h-9 px-3.5 rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-400 dark:text-slate-500 shadow-xs cursor-not-allowed opacity-50 flex items-center gap-1.5 transition-colors"
              title={`${t("candidates.importCsv")} (${t("common.comingSoon")})`}
            >
              <UploadCloud className="h-3.5 w-3.5 text-slate-400" />
              <span>{t("candidates.importCsv")}</span>
            </button>

            {/* Add Candidate button (Admins only) */}
            {canEdit && (
              <Button
                size="sm"
                onClick={() => router.push("/dashboard/candidates/new")}
                className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs gap-1.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>{t("candidates.addCandidate")}</span>
              </Button>
            )}
          </div>
        </div>

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
        jobs={jobs}
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
