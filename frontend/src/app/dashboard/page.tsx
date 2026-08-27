"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar, type NavTab } from "@/components/navbar";
import { JobList } from "@/components/jobs/job-list";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { CreateJobModal } from "@/components/jobs/create-job-modal";
import { ApplyModal } from "@/components/applications/apply-modal";
import { StartRecruiting } from "@/components/dashboard/start-recruiting";
import { useAuth } from "@/context/auth-context";
import {
  useJobs,
  useAllApplications,
  useCreateJobMutation,
  useDeleteJobMutation,
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { Job } from "@/types";
import {
  Briefcase,
  Users,
  FileText,
  AlertCircle,
  Activity,
  Clock,
  Calendar,
  MessageSquare,
  ArrowRight,
  Inbox,
  Settings,
} from "lucide-react";

function getInitials(name: string) {
  if (!name) return "CA";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getRelativeTime(dateString?: string) {
  if (!dateString) return "Just now";
  try {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return "Just now";
  }
}

function formatStageLabel(stage: string): {
  label: string;
  badgeClass: string;
} {
  switch (stage) {
    case "APPLIED":
      return {
        label: "New",
        badgeClass:
          "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60",
      };
    case "SCREENING":
      return {
        label: "Screening",
        badgeClass:
          "bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400 border border-purple-100 dark:border-purple-900/60",
      };
    case "INTERVIEW":
      return {
        label: "Interview",
        badgeClass:
          "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60",
      };
    case "OFFER":
      return {
        label: "Offer",
        badgeClass:
          "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400 border border-amber-100 dark:border-amber-900/60",
      };
    case "HIRED":
      return {
        label: "Hired",
        badgeClass:
          "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60",
      };
    case "REJECTED":
      return {
        label: "Rejected",
        badgeClass:
          "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
      };
    default:
      return {
        label: "New",
        badgeClass:
          "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
      };
  }
}

function DashboardContent() {
  const router = useRouter();
  const { user } = useAuth();

  // TanStack Query - Real data from Database
  const { data: jobs = [], isLoading: jobsLoading } = useJobs(
    user?.organizationId,
  );
  const { data: applications = [], isLoading: appsLoading } =
    useAllApplications();
  const createJobMutation = useCreateJobMutation();
  const deleteJobMutation = useDeleteJobMutation();

  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [createJobModalOpen, setCreateJobModalOpen] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);

  const loading = jobsLoading || appsLoading;
  const activeJob =
    jobs.find((j) => j.id === selectedJobId) || (jobs.length > 0 ? jobs[0] : null);
  const activeJobId = activeJob?.id ?? null;

  // Real database metrics computation
  const openJobsCount = jobs.filter((j) => j.status === "PUBLISHED").length;
  const draftJobsCount = jobs.filter((j) => j.status === "DRAFT").length;
  const totalCandidatesCount = applications.length;
  const toReviewCount = applications.filter(
    (a) => a.stage === "APPLIED",
  ).length;

  // Filter applications for the active job
  const activeJobApps = activeJob
    ? applications.filter((a) => a.jobId === activeJob.id)
    : applications;

  const countNew = activeJobApps.filter((a) => a.stage === "APPLIED").length;
  const countScreening = activeJobApps.filter(
    (a) => a.stage === "SCREENING",
  ).length;
  const countInterview = activeJobApps.filter(
    (a) => a.stage === "INTERVIEW",
  ).length;
  const countOffer = activeJobApps.filter((a) => a.stage === "OFFER").length;
  const countHired = activeJobApps.filter((a) => a.stage === "HIRED").length;
  const countRejected = activeJobApps.filter(
    (a) => a.stage === "REJECTED",
  ).length;

  const totalPipeline = activeJobApps.length;
  const pctNew = totalPipeline > 0 ? (countNew / totalPipeline) * 100 : 0;
  const pctScreening =
    totalPipeline > 0 ? (countScreening / totalPipeline) * 100 : 0;
  const pctInterview =
    totalPipeline > 0 ? (countInterview / totalPipeline) * 100 : 0;
  const pctOffer = totalPipeline > 0 ? (countOffer / totalPipeline) * 100 : 0;
  const pctHired = totalPipeline > 0 ? (countHired / totalPipeline) * 100 : 0;
  const pctRejected =
    totalPipeline > 0 ? (countRejected / totalPipeline) * 100 : 0;

  // Recent applications sorted by createdAt descending
  const recentApplications = [...applications]
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    )
    .slice(0, 8);

  // Quick action: Create a test job
  const handleCreateTestJob = async () => {
    try {
      const testJob = await createJobMutation.mutateAsync({
        title: "Customer Support Specialist",
        department: "Operations",
        location: "Vietnam / Remote",
        type: "FULL_TIME",
        description:
          "Internal role for testing applicant pipeline and candidate screening workflow.",
        salaryRange: "$1,500 - $2,500 / month",
        status: "PUBLISHED",
        organizationId: user?.organizationId ?? null,
      });
      setSelectedJobId(testJob.id);
      setActiveTab("dashboard");
    } catch (err) {
      console.error("Create test job error", err);
    }
  };

  const handleJobDeleted = (id: number) => {
    deleteJobMutation.mutate(id);
    if (selectedJobId === id) {
      const remaining = jobs.filter((j) => j.id !== id);
      setSelectedJobId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
        onOpenApplyModal={() => setApplyModalOpen(true)}
        jobsCount={jobs.length}
        candidatesCount={totalCandidatesCount}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* TAB 1: DASHBOARD */}
            {activeTab === "dashboard" && (
              <div>
                {jobs.length === 0 ? (
                  /* If no jobs yet, show Start Recruiting view */
                  <StartRecruiting
                    onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
                    onCreateTestJob={handleCreateTestJob}
                    onImportFromFile={() => router.push("/dashboard/jobs/new")}
                  />
                ) : (
                  /* When jobs exist, display full high-fidelity Dashboard with live database metrics */
                  <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
                    {/* Top Stat Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Card 1: OPEN JOBS */}
                      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-sm">
                        <div className="relative z-10">
                          <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                            {openJobsCount}.
                          </div>
                          <div className="mt-1 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                            OPEN JOBS
                          </div>
                          <div className="mt-0.5 text-xs text-slate-400">
                            {draftJobsCount} drafts
                          </div>
                        </div>
                        <Briefcase className="absolute -bottom-2 -right-2 h-20 w-20 text-slate-100 dark:text-slate-800/40 pointer-events-none opacity-70" />
                      </div>

                      {/* Card 2: CANDIDATES */}
                      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-sm">
                        <div className="relative z-10">
                          <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                            {totalCandidatesCount}.
                          </div>
                          <div className="mt-1 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                            CANDIDATES
                          </div>
                          <div className="mt-0.5 text-xs text-slate-400">
                            Talent pool
                          </div>
                        </div>
                        <Users className="absolute -bottom-2 -right-2 h-20 w-20 text-slate-100 dark:text-slate-800/40 pointer-events-none opacity-70" />
                      </div>

                      {/* Card 3: APPLICATIONS */}
                      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-sm">
                        <div className="relative z-10">
                          <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                            {totalCandidatesCount}.
                          </div>
                          <div className="mt-1 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                            APPLICATIONS
                          </div>
                          <div className="mt-0.5 text-xs text-slate-400">
                            Total received
                          </div>
                        </div>
                        <FileText className="absolute -bottom-2 -right-2 h-20 w-20 text-slate-100 dark:text-slate-800/40 pointer-events-none opacity-70" />
                      </div>

                      {/* Card 4: TO REVIEW */}
                      <div
                        className={`relative overflow-hidden rounded-2xl p-5 shadow-xs transition-all hover:shadow-sm ${
                          toReviewCount > 0
                            ? "border border-amber-200/90 bg-white dark:border-amber-900/50 dark:bg-slate-900"
                            : "border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900"
                        }`}
                      >
                        <div className="relative z-10">
                          <div
                            className={`text-3xl font-black tracking-tight ${
                              toReviewCount > 0
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-slate-900 dark:text-white"
                            }`}
                          >
                            {toReviewCount}.
                          </div>
                          <div
                            className={`mt-1 text-[11px] font-bold tracking-wider uppercase ${
                              toReviewCount > 0
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-slate-500"
                            }`}
                          >
                            TO REVIEW
                          </div>
                          <div
                            className={`mt-0.5 text-xs ${
                              toReviewCount > 0
                                ? "text-amber-600/80 dark:text-amber-400/80"
                                : "text-slate-400"
                            }`}
                          >
                            {toReviewCount > 0 ? "You haven't viewed" : "All viewed"}
                          </div>
                        </div>
                        <AlertCircle
                          className={`absolute -bottom-2 -right-2 h-20 w-20 pointer-events-none ${
                            toReviewCount > 0
                              ? "text-amber-50 dark:text-amber-950/40 opacity-80"
                              : "text-slate-100 dark:text-slate-800/40 opacity-70"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Main 2-Column Dashboard Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* LEFT COLUMN: HIRING PIPELINE & RECENT APPLICATIONS */}
                      <div className="lg:col-span-7 space-y-6">
                        {/* Card A: Hiring Pipeline */}
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Activity className="h-4 w-4 text-slate-400" />
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                Hiring Pipeline
                              </h3>
                            </div>
                            <Link
                              href="/dashboard/jobs"
                              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 transition-colors"
                            >
                              <span>All Jobs</span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          </div>

                          {/* Job Pipeline Breakdown */}
                          <div className="space-y-3 pt-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {activeJob?.title || "Active Job Opening"}
                              </span>
                              <span className="text-xs font-semibold text-slate-400">
                                {totalPipeline} total
                              </span>
                            </div>

                            {/* Multi-segment Progress Bar */}
                            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden">
                              {pctNew > 0 && (
                                <div
                                  style={{ width: `${pctNew}%` }}
                                  className="bg-blue-500 h-full"
                                  title={`New: ${countNew}`}
                                />
                              )}
                              {pctScreening > 0 && (
                                <div
                                  style={{ width: `${pctScreening}%` }}
                                  className="bg-purple-500 h-full"
                                  title={`Screening: ${countScreening}`}
                                />
                              )}
                              {pctInterview > 0 && (
                                <div
                                  style={{ width: `${pctInterview}%` }}
                                  className="bg-indigo-500 h-full"
                                  title={`Interview: ${countInterview}`}
                                />
                              )}
                              {pctOffer > 0 && (
                                <div
                                  style={{ width: `${pctOffer}%` }}
                                  className="bg-amber-500 h-full"
                                  title={`Offer: ${countOffer}`}
                                />
                              )}
                              {pctHired > 0 && (
                                <div
                                  style={{ width: `${pctHired}%` }}
                                  className="bg-emerald-500 h-full"
                                  title={`Hired: ${countHired}`}
                                />
                              )}
                              {pctRejected > 0 && (
                                <div
                                  style={{ width: `${pctRejected}%` }}
                                  className="bg-slate-300 dark:bg-slate-600 h-full"
                                  title={`Rejected: ${countRejected}`}
                                />
                              )}
                            </div>

                            {/* 6 Stage Metric Cards */}
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                              {/* Stage 1: New */}
                              <div
                                onClick={() =>
                                  router.push(
                                    activeJobId
                                      ? `/dashboard/candidates?jobId=${activeJobId}`
                                      : "/dashboard/candidates",
                                  )
                                }
                                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 cursor-pointer hover:bg-blue-100/70 transition-colors"
                              >
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                  {countNew}
                                </span>
                                <span className="text-[10px] font-semibold text-blue-600/80 dark:text-blue-400/80 mt-0.5">
                                  New
                                </span>
                              </div>

                              {/* Stage 2: Screening */}
                              <div
                                onClick={() =>
                                  router.push(
                                    activeJobId
                                      ? `/dashboard/candidates?jobId=${activeJobId}`
                                      : "/dashboard/candidates",
                                  )
                                }
                                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/40 cursor-pointer hover:bg-purple-100/70 transition-colors"
                              >
                                <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                                  {countScreening}
                                </span>
                                <span className="text-[10px] font-semibold text-purple-600/80 dark:text-purple-400/80 mt-0.5">
                                  Screening
                                </span>
                              </div>

                              {/* Stage 3: Interview */}
                              <div
                                onClick={() =>
                                  router.push(
                                    activeJobId
                                      ? `/dashboard/candidates?jobId=${activeJobId}`
                                      : "/dashboard/candidates",
                                  )
                                }
                                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 cursor-pointer hover:bg-amber-100/70 transition-colors"
                              >
                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                  {countInterview}
                                </span>
                                <span className="text-[10px] font-semibold text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                                  Interview
                                </span>
                              </div>

                              {/* Stage 4: Offer */}
                              <div
                                onClick={() =>
                                  router.push(
                                    activeJobId
                                      ? `/dashboard/candidates?jobId=${activeJobId}`
                                      : "/dashboard/candidates",
                                  )
                                }
                                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/40 cursor-pointer hover:bg-teal-100/70 transition-colors"
                              >
                                <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                                  {countOffer}
                                </span>
                                <span className="text-[10px] font-semibold text-teal-600/80 dark:text-teal-400/80 mt-0.5">
                                  Offer
                                </span>
                              </div>

                              {/* Stage 5: Hired */}
                              <div
                                onClick={() =>
                                  router.push(
                                    activeJobId
                                      ? `/dashboard/candidates?jobId=${activeJobId}`
                                      : "/dashboard/candidates",
                                  )
                                }
                                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 cursor-pointer hover:bg-emerald-100/70 transition-colors"
                              >
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                  {countHired}
                                </span>
                                <span className="text-[10px] font-semibold text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                                  Hired
                                </span>
                              </div>

                              {/* Stage 6: Rejected */}
                              <div
                                onClick={() =>
                                  router.push(
                                    activeJobId
                                      ? `/dashboard/candidates?jobId=${activeJobId}`
                                      : "/dashboard/candidates",
                                  )
                                }
                                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:bg-slate-200/60 transition-colors"
                              >
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                  {countRejected}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  Rejected
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card B: Recent Applications */}
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-slate-400" />
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                Recent Applications
                              </h3>
                            </div>
                            <Link
                              href="/dashboard/candidates"
                              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 transition-colors"
                            >
                              <span>View all</span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          </div>

                          {/* Applications List */}
                          {recentApplications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-1">
                                <FileText className="h-5 w-5" />
                              </div>
                              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                No applications yet
                              </h4>
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                              {recentApplications.map((app) => {
                                const stageInfo = formatStageLabel(app.stage);
                                const candidateJob = jobs.find(
                                  (j) => j.id === app.jobId,
                                );

                                return (
                                  <div
                                    key={app.id}
                                    onClick={() =>
                                      router.push(
                                        `/dashboard/candidates?jobId=${app.jobId}`,
                                      )
                                    }
                                    className="flex items-center justify-between py-3 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      {/* Avatar with Initials */}
                                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100/80 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs">
                                        {getInitials(app.candidateName)}
                                      </div>

                                      {/* Name + Status + Role */}
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                            {app.candidateName}
                                          </span>
                                          <span
                                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${stageInfo.badgeClass}`}
                                          >
                                            {stageInfo.label}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                          {candidateJob?.title || "Open Role"}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Timestamp */}
                                    <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                                      {getRelativeTime(app.createdAt)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* RIGHT COLUMN: UPCOMING INTERVIEWS & UNANSWERED REPLIES */}
                      <div className="lg:col-span-5 space-y-6">
                        {/* Card C: Upcoming Interviews */}
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-slate-400" />
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                Upcoming Interviews
                              </h3>
                            </div>
                            <Link
                              href="/dashboard/interviews"
                              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 transition-colors"
                            >
                              <span>All</span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          </div>

                          {/* Empty State */}
                          <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-1">
                              <Calendar className="h-5 w-5" />
                            </div>
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              No upcoming interviews
                            </h4>
                            <p className="text-[11px] text-slate-400">
                              Next 7 days
                            </p>
                          </div>
                        </div>

                        {/* Card D: Unanswered Replies */}
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
                          {/* Header */}
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-slate-400" />
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                              Unanswered Replies
                            </h3>
                          </div>

                          {/* Empty State */}
                          <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-1">
                              <MessageSquare className="h-5 w-5" />
                            </div>
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Nothing waiting on you
                            </h4>
                            <p className="text-[11px] text-slate-400 max-w-xs">
                              Candidates who write back appear here
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: JOBS */}
            {activeTab === "jobs" && (
              <div>
                {jobs.length === 0 && !loading ? (
                  <StartRecruiting
                    onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
                    onCreateTestJob={handleCreateTestJob}
                    onImportFromFile={() => router.push("/dashboard/jobs/new")}
                  />
                ) : (
                  <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                    <JobList
                      jobs={jobs}
                      applications={applications}
                      loading={loading}
                      onViewCandidates={(jobId: number) => {
                        setSelectedJobId(jobId);
                        router.push(`/dashboard/candidates?jobId=${jobId}`);
                      }}
                      onApply={(job: Job) => {
                        setSelectedJobId(job.id);
                        setApplyModalOpen(true);
                      }}
                      onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
                      onDeleteJob={handleJobDeleted}
                    />
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: CANDIDATES & APPLICATIONS (KANBAN) */}
            {(activeTab === "candidates" || activeTab === "applications") && (
              <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <KanbanBoard
                  jobs={jobs}
                  selectedJobId={activeJobId}
                  onSelectJob={setSelectedJobId}
                  onOpenApplyModal={() => setApplyModalOpen(true)}
                />
              </div>
            )}

            {/* TAB 4: INBOX */}
            {activeTab === "inbox" && (
              <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-400 mb-3">
                  <Inbox className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Candidate Communications Inbox
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Email synchronization and applicant messaging features will be available here.
                </p>
              </div>
            )}

            {/* TAB 5: INTERVIEWS */}
            {activeTab === "interviews" && (
              <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-400 mb-3">
                  <Calendar className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Interview Scheduling & Calendar
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Connect Google Calendar or Outlook to automate candidate interview scheduling.
                </p>
              </div>
            )}

            {/* TAB 6: ASSISTANT */}
            {activeTab === "assistant" && (
              <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 mb-3">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  AI Recruiting Copilot
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  AI-assisted candidate screening, resume ranking, and automated interview question generation.
                </p>
              </div>
            )}

            {/* TAB 7: SETTINGS */}
            {activeTab === "settings" && (
              <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-400 mb-3">
                  <Settings className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Workspace & Organization Settings
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Manage team members, roles, billing plans, and custom hiring stages.
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Create Job Modal */}
      <CreateJobModal
        isOpen={createJobModalOpen}
        onClose={() => setCreateJobModalOpen(false)}
      />

      {/* Apply Modal */}
      <ApplyModal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        jobs={jobs}
        selectedJobId={activeJobId}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
