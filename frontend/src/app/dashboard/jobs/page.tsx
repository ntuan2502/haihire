"use client";

import React, { useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { JobList } from "@/components/jobs/job-list";
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

function JobsPageContent() {
  const router = useRouter();
  const { user } = useAuth();

  // TanStack Query Hooks
  const { data: jobs = [], isLoading: jobsLoading } = useJobs(
    user?.organizationId,
  );
  const { data: applications = [] } = useAllApplications();
  const createJobMutation = useCreateJobMutation();
  const deleteJobMutation = useDeleteJobMutation();

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [applyModalOpen, setApplyModalOpen] = useState(false);

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
    } catch (err) {
      console.error("Create test job error", err);
    }
  };

  const handleJobDeleted = (id: string) => {
    deleteJobMutation.mutate(id);
    if (selectedJobId === id) {
      const remaining = jobs.filter((j) => j.id !== id);
      setSelectedJobId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Navbar */}
      <Navbar
        activeTab="jobs"
        onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
        onOpenApplyModal={() => setApplyModalOpen(true)}
        jobsCount={jobs.length}
        candidatesCount={applications.length}
      />

      {/* Main Content */}
      <main className="flex-1">
        {jobsLoading ? (
          <LoadingSpinner />
        ) : jobs.length === 0 ? (
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
              loading={jobsLoading}
              onViewCandidates={(jobId: string) => {
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
      </main>


      {/* Apply Modal */}
      <ApplyModal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        jobs={jobs}
        selectedJobId={selectedJobId}
      />
    </div>
  );
}

export default function JobsPage() {
  return (
    <AuthGuard>
      <JobsPageContent />
    </AuthGuard>
  );
}
