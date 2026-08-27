"use client";

import React, { useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar, type NavTab } from "@/components/navbar";
import { JobList } from "@/components/jobs/job-list";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { CreateJobModal } from "@/components/jobs/create-job-modal";
import { ApplyModal } from "@/components/applications/apply-modal";
import { StartRecruiting } from "@/components/dashboard/start-recruiting";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import {
  useJobs,
  useAllApplications,
  useCreateJobMutation,
  useDeleteJobMutation,
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { Job } from "@/types";
import {
  Inbox,
  Calendar,
  MessageSquare,
  Settings,
  Sparkles,
  Layers,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";

function DashboardContent() {
  const router = useRouter();
  const { user } = useAuth();

  // TanStack Query
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

  const activeJobId = selectedJobId ?? (jobs.length > 0 ? jobs[0].id : null);
  const loading = jobsLoading || appsLoading;

  // Quick action: Create a test job
  const handleCreateTestJob = async () => {
    try {
      const testJob = await createJobMutation.mutateAsync({
        title: "Senior Full-Stack Engineer (Test Role)",
        department: "Engineering",
        location: "Remote / Hanoi",
        type: "FULL_TIME",
        description:
          "Internal test role for testing applicant pipeline and candidate screening workflow.",
        salaryRange: "$2,500 - $4,000 / month",
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
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
        onOpenApplyModal={() => setApplyModalOpen(true)}
        jobsCount={jobs.length}
        candidatesCount={applications.length}
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
                  /* If jobs exist, show Dashboard Hub with Quick Shortcuts + Overview */
                  <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
                {/* Org Welcome Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        Welcome to {user?.organization?.name || "ATS Workspace"}
                      </h2>
                      <span className="rounded-full bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                        Live Pipeline
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Manage job postings, review candidate CVs on MinIO, and coordinate hiring stages.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => router.push("/dashboard/jobs")}
                      className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer shadow-xs"
                    >
                      View All Jobs ({jobs.length})
                    </button>
                    <button
                      onClick={() => router.push("/dashboard/candidates")}
                      className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Open Pipeline ({applications.length})
                    </button>
                  </div>
                </div>

                {/* Dashboard Metric Overview */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-semibold">Active Openings</span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                        <Layers className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        {jobs.filter((j) => j.status === "PUBLISHED").length}
                      </span>
                      <span className="text-xs text-emerald-600 font-medium">
                        Live on portal
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-semibold">Total Candidates</span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                        <TrendingUp className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        {applications.length}
                      </span>
                      <span className="text-xs text-indigo-600 font-medium">
                        Applications
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-semibold">Interviewing</span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                        <Calendar className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        {applications.filter((a) => a.stage === "INTERVIEW").length}
                      </span>
                      <span className="text-xs text-amber-600 font-medium">
                        Active rounds
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-semibold">Hired Candidates</span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                        <Sparkles className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        {applications.filter((a) => a.stage === "HIRED").length}
                      </span>
                      <span className="text-xs text-emerald-600 font-medium">
                        Offers accepted
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Navigation Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    onClick={() => router.push("/dashboard/jobs/new")}
                    className="p-5 rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer shadow-xs group flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                        Post a New Job Opening
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Define role requirements, department, and salary package
                      </p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </div>

                  <div
                    onClick={() => router.push("/dashboard/candidates")}
                    className="p-5 rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer shadow-xs group flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                        Manage Candidates Pipeline
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Drag and drop candidates across hiring stages
                      </p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
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
                onOpenCreateJob={() => setCreateJobModalOpen(true)}
                onCreateTestJob={handleCreateTestJob}
                onImportFromFile={() => setCreateJobModalOpen(true)}
              />
            ) : (
              <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <JobList
                  jobs={jobs}
                  loading={loading}
                  onViewCandidates={(jobId: number) => {
                    setSelectedJobId(jobId);
                    router.push(`/dashboard/candidates?jobId=${jobId}`);
                  }}
                  onApply={(job: Job) => {
                    setSelectedJobId(job.id);
                    setApplyModalOpen(true);
                  }}
                  onOpenCreateJob={() => setCreateJobModalOpen(true)}
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
