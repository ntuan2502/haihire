"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { ApplyModal } from "@/components/applications/apply-modal";
import { CreateJobModal } from "@/components/jobs/create-job-modal";
import { useAuth } from "@/context/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useJobs, useAllApplications } from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Search,
  Calendar,
  Clock,
  List,
  Mail,
  Phone,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import {
  getInitials,
  formatDate,
  formatRelativeTime,
  getCandidateDisplayName,
} from "@/lib/utils";

type FilterStatus = "ALL" | "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
type ViewMode = "list" | "timeline";

function InterviewsPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: jobs = [], isLoading: jobsLoading } = useJobs(
    user?.organizationId,
  );
  const { data: rawApplications = [], isLoading: appsLoading } =
    useAllApplications();

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [createJobModalOpen, setCreateJobModalOpen] = useState(false);

  const loading = jobsLoading || appsLoading;

  // Job Map for fast lookup
  const jobMap = useMemo(() => {
    const map = new Map<string, (typeof jobs)[0]>();
    jobs.forEach((j) => map.set(j.id, j));
    return map;
  }, [jobs]);

  // Candidates currently in Interview stage
  const interviewCandidates = useMemo(() => {
    return rawApplications.filter((a) => a.stage === "INTERVIEW");
  }, [rawApplications]);

  // Filtered interview candidates
  const filteredInterviews = useMemo(() => {
    return interviewCandidates.filter((app) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      const job = app.jobId ? jobMap.get(app.jobId) : null;
      const name = getCandidateDisplayName(app).toLowerCase();
      return (
        name.includes(q) ||
        app.candidateEmail.toLowerCase().includes(q) ||
        (app.candidatePhone && app.candidatePhone.toLowerCase().includes(q)) ||
        (job && job.title.toLowerCase().includes(q))
      );
    });
  }, [interviewCandidates, search, jobMap]);

  const scheduledCount = interviewCandidates.length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Navbar */}
      <Navbar
        activeTab="interviews"
        onOpenCreateJob={() => setCreateJobModalOpen(true)}
        onOpenApplyModal={() => setApplyModalOpen(true)}
        jobsCount={jobs.length}
        candidatesCount={rawApplications.length}
      />

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto space-y-5">
        {/* Interviews Toolbar: Full-w Search on Left, Filters & View Mode on Right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Full-width Search Input */}
          <div className="relative flex-1 min-w-0 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search interviews by candidate, email, or job role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-xs bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xs w-full"
            />
          </div>

          {/* Right: Status Filter Pills & View Switcher */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Status Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() =>
                  setActiveFilter(activeFilter === "SCHEDULED" ? "ALL" : "SCHEDULED")
                }
                className={`inline-flex items-center gap-1.5 rounded-xl border h-9 px-3 text-xs font-semibold shadow-xs cursor-pointer transition-colors ${
                  activeFilter === "SCHEDULED"
                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span>Scheduled</span>
                <span className="text-slate-400 font-normal">
                  ({scheduledCount})
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveFilter(activeFilter === "COMPLETED" ? "ALL" : "COMPLETED")
                }
                className={`inline-flex items-center gap-1.5 rounded-xl border h-9 px-3 text-xs font-semibold shadow-xs cursor-pointer transition-colors ${
                  activeFilter === "COMPLETED"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Completed</span>
                <span className="text-slate-400 font-normal">(0)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveFilter(activeFilter === "CANCELLED" ? "ALL" : "CANCELLED")
                }
                className={`inline-flex items-center gap-1.5 rounded-xl border h-9 px-3 text-xs font-semibold shadow-xs cursor-pointer transition-colors ${
                  activeFilter === "CANCELLED"
                    ? "border-slate-500 bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                    : "border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                <span>Cancelled</span>
                <span className="text-slate-400 font-normal">(0)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveFilter(activeFilter === "NO_SHOW" ? "ALL" : "NO_SHOW")
                }
                className={`inline-flex items-center gap-1.5 rounded-xl border h-9 px-3 text-xs font-semibold shadow-xs cursor-pointer transition-colors ${
                  activeFilter === "NO_SHOW"
                    ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                    : "border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span>No Show</span>
                <span className="text-slate-400 font-normal">(0)</span>
              </button>
            </div>

            {/* View Switcher: List vs Timeline */}
            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/80 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                title="List view"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "list"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span>List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("timeline")}
                title="Timeline view"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "timeline"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Timeline</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <LoadingSpinner />
        ) : filteredInterviews.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-white p-16 text-center dark:border-slate-800 dark:bg-slate-900 shadow-xs w-full my-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 mb-4">
              <Calendar className="h-8 w-8 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {search.trim() ? "No matching interviews" : "No interviews scheduled"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6">
              {search.trim()
                ? "Try searching with a different candidate name, email, or role."
                : "Candidates in the Interview stage will appear here. You can move candidates to the interview stage from the hiring pipeline."}
            </p>
            <Button
              onClick={() => router.push("/dashboard/applications")}
              className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 rounded-xl shadow-xs gap-1.5 cursor-pointer"
            >
              View Applications Pipeline
            </Button>
          </div>
        ) : viewMode === "list" ? (
          /* List View: Structured Interview Cards */
          <div className="space-y-3">
            {filteredInterviews.map((app) => {
              const job = app.jobId ? jobMap.get(app.jobId) : null;
              const displayName = getCandidateDisplayName(app);
              const initials = getInitials(displayName);

              return (
                <div
                  key={app.id}
                  onClick={() => router.push(`/dashboard/applications/${app.id}`)}
                  className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* Left: Candidate Info & Job */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-11 w-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                      {initials}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors truncate">
                          {displayName}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900/60">
                          Interview Stage
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {app.candidateEmail}
                        </span>
                        {app.candidatePhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {app.candidatePhone}
                          </span>
                        )}
                        {job && (
                          <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300 truncate">
                            <Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {job.title}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status & Action button */}
                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    <div className="text-right hidden md:block">
                      <span className="text-[11px] text-slate-400 block">
                        Applied
                      </span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {formatRelativeTime(app.createdAt)}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/applications/${app.id}`);
                      }}
                      className="h-8 px-3 rounded-xl text-xs font-semibold border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-1 cursor-pointer group-hover:border-blue-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                    >
                      <span>View details</span>
                      <ChevronRight className="h-3.5 w-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Timeline View */
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span>Interview Schedule Timeline</span>
            </h3>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {filteredInterviews.map((app) => {
                const job = app.jobId ? jobMap.get(app.jobId) : null;
                const displayName = getCandidateDisplayName(app);

                return (
                  <div key={app.id} className="relative group">
                    {/* Timeline Node Icon */}
                    <div className="absolute -left-6 top-1 h-5 w-5 rounded-full border-2 border-white dark:border-slate-900 bg-blue-600 flex items-center justify-center shadow-xs">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>

                    <div
                      onClick={() => router.push(`/dashboard/applications/${app.id}`)}
                      className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 hover:bg-white dark:hover:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer space-y-1.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {displayName}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(app.createdAt, "short")}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Interview stage for role:{" "}
                        <strong className="text-slate-700 dark:text-slate-200 font-semibold">
                          {job?.title || "Candidate"}
                        </strong>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Apply Modal */}
      <ApplyModal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        jobs={jobs}
      />

      {/* Create Job Modal */}
      <CreateJobModal
        isOpen={createJobModalOpen}
        onClose={() => setCreateJobModalOpen(false)}
      />
    </div>
  );
}

export default function InterviewsPage() {
  return (
    <AuthGuard>
      <InterviewsPageContent />
    </AuthGuard>
  );
}
