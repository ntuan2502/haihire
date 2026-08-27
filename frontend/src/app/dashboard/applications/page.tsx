"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { ApplyModal } from "@/components/applications/apply-modal";
import { CreateJobModal } from "@/components/jobs/create-job-modal";
import { jobsApi, applicationsApi } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { Input } from "@/components/ui/input";
import type { Job, Application } from "@/types";
import {
  Search,
  FileText,
  SlidersHorizontal,
  Columns3,
  Filter,
  Maximize2,
  ChevronDown,
  ArrowUpDown,
} from "lucide-react";

function ApplicationsPageContent() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [createJobModalOpen, setCreateJobModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [jobsData, appsData] = await Promise.all([
        jobsApi.getAll(
          user?.organizationId
            ? { organizationId: user.organizationId }
            : undefined,
        ),
        applicationsApi.getAll(),
      ]);
      setJobs(jobsData);
      setApplications(appsData);
      if (jobsData.length > 0 && selectedJobId === null) {
        setSelectedJobId(jobsData[0].id);
      }
    } catch (err) {
      console.error("Failed to load applications data", err);
    } finally {
      setLoading(false);
    }
  }, [selectedJobId, user?.organizationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Navbar with activeTab="applications" */}
      <Navbar
        activeTab="applications"
        onOpenCreateJob={() => setCreateJobModalOpen(true)}
        onOpenApplyModal={() => setApplyModalOpen(true)}
        jobsCount={jobs.length}
        candidatesCount={applications.length}
      />

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-[1600px] w-full mx-auto space-y-6">
        {/* Applications Toolbar matching Screenshot 2 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by candidate name, email, or job title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-xs cursor-pointer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
              Views
              <ChevronDown className="h-3 w-3 text-slate-400 opacity-60" />
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-xs cursor-pointer"
            >
              <Columns3 className="h-3.5 w-3.5 text-slate-400" />
              Columns
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-xs cursor-pointer"
            >
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              Filters
            </button>

            <button
              type="button"
              className="hidden sm:inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-500 hover:bg-slate-50 shadow-xs cursor-pointer"
              title="Sort"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              className="hidden sm:inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-500 hover:bg-slate-50 shadow-xs cursor-pointer"
              title="Fullscreen"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Empty State / Content Area */}
        {applications.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-white p-16 text-center dark:border-slate-800 dark:bg-slate-900 shadow-xs max-w-3xl mx-auto my-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 mb-4">
              <FileText className="h-8 w-8 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No applications yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6">
              Applications will appear here when candidates apply to your jobs or when you manually link candidates.
            </p>
          </div>
        ) : (
          <KanbanBoard
            jobs={jobs}
            selectedJobId={selectedJobId}
            onSelectJob={setSelectedJobId}
            onOpenApplyModal={() => setApplyModalOpen(true)}
          />
        )}
      </main>

      {/* Apply Modal */}
      <ApplyModal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        jobs={jobs}
        selectedJobId={selectedJobId}
        onApplicationSubmitted={fetchData}
      />

      {/* Create Job Modal */}
      <CreateJobModal
        isOpen={createJobModalOpen}
        onClose={() => setCreateJobModalOpen(false)}
        onJobCreated={fetchData}
      />
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <AuthGuard>
      <ApplicationsPageContent />
    </AuthGuard>
  );
}
