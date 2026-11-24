"use client";

import { useMemo, useCallback } from "react";
import { useTableParams } from "@/hooks/use-table-params";
import { useCandidates } from "@/hooks/use-queries";
import type { CandidateSortBy } from "@/lib/api";
import { useI18n } from "@/i18n";
import { useLocalization } from "@/components/providers/localization-provider";
import { getCandidateDisplayName, type CandidateItem } from "@/lib/utils";

export type SortField = CandidateSortBy;
export type SortDirection = "asc" | "desc";

const VALID_SORT_FIELDS = new Set<SortField>([
  "name",
  "email",
  "phone",
  "applications",
  "added",
]);

const VALID_TAB_FILTERS = new Set([
  "WITH_RESUME",
  "HAS_APPLICATIONS",
  "UNASSIGNED",
]);

export function useCandidatesFilterSort(
  organizationId?: string | null,
  options?: { enabled?: boolean },
) {
  const { t } = useI18n();
  const { localization } = useLocalization();

  // Synchronized URL Query State for Pagination, Search, Filter & Sorting
  const {
    page: currentPage,
    limit: rowsPerPage,
    search,
    setSearch,
    setPage: setCurrentPage,
    setLimit: setRowsPerPage,
    getParam,
    setParams,
  } = useTableParams();

  const rawFilter = getParam("filter", "");
  const candidateFilter = useMemo(
    () =>
      rawFilter
        ? rawFilter
            .split(",")
            .map((x) => x.trim().toUpperCase())
            .filter((x) => VALID_TAB_FILTERS.has(x))
        : [],
    [rawFilter],
  );

  const selectedJobId = getParam("jobId", "ALL") || "ALL";
  const rawSortBy = getParam("sortBy", "added") as SortField;
  const sortField: SortField = VALID_SORT_FIELDS.has(rawSortBy)
    ? rawSortBy
    : "added";
  const rawSortOrder = getParam("sortOrder", "desc");
  const sortDirection: SortDirection = rawSortOrder === "asc" ? "asc" : "desc";

  // Fetch server-paginated, server-filtered & server-sorted candidates
  const { data: pagedResult, isLoading: candidatesLoading } = useCandidates(
    organizationId || undefined,
    {
      page: currentPage,
      limit: rowsPerPage,
      search: search.trim() || undefined,
      filter:
        candidateFilter.length > 0 ? candidateFilter.join(",") : undefined,
      jobId: selectedJobId !== "ALL" ? selectedJobId : undefined,
      sortBy: sortField,
      sortOrder: sortDirection,
      enabled: options?.enabled,
    },
  );

  const rawCandidates = useMemo(
    () => pagedResult?.data || [],
    [pagedResult?.data],
  );
  const totalCount = pagedResult?.total || 0;
  const totalPages = Math.max(1, pagedResult?.totalPages || 1);

  // Map raw candidates to CandidateItem view models
  const candidateRows: CandidateItem[] = useMemo(() => {
    return rawCandidates.map((cand) => ({
      id: cand.id,
      name: getCandidateDisplayName(cand, localization),
      email: cand.email,
      phone: cand.phone || "—",
      applicationsCount:
        cand.applicationsCount ?? cand.applications?.length ?? 0,
      createdAt: cand.createdAt,
      updatedAt: cand.updatedAt,
      latestNote: cand.latestNote ?? cand.candidateNotes?.[0] ?? null,
      notesCount: cand.notesCount ?? cand.candidateNotes?.length ?? 0,
      resumeUrl: cand.resumeUrl,
      resumeFileName: cand.resumeFileName,
      resumeFileSize: cand.resumeFileSize,
      resumeMimeType: cand.resumeMimeType,
      candidate: cand,
    }));
  }, [rawCandidates, localization]);

  const hasPagedResult = Boolean(pagedResult);
  const serverCounts = pagedResult?.counts;
  const candidateTabs = useMemo(
    () => [
      {
        id: "ALL",
        label: t("common.all"),
        count: hasPagedResult ? (serverCounts?.all ?? totalCount) : undefined,
      },
      {
        id: "WITH_RESUME",
        label: t("candidates.withCv"),
        count: hasPagedResult ? (serverCounts?.withResume ?? 0) : undefined,
      },
      {
        id: "HAS_APPLICATIONS",
        label: t("candidates.hasApplications"),
        count: hasPagedResult
          ? (serverCounts?.hasApplications ?? 0)
          : undefined,
      },
      {
        id: "UNASSIGNED",
        label: t("candidates.unassigned"),
        count: hasPagedResult ? (serverCounts?.unassigned ?? 0) : undefined,
      },
    ],
    [t, hasPagedResult, serverCounts, totalCount],
  );

  const setSelectedJobId = useCallback(
    (jobId: string) => {
      setParams({ jobId: jobId && jobId !== "ALL" ? jobId : null }, true);
    },
    [setParams],
  );

  const setCandidateFilter = useCallback(
    (filtersOrUpdater: string[] | ((prev: string[]) => string[])) => {
      const next =
        typeof filtersOrUpdater === "function"
          ? filtersOrUpdater(candidateFilter)
          : filtersOrUpdater;
      const valid = next
        .map((x) => x.trim().toUpperCase())
        .filter((x) => VALID_TAB_FILTERS.has(x));
      setParams({ filter: valid.length > 0 ? valid.join(",") : null }, true);
    },
    [candidateFilter, setParams],
  );

  const toggleCandidateFilter = useCallback(
    (filterId: string) => {
      const next = candidateFilter.includes(filterId)
        ? candidateFilter.filter((x) => x !== filterId)
        : [...candidateFilter, filterId];
      setCandidateFilter(next);
    },
    [candidateFilter, setCandidateFilter],
  );

  const setSortField = useCallback(
    (field: SortField) => {
      setParams({ sortBy: field === "added" ? null : field }, true);
    },
    [setParams],
  );

  const setSortDirection = useCallback(
    (
      dirOrUpdater: SortDirection | ((prev: SortDirection) => SortDirection),
    ) => {
      const next =
        typeof dirOrUpdater === "function"
          ? dirOrUpdater(sortDirection)
          : dirOrUpdater;
      setParams({ sortOrder: next === "desc" ? null : next }, true);
    },
    [sortDirection, setParams],
  );

  const secondaryFiltersCount = selectedJobId !== "ALL" ? 1 : 0;
  const hasSecondaryFilters = secondaryFiltersCount > 0;

  const handleResetFilters = useCallback(() => {
    setParams(
      { jobId: null, filter: null, sortBy: null, sortOrder: null },
      true,
    );
  }, [setParams]);

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        const nextDir: SortDirection = sortDirection === "asc" ? "desc" : "asc";
        setParams(
          {
            sortBy: field === "added" ? null : field,
            sortOrder: nextDir === "desc" ? null : nextDir,
          },
          true,
        );
      } else {
        setParams(
          {
            sortBy: field === "added" ? null : field,
            sortOrder: "asc",
          },
          true,
        );
      }
    },
    [sortField, sortDirection, setParams],
  );

  return {
    currentPage,
    rowsPerPage,
    search,
    setSearch,
    setCurrentPage,
    setRowsPerPage,
    candidatesLoading,
    hasPagedResult: !!pagedResult,
    totalCount,
    totalPages,
    selectedJobId,
    setSelectedJobId,
    candidateFilter,
    toggleCandidateFilter,
    setCandidateFilter,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    candidateRows,
    candidateTabs,
    filteredCandidateRows: candidateRows,
    paginatedCandidates: candidateRows,
    secondaryFiltersCount,
    hasSecondaryFilters,
    handleResetFilters,
    handleSort,
  };
}
