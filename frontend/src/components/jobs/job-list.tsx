"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutGrid,
  List as ListIcon,
  Table,
  SlidersHorizontal,
  MapPin,
  Megaphone,
  X,
  RotateCcw,
  Plus,
  ChevronDown,
  ArrowUpDown,
  Eye,
  Sparkles,
} from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Job, Application, ApplicationStage } from "@/types";
import { usePipelineStages } from "@/lib/stages";
import { useI18n } from "@/i18n";

type ViewMode = "grid" | "list" | "table";

interface JobListProps {
  jobs: Job[];
  applications?: Application[];
  loading: boolean;
  onViewCandidates: (jobId: string) => void;
  onApply: (job: Job) => void;
  onOpenCreateJob: () => void;
  onDeleteJob: (jobId: string) => void;
}

export function JobList({
  jobs,
  applications = [],
  onViewCandidates: _onViewCandidates,
  _onOpenCreateJob,
}: JobListProps & { _onOpenCreateJob?: () => void }) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const pipelineStages = usePipelineStages();

  // Toolbar & View state
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filter criteria state
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [expFilters, setExpFilters] = useState<string[]>([]);
  const [workplaceFilters, setWorkplaceFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"created" | "title" | "applicants">("created");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Toggle filter pill helper
  const toggleFilter = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    val: string,
  ) => {
    if (list.includes(val)) {
      setList(list.filter((x) => x !== val));
    } else {
      setList([...list, val]);
    }
  };

  const handleResetFilters = () => {
    setStatusFilters([]);
    setTypeFilters([]);
    setExpFilters([]);
    setWorkplaceFilters([]);
    setSortBy("created");
    setSortOrder("desc");
  };

  // Filter & Sort jobs
  const filteredJobs = useMemo(() => {
    return jobs
      .filter((job) => {
        // Search text
        const matchSearch =
          !search ||
          job.title.toLowerCase().includes(search.toLowerCase()) ||
          job.location.toLowerCase().includes(search.toLowerCase()) ||
          job.description.toLowerCase().includes(search.toLowerCase());

        // Status filter
        const matchStatus =
          statusFilters.length === 0 ||
          (statusFilters.includes("Open") && job.status === "PUBLISHED") ||
          (statusFilters.includes("Draft") && job.status === "DRAFT") ||
          (statusFilters.includes("Closed") && job.status === "CLOSED") ||
          (statusFilters.includes("Archived") && job.status === "ARCHIVED");

        // Employment type
        const matchType =
          typeFilters.length === 0 ||
          (typeFilters.includes("Full-time") && job.type === "FULL_TIME") ||
          (typeFilters.includes("Part-time") && job.type === "PART_TIME") ||
          (typeFilters.includes("Contract") && job.type === "CONTRACT") ||
          (typeFilters.includes("Internship") && job.type === "INTERNSHIP");

        return matchSearch && matchStatus && matchType;
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
        // default: created
        const aDate = new Date(a.createdAt).getTime();
        const bDate = new Date(b.createdAt).getTime();
        return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
      });
  }, [jobs, search, statusFilters, typeFilters, sortBy, sortOrder]);

  // Stage count helper for a job
  const getJobStageCounts = (jobId: string) => {
    const jobApps = applications.filter((a) => a.jobId === jobId);
    const byStage: Record<ApplicationStage, number> = {
      APPLIED: 0,
      SCREENING: 0,
      INTERVIEW: 0,
      OFFER: 0,
      HIRED: 0,
      REJECTED: 0,
    };
    for (const a of jobApps) {
      if (byStage[a.stage] !== undefined) {
        byStage[a.stage]++;
      }
    }
    return {
      new: byStage.APPLIED,
      screening: byStage.SCREENING,
      interview: byStage.INTERVIEW,
      offer: byStage.OFFER,
      hired: byStage.HIRED,
      rejected: byStage.REJECTED,
      byStage,
      total: jobApps.length,
    };
  };

  return (
    <div className="space-y-5">
      {/* Top Control Bar matching screenshot */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Left: Search input */}
        <div className="relative flex-1 min-w-0 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder={t("jobs.searchJobs")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 text-xs bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xs w-full"
          />
        </div>

        {/* Right: Views dropdown, 3 View toggles & Filters button */}
        <div className="flex items-center gap-2">
          {/* Views Dropdown */}
          <div className="relative">
            <button
              type="button"
              disabled
              className="h-9 px-3 rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1.5 opacity-50 cursor-not-allowed shadow-xs"
              title="Views (Coming soon)"
            >
              <span>Views</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 opacity-70" />
            </button>
          </div>

          {/* 3 View Switcher Toggles */}
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/80 dark:border-slate-700">
            {/* View 1: Grid Cards */}
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              title="Grid view"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>

            {/* View 2: List View (Full-width Stacked Cards) */}
            <button
              type="button"
              onClick={() => setViewMode("list")}
              title="List view"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <ListIcon className="h-4 w-4" />
            </button>

            {/* View 3: Table View (Data Table) */}
            <button
              type="button"
              onClick={() => setViewMode("table")}
              title="Table view"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <Table className="h-4 w-4" />
            </button>
          </div>

          {/* Filters Button */}
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className="h-9 px-3.5 rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
            <span>{t("common.filter")}</span>
          </button>
        </div>
      </div>

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
            Try adjusting your search query or filters to find what you&apos;re looking for.
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
        <>
          {/* VIEW 1: GRID CARDS VIEW (Screenshot 1) */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredJobs.map((job) => {
            const counts = getJobStageCounts(job.id);

            return (
              <div
                key={job.id}
                className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                {/* Header Row: Title & Open Badge */}
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      onClick={() => router.push(`/dashboard/jobs/${job.id}/pipeline`)}
                      className="text-xs font-bold text-slate-900 dark:text-white hover:text-blue-600 transition-colors cursor-pointer leading-snug"
                    >
                      {job.title}
                    </h3>
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900/60">
                      {job.status === "PUBLISHED" ? t("jobs.active") : t("jobs.draft")}
                    </span>
                  </div>

                  {/* Sub-row: Type & Location */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span>
                      {job.type === "FULL_TIME"
                        ? t("jobs.fullTime")
                        : job.type === "PART_TIME"
                          ? t("jobs.partTime")
                          : job.type === "CONTRACT"
                            ? t("jobs.contract")
                            : t("jobs.internship")}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5 truncate">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      {job.location || job.department || "Remote"}
                    </span>
                  </div>
                </div>

                {/* 6 Stage Metric Cards in 3x2 or 6x1 Grid */}
                <div className="grid grid-cols-6 gap-1 pt-1">
                  {pipelineStages.map((stage) => {
                    const count = counts.byStage[stage.id] || 0;
                    return (
                      <div
                        key={stage.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/jobs/${job.id}/pipeline?stage=${stage.id}`);
                        }}
                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg ${stage.cardBg} border ${stage.cardBorder} cursor-pointer ${stage.cardHover} transition-colors text-center`}
                      >
                        <span
                          className={`text-xs font-bold ${stage.textColor}`}
                        >
                          {count}
                        </span>
                        <span
                          className={`text-[9px] font-semibold ${stage.textColor} opacity-80`}
                        >
                          {stage.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Row: Applicant count & Promote / Review button */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  {counts.total === 0 ? (
                    <>
                      <span className="text-slate-400 text-[11px]">
                        {t("jobs.noApplicantsYet")}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (typeof window !== "undefined" && navigator.clipboard) {
                            navigator.clipboard.writeText(
                              `${window.location.origin}/dashboard/jobs/${job.id}/pipeline`,
                            );
                          }
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Megaphone className="h-3 w-3" />
                        <span>{t("jobs.promote")}</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                        {counts.new > 0
                          ? t("jobs.applicantsUnviewed", {
                              count: counts.new,
                              plural: counts.new > 1 ? "s" : "",
                            })
                          : t("jobs.applicantsInPipeline", {
                              count: counts.total,
                              plural: counts.total > 1 ? "s" : "",
                            })}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(
                            `/dashboard/jobs/${job.id}/pipeline${counts.new > 0 ? "?stage=APPLIED" : ""}`,
                          );
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>{t("jobs.review")}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: LIST VIEW (Full-width Stacked Cards) */}
      {viewMode === "list" && (
        <div className="space-y-4">
          {filteredJobs.map((job) => {
            const counts = getJobStageCounts(job.id);

            return (
              <div
                key={job.id}
                className={`rounded-2xl border ${
                  counts.new > 0
                    ? "border-amber-200/90 dark:border-amber-900/60"
                    : "border-slate-200/90 dark:border-slate-800"
                } bg-white p-6 shadow-xs dark:bg-slate-900 space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all`}
              >
                {/* Top Row: Title & Open Badge */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3
                        onClick={() => router.push(`/dashboard/jobs/${job.id}/pipeline`)}
                        className="text-sm font-bold text-slate-900 dark:text-white hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        {job.title}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900/60">
                        {job.status === "PUBLISHED" ? t("jobs.openStatus") : t("jobs.draftStatus")}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span>
                        {job.type === "FULL_TIME"
                          ? t("jobs.fullTime")
                          : job.type === "PART_TIME"
                            ? t("jobs.partTime")
                            : job.type === "CONTRACT"
                              ? t("jobs.contract")
                              : t("jobs.internship")}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {job.location || job.department || "Remote"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Spanning 6 Stages Across Width */}
                <div className="grid grid-cols-6 gap-2 pt-1">
                  {pipelineStages.map((stage) => {
                    const count = counts.byStage[stage.id] || 0;
                    return (
                      <div
                        key={stage.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/jobs/${job.id}/pipeline?stage=${stage.id}`);
                        }}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl ${stage.cardBg} border ${stage.cardBorder} cursor-pointer ${stage.cardHover} transition-colors text-center`}
                      >
                        <span
                          className={`text-xs font-bold ${stage.textColor}`}
                        >
                          {count}
                        </span>
                        <span
                          className={`text-[10px] font-semibold ${stage.textColor} opacity-80 mt-0.5`}
                        >
                          {stage.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Row in List View: Applicant count & Review in Pipeline / Promote */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  {counts.total === 0 ? (
                    <>
                      <span className="text-slate-400 text-xs">
                        {t("jobs.noApplicantsYet")}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (typeof window !== "undefined" && navigator.clipboard) {
                            navigator.clipboard.writeText(
                              `${window.location.origin}/dashboard/jobs/${job.id}/pipeline`,
                            );
                          }
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Megaphone className="h-3 w-3" />
                        <span>{t("jobs.promote")}</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-amber-600 dark:text-amber-400 font-medium text-xs">
                        {counts.new > 0
                          ? t("jobs.applicantsUnviewed", {
                              count: counts.new,
                              plural: counts.new > 1 ? "s" : "",
                            })
                          : t("jobs.applicantsInPipeline", {
                              count: counts.total,
                              plural: counts.total > 1 ? "s" : "",
                            })}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(
                            `/dashboard/jobs/${job.id}/pipeline${counts.new > 0 ? "?stage=APPLIED" : ""}`,
                          );
                        }}
                        className="h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>{t("jobs.reviewInPipeline")}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 3: TABLE VIEW (Data Table) */}
      {viewMode === "table" && (
        <div className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-[11px] font-semibold text-slate-500">
                <tr>
                  <th className="py-3 px-4">
                    <span className="flex items-center gap-1">
                      {t("jobs.jobTitle")} <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="py-3 px-4">
                    <span className="flex items-center gap-1">
                      {t("jobs.status")} <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="py-3 px-4">
                    <span className="flex items-center gap-1">
                      {t("jobs.type")} <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="py-3 px-4">
                    <span className="flex items-center gap-1">
                      {t("jobs.location")} <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="py-3 px-4">
                    <span className="flex items-center gap-1">
                      {t("jobs.newApplicants")} <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="py-3 px-4">
                    <span className="flex items-center gap-1">
                      {t("jobs.activePipeline")} <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="py-3 px-4">
                    <span className="flex items-center gap-1">
                      {t("candidates.columns.added")} <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredJobs.map((job) => {
                  const counts = getJobStageCounts(job.id);
                  const activeCounts = counts.new + counts.screening + counts.interview + counts.offer;
                  const dateStr = new Date(job.createdAt).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US");

                  return (
                    <tr
                      key={job.id}
                      onClick={() => router.push(`/dashboard/jobs/${job.id}/pipeline`)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {job.title}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900/60">
                          {job.status === "PUBLISHED" ? t("jobs.active") : t("jobs.draft")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {job.type === "FULL_TIME"
                          ? t("jobs.fullTime")
                          : job.type === "PART_TIME"
                            ? t("jobs.partTime")
                            : job.type === "CONTRACT"
                              ? t("jobs.contract")
                              : t("jobs.internship")}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {job.location || job.department || "Remote"}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        {counts.new}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        {activeCounts}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {dateStr}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )}

      {/* Total Job Count Footer */}
      <div className="pt-2 text-xs text-slate-400">
        {t("jobs.totalJobsCount", {
          count: filteredJobs.length,
          plural: filteredJobs.length > 1 ? "s" : "",
        })}
      </div>

      {/* Filter Sidebar Drawer (Screenshot 2) */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            onClick={() => setIsFilterOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          />

          {/* Slide-over Container */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-sm bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between">
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
                      { id: "Open", label: t("jobs.openStatus") },
                      { id: "Draft", label: t("jobs.draftStatus") },
                      { id: "Closed", label: t("jobs.closedStatus") },
                      { id: "Archived", label: t("jobs.closed") },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => toggleFilter(statusFilters, setStatusFilters, st.id)}
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
                      { id: "Full-time", label: t("jobs.fullTime") },
                      { id: "Part-time", label: t("jobs.partTime") },
                      { id: "Contract", label: t("jobs.contract") },
                      { id: "Internship", label: t("jobs.internship") },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleFilter(typeFilters, setTypeFilters, item.id)}
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
                      { id: "Junior", label: t("jobs.experience.junior") },
                      { id: "Mid", label: t("jobs.experience.mid") },
                      { id: "Senior", label: t("jobs.experience.senior") },
                      { id: "Lead", label: t("jobs.experience.lead") },
                    ].map((exp) => (
                      <button
                        key={exp.id}
                        type="button"
                        onClick={() => toggleFilter(expFilters, setExpFilters, exp.id)}
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
                      { id: "Remote", label: t("jobs.workplace.remote") },
                      { id: "Hybrid", label: t("jobs.workplace.hybrid") },
                      { id: "On-site", label: t("jobs.workplace.onsite") },
                    ].map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => toggleFilter(workplaceFilters, setWorkplaceFilters, w.id)}
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
                    <Select
                      value={sortBy}
                      onValueChange={(val) => val && setSortBy(val as "created" | "title" | "applicants")}
                    >
                      <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-950">
                        <SelectValue placeholder={t("jobs.dateCreated")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created" className="text-xs">
                          {t("jobs.dateCreated")}
                        </SelectItem>
                        <SelectItem value="title" className="text-xs">
                          {t("jobs.jobTitle")}
                        </SelectItem>
                        <SelectItem value="applicants" className="text-xs">
                          {t("jobs.applicants")}
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={sortOrder}
                      onValueChange={(val) => val && setSortOrder(val as "desc" | "asc")}
                    >
                      <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-950">
                        <SelectValue placeholder={t("jobs.descending")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc" className="text-xs">
                          {t("jobs.descending")}
                        </SelectItem>
                        <SelectItem value="asc" className="text-xs">
                          {t("jobs.ascending")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
