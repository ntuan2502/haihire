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
import type { Job, Application } from "@/types";

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
  onViewCandidates,
  _onOpenCreateJob,
}: JobListProps & { _onOpenCreateJob?: () => void }) {
  const router = useRouter();

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
    return {
      new: jobApps.filter((a) => a.stage === "APPLIED").length,
      screening: jobApps.filter((a) => a.stage === "SCREENING").length,
      interview: jobApps.filter((a) => a.stage === "INTERVIEW").length,
      offer: jobApps.filter((a) => a.stage === "OFFER").length,
      hired: jobApps.filter((a) => a.stage === "HIRED").length,
      rejected: jobApps.filter((a) => a.stage === "REJECTED").length,
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
            placeholder="Search jobs by title, location, or description"
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
              className="h-9 px-3 rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
            >
              <span>Views</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
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
            <span>Filters</span>
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
            No matching jobs found
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
            Clear Search &amp; Filters
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
                      onClick={() => router.push(`/dashboard/candidates?jobId=${job.id}`)}
                      className="text-xs font-bold text-slate-900 dark:text-white hover:text-blue-600 transition-colors cursor-pointer leading-snug"
                    >
                      {job.title}
                    </h3>
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900/60">
                      {job.status === "PUBLISHED" ? "Open" : "Draft"}
                    </span>
                  </div>

                  {/* Sub-row: Type & Location */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span>
                      {job.type === "FULL_TIME"
                        ? "Full-time"
                        : job.type === "PART_TIME"
                          ? "Part-time"
                          : job.type === "CONTRACT"
                            ? "Contract"
                            : "Internship"}
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
                  <div
                    onClick={() => onViewCandidates(job.id)}
                    className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 cursor-pointer hover:bg-blue-100/70 transition-colors text-center"
                  >
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      {counts.new}
                    </span>
                    <span className="text-[9px] font-semibold text-blue-600/80 dark:text-blue-400/80">
                      New
                    </span>
                  </div>

                  <div
                    onClick={() => onViewCandidates(job.id)}
                    className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/40 cursor-pointer hover:bg-purple-100/70 transition-colors text-center"
                  >
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                      {counts.screening}
                    </span>
                    <span className="text-[9px] font-semibold text-purple-600/80 dark:text-purple-400/80">
                      Screening
                    </span>
                  </div>

                  <div
                    onClick={() => onViewCandidates(job.id)}
                    className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 cursor-pointer hover:bg-amber-100/70 transition-colors text-center"
                  >
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      {counts.interview}
                    </span>
                    <span className="text-[9px] font-semibold text-amber-600/80 dark:text-amber-400/80">
                      Interview
                    </span>
                  </div>

                  <div
                    onClick={() => onViewCandidates(job.id)}
                    className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-teal-50/70 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/40 cursor-pointer hover:bg-teal-100/70 transition-colors text-center"
                  >
                    <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                      {counts.offer}
                    </span>
                    <span className="text-[9px] font-semibold text-teal-600/80 dark:text-teal-400/80">
                      Offer
                    </span>
                  </div>

                  <div
                    onClick={() => onViewCandidates(job.id)}
                    className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 cursor-pointer hover:bg-emerald-100/70 transition-colors text-center"
                  >
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {counts.hired}
                    </span>
                    <span className="text-[9px] font-semibold text-emerald-600/80 dark:text-emerald-400/80">
                      Hired
                    </span>
                  </div>

                  <div
                    onClick={() => onViewCandidates(job.id)}
                    className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:bg-slate-200/60 transition-colors text-center"
                  >
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {counts.rejected}
                    </span>
                    <span className="text-[9px] text-slate-500 dark:text-slate-400">
                      Rejected
                    </span>
                  </div>
                </div>

                {/* Bottom Row: Applicant count & Promote button */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <span className="text-slate-400 text-[11px]">
                    {counts.total === 0
                      ? "No applicants yet"
                      : `${counts.total} applicant${counts.total > 1 ? "s" : ""}`}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined" && navigator.clipboard) {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/dashboard/jobs`,
                        );
                      }
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Megaphone className="h-3 w-3" />
                    <span>Promote</span>
                  </button>
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
                className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                {/* Top Row: Title & Open Badge */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3
                        onClick={() => router.push(`/dashboard/candidates?jobId=${job.id}`)}
                        className="text-sm font-bold text-slate-900 dark:text-white hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        {job.title}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900/60">
                        {job.status === "PUBLISHED" ? "Open" : "Draft"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span>
                        {job.type === "FULL_TIME"
                          ? "Full-time"
                          : job.type === "PART_TIME"
                            ? "Part-time"
                            : job.type === "CONTRACT"
                              ? "Contract"
                              : "Internship"}
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
                  <div
                    onClick={() => onViewCandidates(job.id)}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 cursor-pointer hover:bg-blue-100/70 transition-colors text-center"
                  >
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      {counts.new}
                    </span>
                    <span className="text-[10px] font-semibold text-blue-600/80 dark:text-blue-400/80 mt-0.5">
                      New
                    </span>
                  </div>

                  <div
                    onClick={() => onViewCandidates(job.id)}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/40 cursor-pointer hover:bg-purple-100/70 transition-colors text-center"
                  >
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                      {counts.screening}
                    </span>
                    <span className="text-[10px] font-semibold text-purple-600/80 dark:text-purple-400/80 mt-0.5">
                      Screening
                    </span>
                  </div>

                  <div
                    onClick={() => onViewCandidates(job.id)}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 cursor-pointer hover:bg-amber-100/70 transition-colors text-center"
                  >
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      {counts.interview}
                    </span>
                    <span className="text-[10px] font-semibold text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                      Interview
                    </span>
                  </div>

                  <div
                    onClick={() => onViewCandidates(job.id)}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/40 cursor-pointer hover:bg-teal-100/70 transition-colors text-center"
                  >
                    <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                      {counts.offer}
                    </span>
                    <span className="text-[10px] font-semibold text-teal-600/80 dark:text-teal-400/80 mt-0.5">
                      Offer
                    </span>
                  </div>

                  <div
                    onClick={() => onViewCandidates(job.id)}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 cursor-pointer hover:bg-emerald-100/70 transition-colors text-center"
                  >
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {counts.hired}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                      Hired
                    </span>
                  </div>

                  <div
                    onClick={() => onViewCandidates(job.id)}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:bg-slate-200/60 transition-colors text-center"
                  >
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {counts.rejected}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Rejected
                    </span>
                  </div>
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
                      Title <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="py-3 px-4">
                    <span className="flex items-center gap-1">
                      Status <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="py-3 px-4">
                    <span className="flex items-center gap-1">
                      Type <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="py-3 px-4">
                    <span className="flex items-center gap-1">
                      Location <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="py-3 px-4">
                    <span className="flex items-center gap-1">
                      New <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="py-3 px-4">
                    <span className="flex items-center gap-1">
                      Active <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="py-3 px-4">
                    <span className="flex items-center gap-1">
                      Created <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredJobs.map((job) => {
                  const counts = getJobStageCounts(job.id);
                  const activeCounts = counts.new + counts.screening + counts.interview + counts.offer;
                  const dateStr = new Date(job.createdAt).toLocaleDateString("en-US");

                  return (
                    <tr
                      key={job.id}
                      onClick={() => router.push(`/dashboard/candidates?jobId=${job.id}`)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {job.title}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900/60">
                          {job.status === "PUBLISHED" ? "Open" : "Draft"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {job.type === "FULL_TIME"
                          ? "Full-time"
                          : job.type === "PART_TIME"
                            ? "Part-time"
                            : job.type === "CONTRACT"
                              ? "Contract"
                              : "Internship"}
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
        {filteredJobs.length} job{filteredJobs.length > 1 ? "s" : ""} total
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
                    Filter jobs
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Customize your view, then save it for quick access.
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
                    STATUS
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["Open", "Draft", "Closed", "Archived"].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => toggleFilter(statusFilters, setStatusFilters, st)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          statusFilters.includes(st)
                            ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-xs"
                            : "bg-white text-slate-600 border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 hover:border-slate-300"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. EMPLOYMENT TYPE */}
                <div className="space-y-2.5">
                  <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block">
                    EMPLOYMENT TYPE
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["Full-time", "Part-time", "Contract", "Internship"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleFilter(typeFilters, setTypeFilters, t)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          typeFilters.includes(t)
                            ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-xs"
                            : "bg-white text-slate-600 border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 hover:border-slate-300"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. EXPERIENCE LEVEL */}
                <div className="space-y-2.5">
                  <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block">
                    EXPERIENCE LEVEL
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["Junior", "Mid", "Senior", "Lead"].map((exp) => (
                      <button
                        key={exp}
                        type="button"
                        onClick={() => toggleFilter(expFilters, setExpFilters, exp)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          expFilters.includes(exp)
                            ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-xs"
                            : "bg-white text-slate-600 border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 hover:border-slate-300"
                        }`}
                      >
                        {exp}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. WORK ARRANGEMENT */}
                <div className="space-y-2.5">
                  <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block">
                    WORK ARRANGEMENT
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["Remote", "Hybrid", "On-site"].map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => toggleFilter(workplaceFilters, setWorkplaceFilters, w)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          workplaceFilters.includes(w)
                            ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-xs"
                            : "bg-white text-slate-600 border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 hover:border-slate-300"
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. SORT BY */}
                <div className="space-y-2.5">
                  <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block">
                    SORT BY
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={sortBy}
                      onValueChange={(val) => val && setSortBy(val as "created" | "title" | "applicants")}
                    >
                      <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-950">
                        <SelectValue placeholder="Date created" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created" className="text-xs">
                          Date created
                        </SelectItem>
                        <SelectItem value="title" className="text-xs">
                          Title
                        </SelectItem>
                        <SelectItem value="applicants" className="text-xs">
                          Applicants
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={sortOrder}
                      onValueChange={(val) => val && setSortOrder(val as "desc" | "asc")}
                    >
                      <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-950">
                        <SelectValue placeholder="Descending" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc" className="text-xs">
                          Descending
                        </SelectItem>
                        <SelectItem value="asc" className="text-xs">
                          Ascending
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
                  <span>Reset all</span>
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
                    Save as view
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsFilterOpen(false)}
                    className="h-8 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900"
                  >
                    Done
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
