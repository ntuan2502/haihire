"use client";

import { useState, useMemo } from "react";
import { useTableParams } from "@/hooks/use-table-params";
import { useCandidates } from "@/hooks/use-queries";
import { useI18n } from "@/i18n";
import type { CandidateItem } from "@/lib/utils";

export type SortField = "name" | "email" | "phone" | "applications" | "added";
export type SortDirection = "asc" | "desc";

export function useCandidatesFilterSort(organizationId?: string | null) {
  const { t } = useI18n();

  // URL Query State for Pagination & Search
  const {
    page: currentPage,
    limit: rowsPerPage,
    search,
    setSearch,
    setPage: setCurrentPage,
    setLimit: setRowsPerPage,
  } = useTableParams();

  // Fetch server-paginated candidates
  const { data: pagedResult, isLoading: candidatesLoading } = useCandidates(
    organizationId || undefined,
    {
      page: currentPage,
      limit: rowsPerPage,
      search: search.trim() || undefined,
    },
  );

  const rawCandidates = useMemo(
    () => pagedResult?.data || [],
    [pagedResult?.data],
  );
  const totalCount = pagedResult?.total || 0;
  const totalPages = Math.max(1, pagedResult?.totalPages || 1);

  // Secondary Filter & Sorting State
  const [selectedJobId, setSelectedJobId] = useState<string>("ALL");
  const [candidateFilter, setCandidateFilter] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>("added");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Map raw candidates to CandidateItem view models
  const candidateRows: CandidateItem[] = useMemo(() => {
    return rawCandidates.map((cand) => ({
      id: cand.id,
      name: cand.name,
      email: cand.email,
      phone: cand.phone || "—",
      applicationsCount:
        cand.applicationsCount ?? cand.applications?.length ?? 0,
      createdAt: cand.createdAt,
      updatedAt: cand.updatedAt,
      notes: cand.notes || "",
      resumeUrl: cand.resumeUrl,
      resumeFileName: cand.resumeFileName,
      resumeFileSize: cand.resumeFileSize,
      resumeMimeType: cand.resumeMimeType,
      candidate: cand,
    }));
  }, [rawCandidates]);

  // Compute status counts for segmented tabs
  const candidateCounts = useMemo(() => {
    let withResume = 0;
    let hasApplications = 0;
    let unassigned = 0;
    for (const c of candidateRows) {
      const hasCv = Boolean(
        c.resumeUrl || (c.resumeFileName && c.resumeFileName !== "—"),
      );
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
      {
        id: "WITH_RESUME",
        label: t("candidates.withCv"),
        count: candidateCounts.withResume,
      },
      {
        id: "HAS_APPLICATIONS",
        label: t("candidates.hasApplications"),
        count: candidateCounts.hasApplications,
      },
      {
        id: "UNASSIGNED",
        label: t("candidates.unassigned"),
        count: candidateCounts.unassigned,
      },
    ],
    [t, candidateCounts],
  );

  const toggleCandidateFilter = (filterId: string) => {
    setCandidateFilter((prev) =>
      prev.includes(filterId)
        ? prev.filter((x) => x !== filterId)
        : [...prev, filterId],
    );
  };

  const filteredCandidateRows = useMemo(() => {
    return candidateRows.filter((c) => {
      if (candidateFilter.length > 0) {
        const hasCv = Boolean(
          c.resumeUrl || (c.resumeFileName && c.resumeFileName !== "—"),
        );
        const matchCv = candidateFilter.includes("WITH_RESUME") ? hasCv : false;
        const matchActive = candidateFilter.includes("HAS_APPLICATIONS")
          ? c.applicationsCount > 0
          : false;
        const matchUnassigned = candidateFilter.includes("UNASSIGNED")
          ? c.applicationsCount === 0
          : false;
        if (!matchCv && !matchActive && !matchUnassigned) return false;
      }
      if (selectedJobId !== "ALL") {
        const matched = c.candidate?.applications?.some(
          (a) => a.jobId === selectedJobId,
        );
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
    filteredCandidateRows,
    paginatedCandidates,
    secondaryFiltersCount,
    hasSecondaryFilters,
    handleResetFilters,
    handleSort,
  };
}
