"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar, type NavTab } from "@/components/navbar";
import { StartRecruiting } from "@/components/dashboard/start-recruiting";
import { useAuth } from "@/context/auth-context";
import {
  useJobs,
  useAllApplications,
  useCreateJobMutation,
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
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
} from "lucide-react";
import { getInitials, formatRelativeTime } from "@/lib/utils";
import { PIPELINE_STAGES } from "@/lib/stages";
import { StageBadge } from "@/components/ui/stage-badge";
import type { ApplicationStage } from "@/types";

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

  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const loading = jobsLoading || appsLoading;

  // Real database metrics computation
  const openJobsCount = jobs.filter((j) => j.status === "PUBLISHED").length;
  const draftJobsCount = jobs.filter((j) => j.status === "DRAFT").length;
  const totalCandidatesCount = new Set(
    applications.map((a) => (a.candidateEmail || a.candidateName).toLowerCase().trim()),
  ).size;
  const totalApplicationsCount = applications.filter(
    (a) => Boolean(a.jobId && String(a.jobId).trim() !== ""),
  ).length;
  const toReviewCount = applications.filter(
    (a) =>
      Boolean(a.jobId && String(a.jobId).trim() !== "") &&
      a.stage === "APPLIED",
  ).length;

  // Jobs to show in Hiring Pipeline (all non-archived jobs, published first)
  const pipelineJobs = useMemo(() => {
    return [...jobs]
      .filter((j) => j.status !== "ARCHIVED")
      .sort((a, b) => {
        if (a.status === "PUBLISHED" && b.status !== "PUBLISHED") return -1;
        if (b.status === "PUBLISHED" && a.status !== "PUBLISHED") return 1;
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      });
  }, [jobs]);

  // Recent applications (only active job applications) sorted by createdAt descending
  const recentApplications = applications
    .filter((a) => Boolean(a.jobId && String(a.jobId).trim() !== ""))
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    )
    .slice(0, 8);

  // Quick action: Create a test job
  const handleCreateTestJob = async () => {
    try {
      await createJobMutation.mutateAsync({
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
      setActiveTab("dashboard");
    } catch (err) {
      console.error("Create test job error", err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
        onOpenApplyModal={() => {}}
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
                            {totalApplicationsCount}.
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

                          {/* Job Pipeline Breakdown for all active jobs */}
                          {pipelineJobs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                              <Briefcase className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                No open jobs found
                              </p>
                              <Link
                                href="/dashboard/jobs"
                                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                Create or manage jobs
                              </Link>
                            </div>
                          ) : (
                            <div className="space-y-6 pt-1">
                              {pipelineJobs.map((job) => {
                                const jobApps = applications.filter(
                                  (a) => a.jobId === job.id,
                                );
                                const totalPipeline = jobApps.length;
                                const stageCounts: Record<
                                  ApplicationStage,
                                  number
                                > = {
                                  APPLIED: 0,
                                  SCREENING: 0,
                                  INTERVIEW: 0,
                                  OFFER: 0,
                                  HIRED: 0,
                                  REJECTED: 0,
                                };
                                for (const a of jobApps) {
                                  if (stageCounts[a.stage] !== undefined) {
                                    stageCounts[a.stage]++;
                                  }
                                }

                                return (
                                  <div key={job.id} className="space-y-2.5">
                                    {/* Job Title & Total Candidates */}
                                    <div className="flex items-center justify-between">
                                      <Link
                                        href={`/dashboard/jobs/${job.id}/pipeline`}
                                        className="text-xs font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                      >
                                        {job.title}
                                      </Link>
                                      <span className="text-xs text-slate-400 font-normal">
                                        {totalPipeline} total
                                      </span>
                                    </div>

                                    {/* Multi-segment Progress Bar */}
                                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden">
                                      {PIPELINE_STAGES.map((stage) => {
                                        const count =
                                          stageCounts[stage.id] || 0;
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

                                    {/* 6 Stage Metric Cards */}
                                    <div className="grid grid-cols-6 gap-2 pt-1">
                                      {PIPELINE_STAGES.map((stage) => {
                                        const count =
                                          stageCounts[stage.id] || 0;
                                        return (
                                          <div
                                            key={stage.id}
                                            onClick={() =>
                                              router.push(
                                                `/dashboard/jobs/${job.id}/pipeline?stage=${stage.id}`,
                                              )
                                            }
                                            className={`flex flex-col items-center justify-center p-2.5 rounded-xl ${stage.cardBg} border ${stage.cardBorder} cursor-pointer ${stage.cardHover} transition-colors`}
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
                                  </div>
                                );
                              })}
                            </div>
                          )}
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
                              href="/dashboard/applications"
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
                                const candidateJob = jobs.find(
                                  (j) => j.id === app.jobId,
                                );

                                return (
                                  <div
                                    key={app.id}
                                    onClick={() =>
                                      router.push(
                                        `/dashboard/applications/${app.id}`,
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
                                          <StageBadge stage={app.stage} />
                                        </div>
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                          {candidateJob?.title || "Open Role"}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Timestamp */}
                                    <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                                      {formatRelativeTime(app.createdAt)}
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
          </>
        )}
      </main>
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
