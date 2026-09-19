"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Navbar } from "@/components/layout";
import { useAuth } from "@/context/auth-context";
import { useJobs, useApplications, useCandidates } from "@/hooks/use-queries";
import { ApplicationsDataTable } from "@/components/applications/applications-data-table";

function ApplicationsPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState("");

  const { data: jobs = [], isLoading: jobsLoading } = useJobs(
    user?.organizationId,
  );
  const { data: applicationsData, isLoading: appsLoading } = useApplications({
    organizationId: user?.organizationId,
    page: currentPage,
    limit: rowsPerPage,
    search: search.trim() || undefined,
  });
  const { data: candidatesData } = useCandidates(user?.organizationId);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Navbar */}
      <Navbar
        activeTab="applications"
        onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
        jobsCount={jobs.length}
        candidatesCount={candidatesData?.total || 0}
      />

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto space-y-4">
        <ApplicationsDataTable
          applications={applicationsData?.data || []}
          jobs={jobs}
          loading={jobsLoading || appsLoading}
          totalCount={applicationsData?.total ?? 0}
          totalPages={applicationsData?.totalPages ?? 1}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          search={search}
          onPageChange={setCurrentPage}
          onLimitChange={(limit) => {
            setRowsPerPage(limit);
            setCurrentPage(1);
          }}
          onSearchChange={(q) => {
            setSearch(q);
            setCurrentPage(1);
          }}
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
