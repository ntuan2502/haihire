"use client";

import React, { useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { ApplyModal } from "@/components/applications/apply-modal";
import { CreateJobModal } from "@/components/jobs/create-job-modal";
import { useAuth } from "@/context/auth-context";
import { useJobs, useAllApplications } from "@/hooks/use-queries";
import { ApplicationsDataTable } from "@/components/applications/applications-data-table";

function ApplicationsPageContent() {
  const { user } = useAuth();
  const { data: jobs = [], isLoading: jobsLoading } = useJobs(
    user?.organizationId,
  );
  const { data: rawApplications = [], isLoading: appsLoading } =
    useAllApplications();

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [createJobModalOpen, setCreateJobModalOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Navbar */}
      <Navbar
        activeTab="applications"
        onOpenCreateJob={() => setCreateJobModalOpen(true)}
        onOpenApplyModal={() => setApplyModalOpen(true)}
        jobsCount={jobs.length}
        candidatesCount={rawApplications.length}
      />

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto space-y-4">
        <ApplicationsDataTable
          applications={rawApplications}
          jobs={jobs}
          loading={jobsLoading || appsLoading}
        />
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

export default function ApplicationsPage() {
  return (
    <AuthGuard>
      <ApplicationsPageContent />
    </AuthGuard>
  );
}
