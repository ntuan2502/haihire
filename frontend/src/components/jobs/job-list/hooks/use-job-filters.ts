import { useState, useMemo, useCallback } from "react";
import type { Job } from "@/types";
import type { JobListProps, JobFilterCriteria } from "../types";
import { useI18n } from "@/i18n";

export interface UseJobFiltersOptions {
  jobs: Job[];
  total?: number;
  statusCounts?: JobListProps["statusCounts"];
  search?: string;
  onSearchChange?: (search: string) => void;
  statusFilter?: string;
  typeFilter?: string;
  expFilter?: string;
  workplaceFilter?: string;
  sortBy?: "created" | "title" | "applicants";
  sortOrder?: "desc" | "asc";
  onPageChange?: (page: number) => void;
  onFilterChange?: JobListProps["onFilterChange"];
}

export function useJobFilters({
  jobs,
  total,
  statusCounts,
  search: propSearch,
  onSearchChange,
  statusFilter,
  typeFilter,
  expFilter,
  workplaceFilter,
  sortBy: propSortBy,
  sortOrder: propSortOrder,
  onPageChange,
  onFilterChange,
}: UseJobFiltersOptions) {
  const { t } = useI18n();

  // Search state (controlled or local fallback)
  const [localSearch, setLocalSearch] = useState("");
  const search = onSearchChange && propSearch !== undefined ? propSearch : localSearch;
  const setSearch = useCallback(
    (val: string) => {
      if (onSearchChange) {
        onSearchChange(val);
      } else {
        setLocalSearch(val);
      }
    },
    [onSearchChange],
  );

  // Filter criteria state - synchronized with URL via props or local fallback
  const [localStatusFilters, setLocalStatusFilters] = useState<string[]>([]);
  const statusFilters = useMemo(
    () => (statusFilter !== undefined ? (statusFilter ? statusFilter.split(",") : []) : localStatusFilters),
    [statusFilter, localStatusFilters],
  );

  const [localTypeFilters, setLocalTypeFilters] = useState<string[]>([]);
  const typeFilters = useMemo(
    () => (typeFilter !== undefined ? (typeFilter ? typeFilter.split(",") : []) : localTypeFilters),
    [typeFilter, localTypeFilters],
  );

  const [localExpFilters, setLocalExpFilters] = useState<string[]>([]);
  const expFilters = useMemo(
    () => (expFilter !== undefined ? (expFilter ? expFilter.split(",") : []) : localExpFilters),
    [expFilter, localExpFilters],
  );

  const [localWorkplaceFilters, setLocalWorkplaceFilters] = useState<string[]>([]);
  const workplaceFilters = useMemo(
    () => (workplaceFilter !== undefined ? (workplaceFilter ? workplaceFilter.split(",") : []) : localWorkplaceFilters),
    [workplaceFilter, localWorkplaceFilters],
  );

  const [localSortBy, setLocalSortBy] = useState<"created" | "title" | "applicants">("created");
  const sortBy = propSortBy || localSortBy;

  const [localSortOrder, setLocalSortOrder] = useState<"desc" | "asc">("desc");
  const sortOrder = propSortOrder || localSortOrder;

  const handleFilterUpdate = useCallback(
    (updates: JobFilterCriteria) => {
      const nextStatus = updates.status !== undefined ? updates.status : statusFilters;
      const nextType = updates.type !== undefined ? updates.type : typeFilters;
      const nextExp = updates.exp !== undefined ? updates.exp : expFilters;
      const nextWorkplace = updates.workplace !== undefined ? updates.workplace : workplaceFilters;
      const nextSortBy = updates.sortBy !== undefined ? updates.sortBy : sortBy;
      const nextSortOrder = updates.sortOrder !== undefined ? updates.sortOrder : sortOrder;

      if (onFilterChange) {
        onFilterChange({
          status: nextStatus.length > 0 ? nextStatus.join(",") : undefined,
          type: nextType.length > 0 ? nextType.join(",") : undefined,
          experience: nextExp.length > 0 ? nextExp.join(",") : undefined,
          workplace: nextWorkplace.length > 0 ? nextWorkplace.join(",") : undefined,
          sortBy: nextSortBy,
          sortOrder: nextSortOrder,
        });
      } else {
        setLocalStatusFilters(nextStatus);
        setLocalTypeFilters(nextType);
        setLocalExpFilters(nextExp);
        setLocalWorkplaceFilters(nextWorkplace);
        setLocalSortBy(nextSortBy);
        setLocalSortOrder(nextSortOrder);
      }
    },
    [statusFilters, typeFilters, expFilters, workplaceFilters, sortBy, sortOrder, onFilterChange],
  );

  const toggleFilter = useCallback(
    (key: "status" | "type" | "exp" | "workplace", currentList: string[], val: string) => {
      const next = currentList.includes(val)
        ? currentList.filter((x) => x !== val)
        : [...currentList, val];
      handleFilterUpdate({ [key]: next });
    },
    [handleFilterUpdate],
  );

  const handleResetFilters = useCallback(() => {
    if (onFilterChange) {
      onFilterChange({
        status: undefined,
        type: undefined,
        experience: undefined,
        workplace: undefined,
        sortBy: "created",
        sortOrder: "desc",
      });
    } else {
      setLocalStatusFilters([]);
      setLocalTypeFilters([]);
      setLocalExpFilters([]);
      setLocalWorkplaceFilters([]);
      setLocalSortBy("created");
      setLocalSortOrder("desc");
    }
  }, [onFilterChange]);

  const secondaryFiltersCount =
    (typeFilters.length > 0 ? 1 : 0) +
    (expFilters.length > 0 ? 1 : 0) +
    (workplaceFilters.length > 0 ? 1 : 0) +
    (sortBy !== "created" || sortOrder !== "desc" ? 1 : 0);

  const hasSecondaryFilters =
    typeFilters.length > 0 || expFilters.length > 0 || workplaceFilters.length > 0;

  const statusTabs = useMemo(
    () => [
      {
        id: "ALL",
        label: t("common.all"),
        count: statusCounts?.all ?? (total !== undefined ? total : jobs.length),
      },
      {
        id: "PUBLISHED",
        label: t("jobs.openStatus"),
        count: statusCounts?.published,
      },
      {
        id: "DRAFT",
        label: t("jobs.draftStatus"),
        count: statusCounts?.draft,
      },
      {
        id: "CLOSED",
        label: t("jobs.closed"),
        count: statusCounts?.closed,
      },
    ],
    [t, statusCounts, total, jobs.length],
  );

  // If server-side filtered, `jobs` is already processed by backend API.
  // Fallback to client-side filtering only when not server-paginated.
  const filteredJobs = useMemo(() => {
    if (onPageChange) {
      return jobs;
    }
    return jobs
      .filter((job) => {
        const matchSearch =
          !search ||
          job.title.toLowerCase().includes(search.toLowerCase()) ||
          job.location.toLowerCase().includes(search.toLowerCase()) ||
          job.description.toLowerCase().includes(search.toLowerCase());

        const matchStatus =
          statusFilters.length === 0 ||
          (job.status && statusFilters.includes(job.status)) ||
          (statusFilters.includes("CLOSED") && job.status === "ARCHIVED");

        const matchType =
          typeFilters.length === 0 || (job.type && typeFilters.includes(job.type));

        const matchExp =
          expFilters.length === 0 ||
          (job.experienceLevel && expFilters.includes(job.experienceLevel));

        const matchWorkplace =
          workplaceFilters.length === 0 ||
          (job.workplace && workplaceFilters.includes(job.workplace));

        return matchSearch && matchStatus && matchType && matchExp && matchWorkplace;
      })
      .sort((a, b) => {
        if (sortBy === "title") {
          return sortOrder === "asc"
            ? a.title.localeCompare(b.title)
            : b.title.localeCompare(a.title);
        }
        if (sortBy === "applicants") {
          const aCount = a.applicationsCount || 0;
          const bCount = b.applicationsCount || 0;
          return sortOrder === "asc" ? aCount - bCount : bCount - aCount;
        }
        const aDate = new Date(a.createdAt).getTime();
        const bDate = new Date(b.createdAt).getTime();
        return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
      });
  }, [jobs, onPageChange, search, statusFilters, typeFilters, expFilters, workplaceFilters, sortBy, sortOrder]);

  return {
    search,
    setSearch,
    statusFilters,
    typeFilters,
    expFilters,
    workplaceFilters,
    sortBy,
    sortOrder,
    handleFilterUpdate,
    toggleFilter,
    handleResetFilters,
    secondaryFiltersCount,
    hasSecondaryFilters,
    statusTabs,
    filteredJobs,
  };
}
