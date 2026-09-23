"use client";

import { useState, useMemo, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  X,
  RotateCcw,
  Plus,
  ArrowRight,
  Share2,
  Check,
} from "lucide-react";
import { Button } from "../ui/button";
import { SlideOver } from "@/components/shared/slide-over";
import { CustomSelect } from "@/components/shared/custom-select";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import type { Job, Application, ApplicationStage } from "@/types";
import { JobStatusBadge } from "@/components/shared/job-status-badge";
import { usePipelineStages } from "@/lib/stages";
import { useI18n } from "@/i18n";
import { getJobPublicUrl } from "@/lib/utils";
import { getJobTypeLabel, getWorkplaceLabel, getExperienceLevelLabel } from "@/lib/jobs";

type ViewMode = "grid" | "list" | "table";

interface JobListProps {
  jobs: Job[];
  total?: number;
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  search?: string;
  onSearchChange?: (search: string) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  applications?: Application[];
  loading: boolean;
  onViewCandidates: (jobId: string) => void;
  onOpenCreateJob: () => void;
  onDeleteJob: (jobId: string) => void;
}

export function JobList({
  jobs,
  total,
  currentPage = 1,
  totalPages = 1,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
  search: propSearch,
  onSearchChange,
  viewMode: propViewMode,
  onViewModeChange,
  applications: _applications = [],
  onViewCandidates: _onViewCandidates,
  _onOpenCreateJob,
}: JobListProps & { _onOpenCreateJob?: () => void }) {
  const router = useRouter();
  const { t, locale } = useI18n();
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

  const [localViewMode, setLocalViewMode] = useState<ViewMode>("grid");
  const viewMode = onViewModeChange && propViewMode !== undefined ? propViewMode : localViewMode;
  const setViewMode = (mode: ViewMode) => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    } else {
      setLocalViewMode(mode);
    }
  };

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);

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
    setList: Dispatch<SetStateAction<string[]>>,
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

        // Status filter (PUBLISHED, DRAFT, CLOSED)
        const matchStatus =
          statusFilters.length === 0 ||
          (job.status && statusFilters.includes(job.status)) ||
          (statusFilters.includes("CLOSED") && job.status === "ARCHIVED");

        // Employment type
        const matchType =
          typeFilters.length === 0 || (job.type && typeFilters.includes(job.type));

        // Experience level
        const matchExp =
          expFilters.length === 0 ||
          (job.experienceLevel && expFilters.includes(job.experienceLevel));

        // Workplace
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
        // default: created
        const aDate = new Date(a.createdAt).getTime();
        const bDate = new Date(b.createdAt).getTime();
        return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
      });
  }, [jobs, search, statusFilters, typeFilters, expFilters, workplaceFilters, sortBy, sortOrder]);

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

  return (
    <div className="space-y-5">
      {/* Top Control Bar matching screenshot */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Left: Search input */}
        <SearchInput
          placeholder={t("jobs.searchJobs")}
          value={search}
          onChange={setSearch}
        />

        {/* Right: Job count & Filters button */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {total !== undefined ? total : filteredJobs.length} {t("nav.jobs").toLowerCase()}
          </span>

          {/* Filters Button */}
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className="h-9 px-3.5 rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
            <span>{t("common.filter")}</span>
            {(statusFilters.length > 0 || typeFilters.length > 0 || expFilters.length > 0 || workplaceFilters.length > 0) && (
              <span className="h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                {statusFilters.length + typeFilters.length + expFilters.length + workplaceFilters.length}
              </span>
            )}
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
                  <th className="py-3.5 px-4 min-w-[110px]">{t("jobs.status")}</th>
                  <th className="py-3.5 px-4 min-w-[340px]">{t("dashboard.hiringPipeline")}</th>
                  <th className="py-3.5 px-4 min-w-[130px]">{t("jobs.newApplicants")}</th>
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
                      {/* 1. Job Title & Meta */}
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
                      <td className="py-4 px-4 whitespace-nowrap">
                        <JobStatusBadge status={job.status} />
                      </td>

                      {/* 3. Pipeline Funnel Progress Bar & Stage Pills (Exact Dashboard Design) */}
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

                      {/* 4. New Applicants / To Review */}
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

                      {/* 5. Actions */}
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
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

                          <Link
                            href={`/dashboard/jobs/${job.id}/pipeline`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
                          >
                            <span>{t("jobs.tabs.pipeline")}</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
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
                      { id: "FULL_TIME", label: t("jobs.fullTime") },
                      { id: "PART_TIME", label: t("jobs.partTime") },
                      { id: "CONTRACT", label: t("jobs.contract") },
                      { id: "INTERNSHIP", label: t("jobs.internship") },
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
                      { id: "ENTRY_LEVEL", label: t("jobs.experience.junior") },
                      { id: "MID_LEVEL", label: t("jobs.experience.mid") },
                      { id: "SENIOR_LEVEL", label: t("jobs.experience.senior") },
                      { id: "LEAD", label: t("jobs.experience.lead") },
                      { id: "EXECUTIVE", label: t("jobs.experience.executive") },
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
                      { id: "REMOTE", label: t("jobs.workplace.remote") },
                      { id: "HYBRID", label: t("jobs.workplace.hybrid") },
                      { id: "ON_SITE", label: t("jobs.workplace.onsite") },
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
                    <CustomSelect
                      value={sortBy}
                      onChange={(val) => setSortBy(val as "created" | "title" | "applicants")}
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
                      onChange={(val) => setSortOrder(val as "desc" | "asc")}
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
