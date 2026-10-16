"use client";

import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { DocumentPreviewModal } from "@/components/applications/document-preview-modal";
import { DeleteApplicationModal } from "@/components/applications/delete-application-modal";
import { ScheduleInterviewModal } from "@/components/interviews/schedule-interview-modal";
import type { ApplicationsDataTableProps } from "./types";
import { useApplicationsTable } from "./hooks/use-applications-table";
import { useCandidateDrawer } from "./hooks/use-candidate-drawer";
import { ApplicationsTableToolbar } from "./toolbar/applications-table-toolbar";
import { ApplicationsTableView } from "./table/applications-table-view";
import { CandidateQuickDrawer } from "./drawer/candidate-quick-drawer";
import { ApplicationsFilterDrawer } from "./filters/applications-filter-drawer";

export function ApplicationsDataTable(props: ApplicationsDataTableProps) {
  const {
    jobs,
    loading = false,
    fixedJobId,
    onViewInPipeline,
  } = props;

  const table = useApplicationsTable(props);
  const { t, canEdit } = table;

  const drawer = useCandidateDrawer({
    initialApplications: props.applications,
    selectedApp: table.selectedApp,
    setSelectedApp: table.setSelectedApp,
    jobMap: table.jobMap,
  });

  return (
    <div className="space-y-4">
      {/* Modern Unified Responsive Toolbar & Filter Chips */}
      <ApplicationsTableToolbar
        stageTabs={table.stageTabs}
        stageFilters={table.stageFilters}
        toggleStage={table.toggleStage}
        handleClearStages={table.handleClearStages}
        search={table.search}
        onSearchChangeHandler={table.onSearchChangeHandler}
        isColumnsOpen={table.isColumnsOpen}
        setIsColumnsOpen={table.setIsColumnsOpen}
        columnsRef={table.columnsRef}
        visibleColumns={table.visibleColumns}
        toggleColumn={table.toggleColumn}
        setIsFilterOpen={table.setIsFilterOpen}
        secondaryFiltersCount={table.secondaryFiltersCount}
        hasSecondaryFilters={table.hasSecondaryFilters}
        fixedJobId={fixedJobId}
        currentJobFilter={table.currentJobFilter}
        jobs={jobs}
        setJobFilter={table.setJobFilter}
        scoreFilter={table.scoreFilter}
        setScoreFilter={table.setScoreFilter}
        handleResetFilters={table.handleResetFilters}
      />

      {/* Content Area */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <ApplicationsTableView
          baseApplications={table.baseApplications}
          paginatedApps={table.paginatedApps}
          jobMap={table.jobMap}
          visibleColumns={table.visibleColumns}
          sortField={table.sortField}
          sortDirection={table.sortDirection}
          handleSort={table.handleSort}
          onSelectApp={(app) => table.setSelectedApp(app)}
          onDeleteApp={(app) => table.setDeleteModalApp(app)}
          canEdit={canEdit}
          currentPage={table.currentPage}
          totalPages={table.totalPages}
          totalCount={table.totalCount}
          rowsPerPage={table.rowsPerPage}
          onPageChangeHandler={table.onPageChangeHandler}
          onPageSizeChangeHandler={table.onPageSizeChangeHandler}
        />
      )}

      {/* Quick Drawer Slide-over */}
      <CandidateQuickDrawer
        selectedApp={table.selectedApp}
        currentApp={drawer.currentApp}
        onClose={() => table.setSelectedApp(null)}
        onViewInPipeline={onViewInPipeline}
        selectedJobTitle={drawer.selectedJobTitle}
        drawerTab={drawer.drawerTab}
        onTabChange={drawer.setDrawerTab}
        drawerOverviewSections={drawer.drawerOverviewSections}
        onToggleOverviewSection={(key) =>
          drawer.setDrawerOverviewSections((prev) => ({
            ...prev,
            [key]: !prev[key],
          }))
        }
        isDrawerOverviewPopoverOpen={drawer.isDrawerOverviewPopoverOpen}
        onToggleDrawerOverviewPopover={() =>
          drawer.setIsDrawerOverviewPopoverOpen((prev) => !prev)
        }
        onCloseDrawerOverviewPopover={() =>
          drawer.setIsDrawerOverviewPopoverOpen(false)
        }
        drawerOverviewBtnRef={drawer.drawerOverviewBtnRef}
        allScheduledInterviews={drawer.allScheduledInterviews}
        drawerCandidateDocuments={drawer.drawerCandidateDocuments}
        drawerNotesList={drawer.drawerNotesList}
        drawerNoteInput={drawer.drawerNoteInput}
        onDrawerNoteInputChange={drawer.setDrawerNoteInput}
        onAddDrawerNote={drawer.handleAddDrawerNote}
        onScheduleInterview={(intv) => {
          table.setEditingInterview(intv || null);
          table.setIsScheduleModalOpen(true);
        }}
        onCancelInterview={drawer.handleCancelInterview}
        onPreviewDoc={(doc) => drawer.setDrawerPreviewDoc(doc)}
        onDownloadDoc={drawer.handleDownloadDoc}
        onStageChange={drawer.handleStageChange}
        isStageUpdatePending={drawer.isStageUpdatePending}
        onOpenScheduleModal={() => table.setIsScheduleModalOpen(true)}
        onOpenDeleteModal={(app) => table.setDeleteModalApp(app)}
        isDeleting={table.isDeleting}
        canEdit={canEdit}
      />

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={!!drawer.drawerPreviewDoc}
        onClose={() => drawer.setDrawerPreviewDoc(null)}
        document={drawer.drawerPreviewDoc}
        appId={drawer.currentApp?.id}
        onDownload={drawer.handleDownloadDoc}
      />

      {/* Delete Application Modal */}
      {table.deleteModalApp && (
        <DeleteApplicationModal
          isOpen={true}
          onClose={() => table.setDeleteModalApp(null)}
          onConfirm={table.handleConfirmDelete}
          candidateName={table.deleteModalApp.candidateName}
          jobTitle={
            table.deleteModalApp.jobId && table.jobMap.get(table.deleteModalApp.jobId)
              ? `${table.jobMap.get(table.deleteModalApp.jobId)!.title} (${
                  table.jobMap.get(table.deleteModalApp.jobId)!.type === "FULL_TIME"
                    ? t("jobs.fullTime")
                    : table.jobMap.get(table.deleteModalApp.jobId)!.type === "PART_TIME"
                      ? t("jobs.partTime")
                      : table.jobMap.get(table.deleteModalApp.jobId)!.type
                })`
              : t("applications.applyingForPosition")
          }
          isDeleting={table.isDeleting}
        />
      )}

      {/* Schedule Interview Modal */}
      {drawer.currentApp && (
        <ScheduleInterviewModal
          isOpen={table.isScheduleModalOpen}
          onClose={() => {
            table.setIsScheduleModalOpen(false);
            table.setEditingInterview(null);
          }}
          jobs={jobs}
          applications={table.baseApplications}
          selectedJobId={drawer.currentApp.jobId || undefined}
          selectedApplicationId={drawer.currentApp.id}
          editingInterview={table.editingInterview}
          onInterviewScheduled={() => {
            table.setSelectedApp((prev) =>
              prev ? { ...prev, stage: "INTERVIEW" } : null,
            );
          }}
        />
      )}

      {/* Applications Filter Drawer */}
      <ApplicationsFilterDrawer
        isOpen={table.isFilterOpen}
        onClose={() => table.setIsFilterOpen(false)}
        jobs={jobs}
        fixedJobId={fixedJobId}
        currentJobFilter={table.currentJobFilter}
        onJobFilterChange={table.setJobFilter}
        scoreFilter={table.scoreFilter}
        onScoreFilterChange={table.setScoreFilter}
        sortField={table.sortField}
        onSortFieldChange={table.setSortField}
        sortDirection={table.sortDirection}
        onSortDirectionChange={table.setSortDirection}
        onResetFilters={table.handleResetFilters}
      />
    </div>
  );
}
