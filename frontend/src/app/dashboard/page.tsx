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
  Video,
  MapPin,
  User,
} from "lucide-react";
import { getInitials, formatRelativeTime } from "@/lib/utils";
import { usePipelineStages } from "@/lib/stages";
import { StageBadge } from "@/components/ui/stage-badge";
import { useI18n } from "@/i18n";
import {
  parseAllInterviewsFromNotes,
  type ScheduledInterviewInfo,
} from "@/lib/interviews";
import type { ApplicationStage } from "@/types";

function formatInterviewDate(dateStr: string, timeStr?: string) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const timeSuffix = timeStr ? ` ${timeStr}` : "";

  if (dateStr === todayStr) {
    return { label: `Hôm nay${timeSuffix}`, isToday: true };
  }
  if (dateStr === tomorrowStr) {
    return { label: `Ngày mai${timeSuffix}`, isTomorrow: true };
  }
  const parts = dateStr.split("-");
  const d = parts[2] || "";
  const m = parts[1] || "";
  return { label: `${d}/${m}${timeSuffix}`, isFuture: true };
}

function DashboardContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const pipelineStages = usePipelineStages();

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

  // Jobs to show in Hiring Pipeline (only published / open jobs)
  const pipelineJobs = useMemo(() => {
    return [...jobs]
      .filter((j) => j.status === "PUBLISHED")
      .sort((a, b) => {
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      });
  }, [jobs]);

  // Upcoming interviews across all applications (sorted earliest first)
  const upcomingInterviews = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const results: {
      application: (typeof applications)[0];
      interview: ScheduledInterviewInfo;
      job?: (typeof jobs)[0];
    }[] = [];

    for (const app of applications) {
      const all = parseAllInterviewsFromNotes(app.notes);
      const job = jobs.find((j) => j.id === app.jobId);
      for (const intv of all) {
        if (intv.date >= todayStr) {
          results.push({
            application: app,
            interview: intv,
            job,
          });
        }
      }
    }

    results.sort((a, b) => {
      const dtA = `${a.interview.date} ${a.interview.time || "00:00"}`;
      const dtB = `${b.interview.date} ${b.interview.time || "00:00"}`;
      return dtA.localeCompare(dtB);
    });

    return results;
  }, [applications, jobs]);

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
                            {t("dashboard.openJobsUpper")}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-400">
                            {t("dashboard.draftsCount", { count: draftJobsCount })}
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
                            {t("dashboard.candidatesUpper")}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-400">
                            {t("dashboard.talentPoolSubtitle")}
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
                            {t("dashboard.applicationsUpper")}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-400">
                            {t("dashboard.totalReceived")}
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
                            {t("dashboard.toReviewUpper")}
                          </div>
                          <div
                            className={`mt-0.5 text-xs ${
                              toReviewCount > 0
                                ? "text-amber-600/80 dark:text-amber-400/80"
                                : "text-slate-400"
                            }`}
                          >
                            {toReviewCount > 0 ? t("dashboard.youHaventViewed") : t("dashboard.allViewed")}
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
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <Activity className="h-4 w-4 text-slate-400" />
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                {t("dashboard.hiringPipeline")}
                              </h3>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/60">
                                {pipelineJobs.length} vị trí đang mở
                              </span>
                            </div>
                            <Link
                              href="/dashboard/jobs"
                              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 transition-colors"
                            >
                              <span>{t("dashboard.allJobs")}</span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          </div>

                          {/* Job Pipeline Breakdown for all active jobs */}
                          {pipelineJobs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                              <Briefcase className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                {t("dashboard.noActiveJobs")}
                              </p>
                              <Link
                                href="/dashboard/jobs"
                                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {t("jobs.createJob")}
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
                                        {totalPipeline} {t("pipeline.stageCounts")}
                                      </span>
                                    </div>

                                    {/* Multi-segment Progress Bar */}
                                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden">
                                      {pipelineStages.map((stage) => {
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
                                      {pipelineStages.map((stage) => {
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
                                            className={`flex flex-col items-center justify-center p-2.5 rounded-xl ${stage.cardBg} border ${stage.cardBorder} cursor-pointer ${stage.cardHover} transition-colors text-center`}
                                          >
                                            <span
                                              className={`text-xs font-bold ${stage.textColor}`}
                                            >
                                              {count}
                                            </span>
                                            <span
                                              className={`text-[10px] font-semibold ${stage.textColor} opacity-80 mt-0.5 text-center leading-tight`}
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
                                {t("dashboard.recentApplications")}
                              </h3>
                            </div>
                            <Link
                              href="/dashboard/applications"
                              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 transition-colors"
                            >
                              <span>{t("common.viewAll")}</span>
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
                                {t("dashboard.noApplicationsYet")}
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
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-slate-400" />
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                {t("dashboard.upcomingInterviews")}
                              </h3>
                              {upcomingInterviews.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/60">
                                  {upcomingInterviews.length}
                                </span>
                              )}
                            </div>
                            <Link
                              href="/dashboard/interviews"
                              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 transition-colors"
                            >
                              <span>{t("common.viewAll")}</span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          </div>

                          {/* Content: Real Upcoming Interviews or Empty State */}
                          {upcomingInterviews.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-1">
                                <Calendar className="h-5 w-5" />
                              </div>
                              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {t("dashboard.noUpcomingInterviews")}
                              </h4>
                              <p className="text-[11px] text-slate-400">
                                {t("dashboard.next7Days")}
                              </p>
                              <Link
                                href="/dashboard/interviews"
                                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                              >
                                <span>+ Lên lịch phỏng vấn mới</span>
                              </Link>
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                              {upcomingInterviews.slice(0, 5).map((item, idx) => {
                                const { application: app, interview: intv, job } = item;
                                const dateMeta = formatInterviewDate(intv.date, intv.time);
                                const isOnline = intv.format !== "OFFICE";

                                return (
                                  <div
                                    key={`${app.id}-${intv.date}-${intv.time}-${idx}`}
                                    className="py-3 px-1 space-y-2 group hover:bg-slate-50/60 dark:hover:bg-slate-800/40 rounded-xl transition-colors"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="h-8 w-8 rounded-full bg-blue-100/80 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                                          {getInitials(app.candidateName)}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <Link
                                              href="/dashboard/interviews"
                                              className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors truncate"
                                            >
                                              {app.candidateName}
                                            </Link>
                                            <span className="text-[10px] text-slate-400 shrink-0">•</span>
                                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                                              {intv.type}
                                            </span>
                                          </div>
                                          <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                            {job?.title || "Vị trí tuyển dụng"}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Date pill */}
                                      <span
                                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                                          dateMeta.isToday
                                            ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60"
                                            : dateMeta.isTomorrow
                                            ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80"
                                        }`}
                                      >
                                        {dateMeta.label}
                                      </span>
                                    </div>

                                    {/* Bottom details row */}
                                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pl-10.5">
                                      <div className="flex items-center gap-3 truncate">
                                        <span className="flex items-center gap-1 truncate">
                                          <User className="h-3 w-3 text-slate-400 shrink-0" />
                                          <span className="truncate">{intv.interviewer}</span>
                                        </span>
                                        <span className="flex items-center gap-1 shrink-0">
                                          {isOnline ? (
                                            <>
                                              <Video className="h-3 w-3 text-emerald-500 shrink-0" />
                                              <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[10px]">
                                                {intv.format}
                                              </span>
                                            </>
                                          ) : (
                                            <>
                                              <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                                              <span className="text-rose-600 dark:text-rose-400 font-medium text-[10px]">
                                                Tại VP
                                              </span>
                                            </>
                                          )}
                                        </span>
                                      </div>

                                      {intv.linkOrLocation?.startsWith("http") && (
                                        <a
                                          href={intv.linkOrLocation}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-bold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors shrink-0"
                                        >
                                          <Video className="h-2.5 w-2.5" />
                                          <span>Vào họp</span>
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Card D: Unanswered Replies */}
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
                          {/* Header */}
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-slate-400" />
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                              {t("dashboard.unansweredReplies")}
                            </h3>
                          </div>

                          {/* Empty State */}
                          <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-1">
                              <MessageSquare className="h-5 w-5" />
                            </div>
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {t("dashboard.noUnansweredReplies")}
                            </h4>
                            <p className="text-[11px] text-slate-400 max-w-xs">
                              {t("dashboard.candidatesAppearHere")}
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
