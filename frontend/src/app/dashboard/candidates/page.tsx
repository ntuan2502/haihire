"use client";

import React, { useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { ApplyModal } from "@/components/applications/apply-modal";
import { CreateJobModal } from "@/components/jobs/create-job-modal";
import { useAuth } from "@/context/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useJobs, useAllApplications } from "@/hooks/use-queries";
import {
  Search,
  Users,
  Plus,
  SlidersHorizontal,
  Columns3,
  Filter,
  Maximize2,
  UploadCloud,
  ChevronDown,
} from "lucide-react";

function CandidatesPageContent() {
  const { user } = useAuth();
  const { data: jobs = [], isLoading: jobsLoading } = useJobs(
    user?.organizationId,
  );
  const { data: applications = [], isLoading: appsLoading } =
    useAllApplications();

  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [createJobModalOpen, setCreateJobModalOpen] = useState(false);

  const activeJobId = selectedJobId ?? (jobs.length > 0 ? jobs[0].id : null);
  const loading = jobsLoading || appsLoading;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Navbar */}
      <Navbar
        activeTab="candidates"
        onOpenCreateJob={() => setCreateJobModalOpen(true)}
        onOpenApplyModal={() => setApplyModalOpen(true)}
        jobsCount={jobs.length}
        candidatesCount={applications.length}
      />

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-[1600px] w-full mx-auto space-y-6">
        {/* Candidates Toolbar matching Screenshot 1 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name or email..."
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
              title="Fullscreen"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setApplyModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-xs cursor-pointer"
            >
              <UploadCloud className="h-3.5 w-3.5 text-slate-400" />
              Import CSV
            </button>

            <Button
              size="sm"
              onClick={() => setApplyModalOpen(true)}
              className="h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 shadow-xs gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              Add Candidate
            </Button>
          </div>
        </div>

        {/* Empty State / Content Area */}
        {applications.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-white p-16 text-center dark:border-slate-800 dark:bg-slate-900 shadow-xs max-w-3xl mx-auto my-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 mb-4">
              <Users className="h-8 w-8 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No candidates yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6">
              Add your first candidate to start building your talent pool.
            </p>
            <Button
              onClick={() => setApplyModalOpen(true)}
              className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 rounded-lg shadow-xs gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              Add Candidate
            </Button>
          </div>
        ) : (
          <KanbanBoard
            jobs={jobs}
            selectedJobId={activeJobId}
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
        selectedJobId={activeJobId}
      />

      {/* Create Job Modal */}
      <CreateJobModal
        isOpen={createJobModalOpen}
        onClose={() => setCreateJobModalOpen(false)}
      />
    </div>
  );
}

export default function CandidatesPage() {
  return (
    <AuthGuard>
      <CandidatesPageContent />
    </AuthGuard>
  );
}
