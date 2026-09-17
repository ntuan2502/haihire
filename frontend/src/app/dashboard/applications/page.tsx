"use client";

import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Navbar } from "@/components/layout";
import { useAuth } from "@/context/auth-context";
import { useJobs, useAllApplications } from "@/hooks/use-queries";
import { ApplicationsDataTable } from "@/components/applications/applications-data-table";

function ApplicationsPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: jobs = [], isLoading: jobsLoading } = useJobs(
    user?.organizationId,
  );
  const { data: rawApplications = [], isLoading: appsLoading } =
    useAllApplications();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Navbar */}
      <Navbar
        activeTab="applications"
        onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
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
