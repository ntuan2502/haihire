"use client";

import { useRouter } from "next/navigation";
import { Users, Plus } from "lucide-react";
import { Navbar } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { CandidateDrawer } from "@/components/candidates/candidate-drawer";
import { ApplyToJobModal } from "@/components/candidates/apply-to-job-modal";
import { ScheduleInterviewModal } from "@/components/interviews/schedule-interview-modal";
import { DeleteCandidateModal } from "@/components/candidates/delete-candidate-modal";
import { useAuth } from "@/context/auth-context";
import { useAllJobs } from "@/hooks/use-queries";
import { usePersistedColumns } from "@/hooks/use-persisted-columns";
import { useI18n } from "@/i18n";
import { useCandidatesFilterSort } from "./hooks/use-candidates-filter-sort";
import { useCandidatesDrawerState } from "./hooks/use-candidates-drawer-state";
import { CandidatesToolbar } from "./toolbar/candidates-toolbar";
import { CandidatesTable } from "./table/candidates-table";
import { CandidatesFilterDrawer } from "./drawers/candidates-filter-drawer";
import type { CandidateVisibleColumns } from "./toolbar/candidates-column-picker";

export function CandidatesView() {
  const router = useRouter();
  const { user, canEdit } = useAuth();
  const { t } = useI18n();

  const { data: jobs = [], isLoading: jobsLoading } = useAllJobs(
    user?.organizationId,
  );

  const filterSort = useCandidatesFilterSort(user?.organizationId);
  const drawerState = useCandidatesDrawerState();

  const { columns: visibleColumns, toggleColumn } =
    usePersistedColumns<CandidateVisibleColumns>(
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

  const loading = jobsLoading || filterSort.candidatesLoading;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Navbar */}
      <Navbar
        activeTab="candidates"
        onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
        jobsCount={jobs.length}
        candidatesCount={filterSort.totalCount}
      />

      {/* Main Content */}
      <main
        id="main-content"
        className="flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10 w-full space-y-4"
      >
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {t("candidates.title")}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80">
              {filterSort.totalCount}
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

        {/* Toolbar */}
        <CandidatesToolbar
          candidateTabs={filterSort.candidateTabs}
          candidateFilter={filterSort.candidateFilter}
          onToggleTab={filterSort.toggleCandidateFilter}
          onClearTabs={() => filterSort.setCandidateFilter([])}
          search={filterSort.search}
          onSearchChange={filterSort.setSearch}
          visibleColumns={visibleColumns}
          toggleColumn={toggleColumn}
          onOpenFilterDrawer={() => drawerState.setIsFilterOpen(true)}
          secondaryFiltersCount={filterSort.secondaryFiltersCount}
          hasSecondaryFilters={filterSort.hasSecondaryFilters}
          jobs={jobs}
          selectedJobId={filterSort.selectedJobId}
          onClearJobFilter={() => filterSort.setSelectedJobId("ALL")}
          onResetAllFilters={filterSort.handleResetFilters}
        />

        {/* Content Area */}
        {loading && !filterSort.hasPagedResult ? (
          <LoadingSpinner />
        ) : filterSort.candidateRows.length === 0 ? (
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
          <CandidatesTable
            candidates={filterSort.paginatedCandidates}
            visibleColumns={visibleColumns}
            sortField={filterSort.sortField}
            sortDirection={filterSort.sortDirection}
            onSort={filterSort.handleSort}
            canEdit={canEdit}
            onSelectCandidate={drawerState.setSelectedCandidate}
            onDeleteCandidate={drawerState.setCandidateToDelete}
            currentPage={filterSort.currentPage}
            totalPages={filterSort.totalPages}
            totalCount={filterSort.totalCount}
            rowsPerPage={filterSort.rowsPerPage}
            onPageChange={filterSort.setCurrentPage}
            onPageSizeChange={filterSort.setRowsPerPage}
          />
        )}
      </main>

      {/* Slide-over Profile Drawer */}
      <CandidateDrawer
        candidate={drawerState.selectedCandidate}
        onClose={() => drawerState.setSelectedCandidate(null)}
        jobs={jobs}
        canEdit={canEdit}
        onApplyToJob={drawerState.setApplyToJobModalCandidate}
        onScheduleInterview={(app, interview) => {
          drawerState.setScheduleInterviewApp(app);
          drawerState.setEditingInterview(interview || null);
        }}
      />

      {/* Apply to Job Modal */}
      <ApplyToJobModal
        isOpen={!!drawerState.applyToJobModalCandidate}
        onClose={() => drawerState.setApplyToJobModalCandidate(null)}
        candidate={drawerState.applyToJobModalCandidate}
        existingApplications={drawerState.selectedCandidateApps}
      />

      {/* Schedule Interview Modal */}
      {drawerState.scheduleInterviewApp && (
        <ScheduleInterviewModal
          isOpen={!!drawerState.scheduleInterviewApp}
          onClose={() => {
            drawerState.setScheduleInterviewApp(null);
            drawerState.setEditingInterview(null);
          }}
          jobs={jobs}
          applications={drawerState.selectedCandidateApps}
          selectedJobId={drawerState.scheduleInterviewApp.jobId || undefined}
          selectedApplicationId={drawerState.scheduleInterviewApp.id}
          editingInterview={drawerState.editingInterview}
        />
      )}

      {/* Delete Candidate Confirmation Modal */}
      {drawerState.candidateToDelete && (
        <DeleteCandidateModal
          isOpen={!!drawerState.candidateToDelete}
          onClose={() => drawerState.setCandidateToDelete(null)}
          onConfirm={drawerState.handleConfirmDeleteCandidate}
          candidateName={drawerState.candidateToDelete.name}
          isDeleting={drawerState.deleteCandidateMutation.isPending}
        />
      )}

      {/* Filter Drawer */}
      <CandidatesFilterDrawer
        isOpen={drawerState.isFilterOpen}
        onClose={() => drawerState.setIsFilterOpen(false)}
        jobs={jobs}
        selectedJobId={filterSort.selectedJobId}
        onJobChange={filterSort.setSelectedJobId}
        candidateFilter={filterSort.candidateFilter}
        onToggleFilter={filterSort.toggleCandidateFilter}
        sortField={filterSort.sortField}
        onSortFieldChange={filterSort.setSortField}
        sortDirection={filterSort.sortDirection}
        onSortDirectionChange={filterSort.setSortDirection}
        onResetFilters={filterSort.handleResetFilters}
      />
    </div>
  );
}
