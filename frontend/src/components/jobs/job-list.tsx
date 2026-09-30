"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  Columns3,
  MapPin,
  X,
  RotateCcw,
  Plus,
  ArrowRight,
  Share2,
  Check,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";
import { Button } from "../ui/button";
import { SlideOver } from "@/components/shared/slide-over";
import { CustomSelect } from "@/components/shared/custom-select";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { SegmentedTabs } from "@/components/shared/segmented-tabs";
import { usePersistedColumns } from "@/hooks/use-persisted-columns";
import type { Job, ApplicationStage } from "@/types";
import { JobStatusBadge } from "@/components/shared/job-status-badge";
import { usePipelineStages } from "@/lib/stages";
import { useI18n } from "@/i18n";
import { getJobPublicUrl } from "@/lib/utils";
import { getJobTypeLabel, getWorkplaceLabel, getExperienceLevelLabel } from "@/lib/jobs";


interface JobListProps {
  jobs: Job[];
  total?: number;
  statusCounts?: {
    all: number;
    published: number;
    draft: number;
    closed: number;
  };
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  search?: string;
  onSearchChange?: (search: string) => void;
  loading: boolean;
  onDeleteJob: (jobId: string) => void;
  statusFilter?: string;
  typeFilter?: string;
  expFilter?: string;
  workplaceFilter?: string;
  sortBy?: "created" | "title" | "applicants";
  sortOrder?: "desc" | "asc";
  onFilterChange?: (filters: {
    status?: string;
    type?: string;
    experience?: string;
    workplace?: string;
    sortBy?: "created" | "title" | "applicants";
    sortOrder?: "desc" | "asc";
  }) => void;
}

export function JobList({
  jobs,
  total,
  statusCounts,
  currentPage = 1,
  totalPages = 1,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
  search: propSearch,
  onSearchChange,
  loading: _loading,
  onDeleteJob,
  statusFilter,
  typeFilter,
  expFilter,
  workplaceFilter,
  sortBy: propSortBy,
  sortOrder: propSortOrder,
  onFilterChange,
}: JobListProps) {
  const router = useRouter();
  const { t } = useI18n();
  const pipelineStages = usePipelineStages();

  // Toolbar & View state (controlled or local)
  const [localSearch, setLocalSearch] = useState("");
  const search = onSearchChange && propSearch !== undefined ? propSearch : localSearch;
  const setSearch = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setLocalSearch(val);
    }
  };

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);

  // Column Visibility Toggle State persisted in localStorage
  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const columnsRef = useRef<HTMLDivElement>(null);
  const { columns: visibleColumns, toggleColumn } = usePersistedColumns(
    "haihire_jobs_columns_v1",
    {
      title: true,
      status: true,
      pipeline: true,
      applicants: true,
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

  // Single dispatch helper to update URL filters
  const handleFilterUpdate = (updates: {
    status?: string[];
    type?: string[];
    exp?: string[];
    workplace?: string[];
    sortBy?: "created" | "title" | "applicants";
    sortOrder?: "desc" | "asc";
  }) => {
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
  };

  const toggleFilter = (
    key: "status" | "type" | "exp" | "workplace",
    currentList: string[],
    val: string,
  ) => {
    const next = currentList.includes(val)
      ? currentList.filter((x) => x !== val)
      : [...currentList, val];
    handleFilterUpdate({ [key]: next });
  };

  const handleResetFilters = () => {
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
  };


  const secondaryFiltersCount =
    (typeFilters.length > 0 ? 1 : 0) +
    (expFilters.length > 0 ? 1 : 0) +
    (workplaceFilters.length > 0 ? 1 : 0) +
    (sortBy !== "created" || sortOrder !== "desc" ? 1 : 0);

  const statusTabs = useMemo(() => [
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
  ], [t, statusCounts, total, jobs.length]);

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

  // Stage count helper for a job
  const getJobStageCounts = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    const byStage = (job?.applicationsByStage || {}) as Record<string, number>;
    return {
      new: byStage.APPLIED || 0,
      screening: byStage.SCREENING || 0,
      interview: byStage.INTERVIEW || 0,
      offer: byStage.OFFER || 0,
      hired: byStage.HIRED || 0,
      rejected: byStage.REJECTED || 0,
      byStage: byStage as Record<ApplicationStage, number>,
      total: job?.applicationsCount || 0,
    };
  };

  const hasSecondaryFilters =
    typeFilters.length > 0 || expFilters.length > 0 || workplaceFilters.length > 0;

  return (
    <div className="space-y-4">
      {/* Modern Unified Responsive Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Quick Status Tabs (Smooth horizontal swipe on mobile/tablet) */}
        <SegmentedTabs
          multiSelect
          tabs={statusTabs}
          activeTabs={statusFilters}
          onToggleTab={(tabId) => toggleFilter("status", statusFilters, tabId)}
          onClearAll={() => handleFilterUpdate({ status: [] })}
        />

        {/* Right: Search Box (proportional) + Filters Button */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="flex-1 sm:w-64 md:w-72 sm:flex-initial">
            <SearchInput
              placeholder={t("jobs.searchJobs")}
              value={search}
              onChange={setSearch}
            />
          </div>

          {/* Columns Dropdown (Persisted in localStorage) */}
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
                  {t("jobs.toggleColumns")}
                </div>
                <div className="space-y-0.5 mt-1">
                  {[
                    { id: "title", label: t("jobs.columns.title"), locked: true },
                    { id: "status", label: t("jobs.columns.status") },
                    { id: "pipeline", label: t("jobs.columns.pipeline") },
                    { id: "applicants", label: t("jobs.columns.applicants") },
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
                            toggleColumn(col.id as keyof typeof visibleColumns)
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
          {typeFilters.map((tf) => (
            <span
              key={tf}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60 text-xs font-medium"
            >
              <span>{getJobTypeLabel(tf, t)}</span>
              <button
                type="button"
                onClick={() => toggleFilter("type", typeFilters, tf)}
                className="hover:text-blue-900 dark:hover:text-blue-100 cursor-pointer p-0.5"
                title="Remove filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {expFilters.map((ef) => (
            <span
              key={ef}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/60 text-xs font-medium"
            >
              <span>{getExperienceLevelLabel(ef, t)}</span>
              <button
                type="button"
                onClick={() => toggleFilter("exp", expFilters, ef)}
                className="hover:text-indigo-900 dark:hover:text-indigo-100 cursor-pointer p-0.5"
                title="Remove filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {workplaceFilters.map((wf) => (
            <span
              key={wf}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200/60 dark:border-teal-900/60 text-xs font-medium"
            >
              <span>{getWorkplaceLabel(wf, t)}</span>
              <button
                type="button"
                onClick={() => toggleFilter("workplace", workplaceFilters, wf)}
                className="hover:text-teal-900 dark:hover:text-teal-100 cursor-pointer p-0.5"
                title="Remove filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs font-semibold text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 underline cursor-pointer ml-1"
          >
            {t("jobs.resetAll")}
          </button>
        </div>
      )}

      {/* If No Matching Jobs from Search / Filters */}
      {filteredJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-white p-16 text-center dark:border-slate-800 dark:bg-slate-900 shadow-xs w-full my-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 mb-4">
            <Search className="h-8 w-8 stroke-[1.5]" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {t("jobs.noJobsFound")}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6">
            {t("jobs.noJobsDesc")}
          </p>
          <Button
            onClick={() => {
              setSearch("");
              handleResetFilters();
            }}
            variant="outline"
            className="h-9 text-xs font-semibold px-4 rounded-xl cursor-pointer"
          >
            {t("common.cancel")}
          </Button>
        </div>
      ) : (
        /* Unified Rich Table View matching Dashboard visual language */
        <div className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-5 min-w-[280px]">{t("jobs.jobTitle")}</th>
                  {visibleColumns.status && (
                    <th className="py-3.5 px-4 min-w-[110px]">{t("jobs.status")}</th>
                  )}
                  {visibleColumns.pipeline && (
                    <th className="py-3.5 px-4 min-w-[340px]">{t("dashboard.hiringPipeline")}</th>
                  )}
                  {visibleColumns.applicants && (
                    <th className="py-3.5 px-4 min-w-[130px]">{t("jobs.newApplicants")}</th>
                  )}
                  <th className="py-3.5 px-5 text-right min-w-[140px]">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredJobs.map((job) => {
                  const counts = getJobStageCounts(job.id);
                  const totalPipeline = counts.total;

                  return (
                    <tr
                      key={job.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* 1. Job Title & Meta (Always Visible) */}
                      <td className="py-4 px-5">
                        <div className="space-y-1">
                          <Link
                            href={`/dashboard/jobs/${job.id}/pipeline`}
                            className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors block"
                          >
                            {job.title}
                          </Link>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 flex-wrap">
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              {job.department || "General"}
                            </span>
                            <span>•</span>
                            <span>{getJobTypeLabel(job.type, t)}</span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-0.5">
                              <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                              {job.location || "Remote"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Status Badge */}
                      {visibleColumns.status && (
                        <td className="py-4 px-4 whitespace-nowrap">
                          <JobStatusBadge status={job.status} />
                        </td>
                      )}

                      {/* 3. Pipeline Funnel Progress Bar & Stage Pills (Exact Dashboard Design) */}
                      {visibleColumns.pipeline && (
                        <td className="py-4 px-4">
                          <div className="space-y-1.5 max-w-md">
                            {/* Multi-segment Progress Bar */}
                            <div className="h-1.5 w-full rounded-full bg-slate-200/70 dark:bg-slate-800 flex overflow-hidden">
                              {pipelineStages.map((stage) => {
                                const count = counts.byStage[stage.id] || 0;
                                const pct =
                                  totalPipeline > 0
                                    ? (count / totalPipeline) * 100
                                    : 0;
                                if (pct <= 0) return null;
                                return (
                                  <div
                                    key={stage.id}
                                    style={{ width: `${pct}%` }}
                                    className={`${stage.barColor} h-full`}
                                    title={`${stage.label}: ${count}`}
                                  />
                                );
                              })}
                            </div>

                            {/* 6 Stage Metric Pills */}
                            <div className="grid grid-cols-6 gap-1">
                              {pipelineStages.map((stage) => {
                                const count = counts.byStage[stage.id] || 0;
                                const displayLabel =
                                  stage.id === "OFFER" && stage.label.includes("Đề nghị")
                                    ? "Đề nghị"
                                    : stage.id === "APPLIED" && stage.label.includes("Đã nộp")
                                    ? "Đã nộp"
                                    : stage.id === "HIRED" && stage.label.includes("Đã tuyển")
                                    ? "Đã tuyển"
                                    : stage.label;

                                return (
                                  <div
                                    key={stage.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(
                                        `/dashboard/jobs/${job.id}/pipeline?stage=${stage.id}`,
                                      );
                                    }}
                                    className={`flex items-center justify-between px-1.5 py-1 rounded-md ${stage.cardBg} border ${stage.cardBorder} cursor-pointer ${stage.cardHover} transition-all hover:scale-[1.02]`}
                                    title={`${stage.label}: ${count}`}
                                  >
                                    <span
                                      className={`text-[9px] font-semibold ${stage.textColor} opacity-85 truncate mr-0.5`}
                                    >
                                      {displayLabel}
                                    </span>
                                    <span
                                      className={`text-[10.5px] font-black ${stage.textColor} shrink-0`}
                                    >
                                      {count}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      )}

                      {/* 4. New Applicants / To Review */}
                      {visibleColumns.applicants && (
                        <td className="py-4 px-4 whitespace-nowrap">
                          {counts.new > 0 ? (
                            <span
                              onClick={() =>
                                router.push(
                                  `/dashboard/jobs/${job.id}/pipeline?stage=APPLIED`,
                                )
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/60 cursor-pointer hover:bg-amber-100 transition-colors"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                              <span>
                                {counts.new} {t("jobs.newApplicants").toLowerCase()}
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 text-xs font-medium">
                              {counts.total} {t("pipeline.stageCounts")}
                            </span>
                          )}
                        </td>
                      )}

                      {/* 5. Actions */}
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (typeof window !== "undefined" && navigator.clipboard) {
                                navigator.clipboard.writeText(
                                  `${window.location.origin}${getJobPublicUrl(job)}`,
                                );
                                setCopiedJobId(job.id);
                                setTimeout(() => setCopiedJobId(null), 2000);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title={t("jobs.copyPublicApplyLink")}
                          >
                            {copiedJobId === job.id ? (
                              <Check className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Share2 className="h-4 w-4" />
                            )}
                          </button>

                          {/* Quick View (Pipeline/Overview) */}
                          <Link
                            href={`/dashboard/jobs/${job.id}/pipeline`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center"
                            title={t("common.view")}
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          {/* Quick Edit (Settings) */}
                          <Link
                            href={`/dashboard/jobs/${job.id}/settings`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center"
                            title={t("common.edit")}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>

                          {/* Quick Delete */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteJob(job.id);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer inline-flex items-center"
                            title={t("common.delete")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      {filteredJobs.length > 0 && (
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={total !== undefined ? total : filteredJobs.length}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50, 100]}
            onPageChange={(p) => onPageChange?.(p)}
            onPageSizeChange={(size) => onPageSizeChange?.(size)}
            itemLabel={t("nav.jobs").toLowerCase()}
          />
        </div>
      )}

      {/* Filter Sidebar Drawer (Screenshot 2) */}
      <SlideOver
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        maxWidth="max-w-sm"
        panelClassName="justify-between"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200/80 dark:border-slate-800 flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t("jobs.filterJobs")}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {t("jobs.filterJobsDesc")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body: Filter Sections */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
                {/* 1. STATUS */}
                <div className="space-y-2.5">
                  <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block">
                    {t("jobs.statusUpper")}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: "PUBLISHED", label: t("jobs.openStatus") },
                      { id: "DRAFT", label: t("jobs.draftStatus") },
                      { id: "CLOSED", label: t("jobs.closed") },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => toggleFilter("status", statusFilters, st.id)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          statusFilters.includes(st.id)
                            ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-xs"
                            : "bg-white text-slate-600 border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 hover:border-slate-300"
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. EMPLOYMENT TYPE */}
                <div className="space-y-2.5">
                  <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block">
                    {t("jobs.employmentTypeUpper")}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: "FULL_TIME", label: t("jobs.fullTime") },
                      { id: "PART_TIME", label: t("jobs.partTime") },
                      { id: "CONTRACT", label: t("jobs.contract") },
                      { id: "INTERNSHIP", label: t("jobs.internship") },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleFilter("type", typeFilters, item.id)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          typeFilters.includes(item.id)
                            ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-xs"
                            : "bg-white text-slate-600 border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 hover:border-slate-300"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. EXPERIENCE LEVEL */}
                <div className="space-y-2.5">
                  <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block">
                    {t("jobs.experienceLevelUpper")}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: "ENTRY_LEVEL", label: t("jobs.experience.junior") },
                      { id: "MID_LEVEL", label: t("jobs.experience.mid") },
                      { id: "SENIOR_LEVEL", label: t("jobs.experience.senior") },
                      { id: "LEAD", label: t("jobs.experience.lead") },
                      { id: "EXECUTIVE", label: t("jobs.experience.executive") },
                    ].map((exp) => (
                      <button
                        key={exp.id}
                        type="button"
                        onClick={() => toggleFilter("exp", expFilters, exp.id)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          expFilters.includes(exp.id)
                            ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-xs"
                            : "bg-white text-slate-600 border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 hover:border-slate-300"
                        }`}
                      >
                        {exp.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. WORK ARRANGEMENT */}
                <div className="space-y-2.5">
                  <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block">
                    {t("jobs.workArrangementUpper")}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: "REMOTE", label: t("jobs.workplace.remote") },
                      { id: "HYBRID", label: t("jobs.workplace.hybrid") },
                      { id: "ON_SITE", label: t("jobs.workplace.onsite") },
                    ].map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => toggleFilter("workplace", workplaceFilters, w.id)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          workplaceFilters.includes(w.id)
                            ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-xs"
                            : "bg-white text-slate-600 border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 hover:border-slate-300"
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. SORT BY */}
                <div className="space-y-2.5">
                  <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block">
                    {t("jobs.sortByUpper")}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <CustomSelect
                      value={sortBy}
                      onChange={(val) => handleFilterUpdate({ sortBy: val as "created" | "title" | "applicants" })}
                      options={[
                        { value: "created", label: t("jobs.dateCreated") },
                        { value: "title", label: t("jobs.jobTitle") },
                        { value: "applicants", label: t("jobs.applicants") },
                      ]}
                      className="w-full"
                      triggerClassName="h-9 text-xs font-normal bg-white dark:bg-slate-950 rounded-xl"
                    />

                    <CustomSelect
                      value={sortOrder}
                      onChange={(val) => handleFilterUpdate({ sortOrder: val as "desc" | "asc" })}
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
                    className="h-8 text-xs font-semibold gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    {t("jobs.saveAsView")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsFilterOpen(false)}
                    className="h-8 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900"
                  >
                    {t("jobs.done")}
                  </Button>
                </div>
        </div>
      </SlideOver>
    </div>
  );
}
