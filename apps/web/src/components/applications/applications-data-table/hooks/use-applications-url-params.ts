"use client";

import { useCallback, useMemo } from "react";
import { useTableParams } from "@/hooks/use-table-params";
import type { DrawerTabId, SortDirection, SortField } from "../types";

const VALID_SORT_FIELDS: readonly SortField[] = [
  "candidate",
  "email",
  "job",
  "status",
  "score",
  "applied",
];

const VALID_DRAWER_TABS: readonly DrawerTabId[] = [
  "overview",
  "interviews",
  "documents",
  "notes",
  "timeline",
];

export function buildStageCounts(
  source?: { total: number; byStage: Record<string, number> } | null,
): Record<string, number> | undefined {
  if (!source) return undefined;
  return {
    ALL: source.total ?? 0,
    APPLIED: source.byStage.APPLIED ?? 0,
    SCREENING: source.byStage.SCREENING ?? 0,
    INTERVIEW: source.byStage.INTERVIEW ?? 0,
    OFFER: source.byStage.OFFER ?? 0,
    HIRED: source.byStage.HIRED ?? 0,
    REJECTED: source.byStage.REJECTED ?? 0,
  };
}

/**
 * Shared URL query synchronization for server-paginated ApplicationsDataTable screens
 * (`/applications` and `/jobs/[id]/table`).
 */
export function useApplicationsUrlParams(options?: { defaultLimit?: number }) {
  const {
    page: currentPage,
    limit: rowsPerPage,
    search,
    setSearch,
    setPage: setCurrentPage,
    setLimit: setRowsPerPage,
    getParam,
    setParams,
  } = useTableParams(
    options?.defaultLimit ? { defaultLimit: options.defaultLimit } : undefined,
  );

  const stage = getParam("stage", "");
  const jobId = getParam("jobId", "");
  const score = getParam("score", "ALL");

  const rawSortBy = getParam("sortBy", "applied");
  const sortField: SortField = VALID_SORT_FIELDS.includes(
    rawSortBy as SortField,
  )
    ? (rawSortBy as SortField)
    : "applied";

  const rawSortOrder = getParam("sortOrder", "desc");
  const sortDirection: SortDirection = rawSortOrder === "asc" ? "asc" : "desc";

  const selectedAppId = getParam("applicationId", "") || null;
  const rawTab = getParam("tab", "overview");
  const drawerTab: DrawerTabId = VALID_DRAWER_TABS.includes(
    rawTab as DrawerTabId,
  )
    ? (rawTab as DrawerTabId)
    : "overview";

  const queryParams = useMemo(
    () => ({
      page: currentPage,
      limit: rowsPerPage,
      search: search.trim() || undefined,
      stage: stage || undefined,
      score: score && score !== "ALL" ? score : undefined,
      sortBy: sortField,
      sortOrder: sortDirection,
    }),
    [currentPage, rowsPerPage, search, stage, score, sortField, sortDirection],
  );

  const onStageFilterChange = useCallback(
    (newStage?: string) => setParams({ stage: newStage || null, page: 1 }),
    [setParams],
  );

  const onJobFilterChange = useCallback(
    (newJobId?: string) => setParams({ jobId: newJobId || null, page: 1 }),
    [setParams],
  );

  const onScoreFilterChange = useCallback(
    (newScore?: string) =>
      setParams({
        score: newScore && newScore !== "ALL" ? newScore : null,
        page: 1,
      }),
    [setParams],
  );

  const onSortChange = useCallback(
    (field: SortField, direction: SortDirection) =>
      setParams({
        sortBy: field === "applied" ? null : field,
        sortOrder: direction === "desc" ? null : direction,
        page: 1,
      }),
    [setParams],
  );

  const onSelectedAppIdChange = useCallback(
    (appId: string | null) =>
      setParams(
        {
          applicationId: appId || null,
          tab: appId ? undefined : null,
        },
        false,
      ),
    [setParams],
  );

  const onDrawerTabChange = useCallback(
    (tab: DrawerTabId) =>
      setParams({ tab: tab === "overview" ? null : tab }, false),
    [setParams],
  );

  return {
    currentPage,
    rowsPerPage,
    search,
    stage,
    jobId,
    score,
    sortField,
    sortDirection,
    selectedAppId,
    drawerTab,
    queryParams,
    onPageChange: setCurrentPage,
    onLimitChange: setRowsPerPage,
    onSearchChange: setSearch,
    onStageFilterChange,
    onJobFilterChange,
    onScoreFilterChange,
    onSortChange,
    onSelectedAppIdChange,
    onDrawerTabChange,
  };
}
