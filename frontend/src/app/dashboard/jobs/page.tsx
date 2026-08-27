"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { JobList } from "@/components/jobs/job-list";
import { CreateJobModal } from "@/components/jobs/create-job-modal";
import { ApplyModal } from "@/components/applications/apply-modal";
import { StartRecruiting } from "@/components/dashboard/start-recruiting";
import { jobsApi, applicationsApi } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import type { Job, Application } from "@/types";

function JobsPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [createJobModalOpen, setCreateJobModalOpen] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);

  // Fetch jobs and applications for this organization
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
      console.error("Failed to load jobs data", err);
    } finally {
      setLoading(false);
    }
  }, [selectedJobId, user?.organizationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Quick action: Create a test job
  const handleCreateTestJob = async () => {
    try {
      const testJob = await jobsApi.create({
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
      await fetchData();
      setSelectedJobId(testJob.id);
    } catch (err) {
      console.error("Create test job error", err);
    }
  };

  const handleJobDeleted = (id: number) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setApplications((prev) => prev.filter((a) => a.jobId !== id));
    if (selectedJobId === id) {
      const remaining = jobs.filter((j) => j.id !== id);
      setSelectedJobId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Navbar with activeTab="jobs" */}
      <Navbar
        activeTab="jobs"
        onTabChange={(tab) => {
          if (tab === "dashboard") router.push("/dashboard");
          else if (tab === "jobs") router.push("/dashboard/jobs");
          else router.push(`/dashboard?tab=${tab}`);
        }}
        onOpenCreateJob={() => setCreateJobModalOpen(true)}
        onOpenApplyModal={() => setApplyModalOpen(true)}
        jobsCount={jobs.length}
        candidatesCount={applications.length}
      />

      {/* Main Content */}
      <main className="flex-1">
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
                router.push(`/dashboard?tab=candidates&jobId=${jobId}`);
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
      </main>

      {/* Create Job Modal */}
      <CreateJobModal
        isOpen={createJobModalOpen}
        onClose={() => setCreateJobModalOpen(false)}
        onJobCreated={fetchData}
      />

      {/* Apply Modal */}
      <ApplyModal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        jobs={jobs}
        selectedJobId={selectedJobId}
        onApplicationSubmitted={fetchData}
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
