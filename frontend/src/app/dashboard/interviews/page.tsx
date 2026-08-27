"use client";

import React, { useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { ApplyModal } from "@/components/applications/apply-modal";
import { CreateJobModal } from "@/components/jobs/create-job-modal";
import { useAuth } from "@/context/auth-context";
import { Input } from "@/components/ui/input";
import { useJobs, useAllApplications } from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Search,
  Calendar,
  Clock,
  List,
} from "lucide-react";

function InterviewsPageContent() {
  const { user } = useAuth();
  const { data: jobs = [] } = useJobs(user?.organizationId);
  const { data: applications = [], isLoading: appsLoading } =
    useAllApplications();

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "ALL" | "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW"
  >("ALL");
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [createJobModalOpen, setCreateJobModalOpen] = useState(false);

  const interviewCandidates = applications.filter((a) => {
    const isInterview = a.stage === "INTERVIEW";
    if (!isInterview) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        a.candidateName.toLowerCase().includes(q) ||
        a.candidateEmail.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Navbar */}
      <Navbar
        activeTab="interviews"
        onOpenCreateJob={() => setCreateJobModalOpen(true)}
        onOpenApplyModal={() => setApplyModalOpen(true)}
        jobsCount={jobs.length}
        candidatesCount={applications.length}
      />

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-[1600px] w-full mx-auto space-y-6">
        {/* Interviews Toolbar matching Screenshot 3 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search interviews, candidates, jobs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />
          </div>

          {/* Status Filter Pills & View Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() =>
                  setActiveFilter(activeFilter === "SCHEDULED" ? "ALL" : "SCHEDULED")
                }
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-xs cursor-pointer transition-colors ${
                  activeFilter === "SCHEDULED"
                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Scheduled{" "}
                <span className="text-slate-400 font-normal">
                  {interviewCandidates.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveFilter(activeFilter === "COMPLETED" ? "ALL" : "COMPLETED")
                }
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-xs cursor-pointer transition-colors ${
                  activeFilter === "COMPLETED"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Completed <span className="text-slate-400 font-normal">0</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveFilter(activeFilter === "CANCELLED" ? "ALL" : "CANCELLED")
                }
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-xs cursor-pointer transition-colors ${
                  activeFilter === "CANCELLED"
                    ? "border-slate-500 bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                Cancelled <span className="text-slate-400 font-normal">0</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveFilter(activeFilter === "NO_SHOW" ? "ALL" : "NO_SHOW")
                }
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-xs cursor-pointer transition-colors ${
                  activeFilter === "NO_SHOW"
                    ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                No Show <span className="text-slate-400 font-normal">0</span>
              </button>
            </div>

            {/* View Switcher: List vs Timeline */}
            <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 ml-auto md:ml-2">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "list"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                List
              </button>
              <button
                type="button"
                onClick={() => setViewMode("timeline")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "timeline"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                Timeline
              </button>
            </div>
          </div>
        </div>

        {/* Empty State / Content Area */}
        {appsLoading ? (
          <LoadingSpinner />
        ) : interviewCandidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-white p-16 text-center dark:border-slate-800 dark:bg-slate-900 shadow-xs max-w-3xl mx-auto my-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 mb-4">
              <Calendar className="h-8 w-8 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No interviews yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
              Interviews will appear here when you schedule them from the pipeline.
            </p>
          </div>
        ) : (
          /* List of scheduled interview candidates */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {interviewCandidates.map((app) => (
              <div
                key={app.id}
                className="p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {app.candidateName}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                    Interview Stage
                  </span>
                </div>
                <p className="text-xs text-slate-500">{app.candidateEmail}</p>
                <p className="text-xs text-blue-600 font-medium">
                  {app.job?.title || "Job Application"}
                </p>
              </div>
            ))}
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
