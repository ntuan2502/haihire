"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Navbar } from "@/components/navbar";
import { JobList } from "@/components/jobs/job-list";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { CreateJobModal } from "@/components/jobs/create-job-modal";
import { ApplyModal } from "@/components/applications/apply-modal";
import { jobsApi } from "@/lib/api";
import type { Job } from "@/types";
import {
  Briefcase,
  Users,
  CheckCircle2,
  HardDrive,
  TrendingUp,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"jobs" | "kanban">("jobs");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  // Modals
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyJobTarget, setApplyJobTarget] = useState<Job | null>(null);

  // Fetch Jobs
  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await jobsApi.getAll();
      setJobs(data);

      // Auto select first job for Kanban if not selected
      if (data.length > 0 && !selectedJobId) {
        setSelectedJobId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load jobs:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedJobId]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Aggregate stats across all jobs
  const stats = useMemo(() => {
    let totalCandidates = 0;
    let hiredCount = 0;

    jobs.forEach((job) => {
      totalCandidates += job.applicationsCount || 0;
      if (job.applicationsByStage?.HIRED) {
        hiredCount += job.applicationsByStage.HIRED;
      }
    });

    return {
      activeJobs: jobs.filter((j) => j.status === "PUBLISHED").length,
      totalCandidates,
      hiredCount,
      departmentsCount: new Set(jobs.map((j) => j.department)).size,
    };
  }, [jobs]);

  const handleViewCandidates = (jobId: number) => {
    setSelectedJobId(jobId);
    setActiveTab("kanban");
  };

  const handleOpenApply = (job?: Job) => {
    if (job) {
      setApplyJobTarget(job);
    } else if (jobs.length > 0) {
      setApplyJobTarget(jobs[0]);
    }
    setIsApplyModalOpen(true);
  };

  const handleDeleteJob = async (jobId: number) => {
    if (window.confirm("Are you sure you want to delete this job and all its candidates?")) {
      try {
        await jobsApi.delete(jobId);
        fetchJobs();
      } catch (err) {
        console.error("Failed to delete job:", err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenCreateJob={() => setIsCreateJobOpen(true)}
        onOpenApplyModal={() => handleOpenApply()}
        jobsCount={jobs.length}
        candidatesCount={stats.totalCandidates}
      />

      {/* Main Content Body */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Metrics Dashboard Overview */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200/80 bg-white p-4.5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900/60 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Active Openings
              </p>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                {stats.activeJobs}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Across {stats.departmentsCount} departments
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Briefcase className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-4.5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900/60 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Applicants
              </p>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                {stats.totalCandidates}
              </h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5 flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> Live Candidate Flow
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-4.5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900/60 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Hired Candidates
              </p>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                {stats.hiredCount}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Successful Placements
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-4.5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900/60 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                MinIO S3 Storage
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  ats-resumes
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                PostgreSQL 16 + MinIO
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <HardDrive className="h-5 w-5" />
            </div>
          </div>
        </section>

        {/* Tab View: Job Openings OR Kanban Pipeline */}
        {activeTab === "jobs" ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Active Job Positions
                </h2>
                <p className="text-xs text-slate-500">
                  Manage company roles, inspect applicant volume, and publish openings.
                </p>
              </div>
            </div>

            <JobList
              jobs={jobs}
              loading={loading}
              onViewCandidates={handleViewCandidates}
              onApply={(job) => handleOpenApply(job)}
              onOpenCreateJob={() => setIsCreateJobOpen(true)}
              onDeleteJob={handleDeleteJob}
            />
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Candidate Pipeline & Kanban Stages
                </h2>
                <p className="text-xs text-slate-500">
                  Drag and drop applicants across stages from Applied to Interview and Hired.
                </p>
              </div>
            </div>

            <KanbanBoard
              jobs={jobs}
              selectedJobId={selectedJobId}
              onSelectJob={setSelectedJobId}
              onOpenApplyModal={() => handleOpenApply()}
            />
          </section>
        )}
      </main>

      {/* Modals */}
      <CreateJobModal
        isOpen={isCreateJobOpen}
        onClose={() => setIsCreateJobOpen(false)}
        onJobCreated={fetchJobs}
      />

      <ApplyModal
        isOpen={isApplyModalOpen}
        onClose={() => {
          setIsApplyModalOpen(false);
          setApplyJobTarget(null);
        }}
        jobs={jobs}
        selectedJobId={applyJobTarget?.id || selectedJobId}
        onApplicationSubmitted={fetchJobs}
      />
    </div>
  );
}
