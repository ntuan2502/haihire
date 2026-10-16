"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { usePersistedColumns } from "@/hooks/use-persisted-columns";
import { useI18n } from "@/i18n";
import { useAuth } from "@/context/auth-context";
import { getApiErrorMessage } from "@/lib/api-error";
import { useDeleteApplicationMutation } from "@/hooks/use-queries";
import type { Job, Application } from "@/types";
import type { ApplicationsDataTableProps } from "../types";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import { useApplicationsFilterSort } from "./use-applications-filter-sort";

export function useApplicationsTable({
  applications: initialApplications,
  jobs,
  fixedJobId,
  totalCount: propTotalCount,
  totalPages: propTotalPages,
  currentPage: propCurrentPage,
  rowsPerPage: propRowsPerPage,
  search: propSearch,
  stageFilter,
  stageCounts,
  jobFilter: propJobFilter,
  onPageChange,
  onLimitChange,
  onSearchChange,
  onStageFilterChange,
  onJobFilterChange,
}: ApplicationsDataTableProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { canEdit } = useAuth();
  const deleteAppMutation = useDeleteApplicationMutation();

  const isServerPaginated = Boolean(onPageChange);
  const [localSearch, setLocalSearch] = useState("");
  const search =
    isServerPaginated && propSearch !== undefined ? propSearch : localSearch;

  const [localRowsPerPage, setLocalRowsPerPage] = useState<number>(20);
  const rowsPerPage =
    isServerPaginated && propRowsPerPage !== undefined
      ? propRowsPerPage
      : localRowsPerPage;

  const [localCurrentPage, setLocalCurrentPage] = useState<number>(1);
  const currentPage =
    isServerPaginated && propCurrentPage !== undefined
      ? propCurrentPage
      : localCurrentPage;

  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [deleteModalApp, setDeleteModalApp] = useState<Application | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingInterview, setEditingInterview] =
    useState<ScheduledInterviewInfo | null>(null);

  // Filter Drawer State & Secondary Filters
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [scoreFilter, setScoreFilter] = useState<string>("ALL");
  const [localJobFilter, setLocalJobFilter] = useState<string>("ALL");
  const currentJobFilter =
    propJobFilter !== undefined ? (propJobFilter || "ALL") : localJobFilter;

  // Stage filters
  const [localStageFilters, setLocalStageFilters] = useState<string[]>([]);
  const stageFilters = useMemo(
    () =>
      stageFilter !== undefined
        ? stageFilter
          ? stageFilter.split(",")
          : []
        : localStageFilters,
    [stageFilter, localStageFilters],
  );

  // Column Visibility Toggle State (Persisted in localStorage)
  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const columnsRef = useRef<HTMLDivElement>(null);
  const { columns: visibleColumns, toggleColumn } = usePersistedColumns(
    "haihire_applications_columns_v1",
    {
      candidate: true,
      email: true,
      job: true,
      status: true,
      score: true,
      applied: true,
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

  // Job Map for Fast Lookup
  const jobMap = useMemo(() => {
    const map = new Map<string, Job>();
    jobs.forEach((j) => map.set(j.id, j));
    return map;
  }, [jobs]);

  const baseApplications = useMemo(() => {
    if (!fixedJobId) {
      return initialApplications;
    }
    return initialApplications.filter(
      (a) => String(a.jobId) === String(fixedJobId),
    );
  }, [initialApplications, fixedJobId]);

  const setJobFilter = (val: string) => {
    if (onJobFilterChange) {
      onJobFilterChange(val === "ALL" ? undefined : val);
    } else {
      setLocalJobFilter(val);
      setLocalCurrentPage(1);
    }
  };

  const toggleStage = (stageId: string) => {
    const next = stageFilters.includes(stageId)
      ? stageFilters.filter((x) => x !== stageId)
      : [...stageFilters, stageId];
    if (onStageFilterChange) {
      onStageFilterChange(next.length > 0 ? next.join(",") : undefined);
    } else {
      setLocalStageFilters(next);
      setLocalCurrentPage(1);
    }
  };

  const handleClearStages = () => {
    if (onStageFilterChange) {
      onStageFilterChange(undefined);
    } else {
      setLocalStageFilters([]);
      setLocalCurrentPage(1);
    }
  };

  const filterSort = useApplicationsFilterSort({
    baseApplications,
    stageFilters,
    fixedJobId,
    currentJobFilter,
    scoreFilter,
    search,
    jobMap,
    isServerPaginated,
    propTotalCount,
    propTotalPages,
    rowsPerPage,
    currentPage,
    setJobFilter,
    setScoreFilter,
    handleClearStages,
  });

  const handleConfirmDelete = async () => {
    if (!deleteModalApp) return;
    try {
      setIsDeleting(true);
      await deleteAppMutation.mutateAsync(deleteModalApp.id);
      if (selectedApp?.id === deleteModalApp.id) {
        setSelectedApp(null);
      }
      setDeleteModalApp(null);
    } catch (err) {
      console.error("Failed to delete application:", err);
      toast.error(getApiErrorMessage(err, t));
    } finally {
      setIsDeleting(false);
    }
  };

  const stageTabs = useMemo(
    () => [
      { id: "ALL", label: t("common.all"), count: stageCounts?.ALL ?? filterSort.totalCount },
      { id: "APPLIED", label: t("pipeline.stages.applied"), count: stageCounts?.APPLIED },
      { id: "SCREENING", label: t("pipeline.stages.screening"), count: stageCounts?.SCREENING },
      { id: "INTERVIEW", label: t("pipeline.stages.interview"), count: stageCounts?.INTERVIEW },
      { id: "OFFER", label: t("pipeline.stages.offer"), count: stageCounts?.OFFER },
      { id: "HIRED", label: t("pipeline.stages.hired"), count: stageCounts?.HIRED },
      { id: "REJECTED", label: t("pipeline.stages.rejected"), count: stageCounts?.REJECTED },
    ],
    [t, stageCounts, filterSort.totalCount],
  );

  const onSearchChangeHandler = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setLocalSearch(val);
      setLocalCurrentPage(1);
    }
  };

  const onPageChangeHandler = (p: number) => {
    if (onPageChange) onPageChange(p);
    else setLocalCurrentPage(p);
  };

  const onPageSizeChangeHandler = (size: number) => {
    if (onLimitChange) onLimitChange(size);
    else {
      setLocalRowsPerPage(size);
      setLocalCurrentPage(1);
    }
  };

  return {
    t,
    router,
    canEdit,
    // Search
    search,
    onSearchChangeHandler,
    // Pagination
    currentPage,
    totalPages: filterSort.totalPages,
    totalCount: filterSort.totalCount,
    rowsPerPage,
    onPageChangeHandler,
    onPageSizeChangeHandler,
    // Sorting
    sortField: filterSort.sortField,
    sortDirection: filterSort.sortDirection,
    handleSort: filterSort.handleSort,
    setSortField: filterSort.setSortField,
    setSortDirection: filterSort.setSortDirection,
    // Column Visibility
    isColumnsOpen,
    setIsColumnsOpen,
    columnsRef,
    visibleColumns,
    toggleColumn,
    // Filter Drawer & Secondary Filters
    isFilterOpen,
    setIsFilterOpen,
    scoreFilter,
    setScoreFilter,
    currentJobFilter,
    setJobFilter,
    stageFilters,
    toggleStage,
    handleClearStages,
    stageTabs,
    hasSecondaryFilters: filterSort.hasSecondaryFilters,
    secondaryFiltersCount: filterSort.secondaryFiltersCount,
    handleResetFilters: filterSort.handleResetFilters,
    // Data
    jobMap,
    baseApplications,
    paginatedApps: filterSort.paginatedApps,
    // Selected Application State
    selectedApp,
    setSelectedApp,
    // Modals State
    deleteModalApp,
    setDeleteModalApp,
    isDeleting,
    handleConfirmDelete,
    isScheduleModalOpen,
    setIsScheduleModalOpen,
    editingInterview,
    setEditingInterview,
  };
}
