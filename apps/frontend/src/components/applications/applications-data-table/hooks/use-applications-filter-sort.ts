"use client";

import { useState, useMemo } from "react";
import type { Application, Job } from "@/types";
import type { SortField, SortDirection } from "../types";

interface UseApplicationsFilterSortProps {
  baseApplications: Application[];
  stageFilters: string[];
  fixedJobId?: string;
  currentJobFilter: string;
  scoreFilter: string;
  search: string;
  jobMap: Map<string, Job>;
  isServerPaginated: boolean;
  propTotalCount?: number;
  propTotalPages?: number;
  rowsPerPage: number;
  currentPage: number;
  setJobFilter: (val: string) => void;
  setScoreFilter: (val: string) => void;
  handleClearStages: () => void;
}

export function useApplicationsFilterSort({
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
}: UseApplicationsFilterSortProps) {
  const [sortField, setSortField] = useState<SortField>("applied");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const filteredApps = useMemo(() => {
    let list = baseApplications;
    if (stageFilters.length > 0) {
      list = list.filter((app) => stageFilters.includes(app.stage));
    }
    if (!fixedJobId && currentJobFilter !== "ALL") {
      list = list.filter((app) => String(app.jobId) === String(currentJobFilter));
    }
    if (scoreFilter !== "ALL") {
      list = list.filter((app) => {
        const score = typeof app.matchScore === "number" ? app.matchScore : 0;
        if (scoreFilter === "80" && score < 80) return false;
        if (scoreFilter === "60" && (score < 60 || score >= 80)) return false;
        if (scoreFilter === "BELOW_60" && score >= 60) return false;
        return true;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((app) => {
        const job = app.jobId ? jobMap.get(app.jobId) : null;
        return (
          app.candidateName.toLowerCase().includes(q) ||
          app.candidateEmail.toLowerCase().includes(q) ||
          (app.candidatePhone && app.candidatePhone.toLowerCase().includes(q)) ||
          (job && job.title.toLowerCase().includes(q))
        );
      });
    }
    return [...list].sort((a, b) => {
      let diff = 0;
      switch (sortField) {
        case "candidate":
          diff = a.candidateName.localeCompare(b.candidateName);
          break;
        case "email":
          diff = a.candidateEmail.localeCompare(b.candidateEmail);
          break;
        case "job": {
          const jobA = a.jobId ? jobMap.get(a.jobId)?.title || "" : "";
          const jobB = b.jobId ? jobMap.get(b.jobId)?.title || "" : "";
          diff = jobA.localeCompare(jobB);
          break;
        }
        case "status":
          diff = a.stage.localeCompare(b.stage);
          break;
        case "score":
          diff = (a.matchScore || 0) - (b.matchScore || 0);
          break;
        case "applied":
        default:
          diff =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDirection === "asc" ? diff : -diff;
    });
  }, [
    baseApplications,
    stageFilters,
    fixedJobId,
    currentJobFilter,
    scoreFilter,
    search,
    jobMap,
    sortField,
    sortDirection,
  ]);

  const secondaryFiltersCount =
    (currentJobFilter !== "ALL" && !fixedJobId ? 1 : 0) +
    (scoreFilter !== "ALL" ? 1 : 0);
  const hasSecondaryFilters = secondaryFiltersCount > 0;

  const handleResetFilters = () => {
    setJobFilter("ALL");
    setScoreFilter("ALL");
    handleClearStages();
    setSortField("applied");
    setSortDirection("desc");
  };

  const totalCount =
    isServerPaginated && propTotalCount !== undefined
      ? scoreFilter !== "ALL"
        ? filteredApps.length
        : propTotalCount
      : filteredApps.length;
  const totalPages =
    isServerPaginated && propTotalPages !== undefined
      ? scoreFilter !== "ALL"
        ? Math.max(1, Math.ceil(filteredApps.length / rowsPerPage))
        : propTotalPages
      : Math.max(1, Math.ceil(totalCount / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedApps =
    isServerPaginated && scoreFilter === "ALL"
      ? baseApplications
      : filteredApps.slice(startIndex, startIndex + rowsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return {
    sortField,
    sortDirection,
    handleSort,
    setSortField,
    setSortDirection,
    filteredApps,
    paginatedApps,
    totalCount,
    totalPages,
    secondaryFiltersCount,
    hasSecondaryFilters,
    handleResetFilters,
  };
}
