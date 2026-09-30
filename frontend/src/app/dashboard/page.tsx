"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Navbar, type NavTab } from "@/components/layout";
import {
  StartRecruiting,
  DashboardMetrics,
  DashboardPipeline,
  DashboardRecentApplications,
  DashboardUpcomingInterviews,
  type DashboardInterviewItem,
} from "@/components/dashboard";
import { useAuth } from "@/context/auth-context";
import {
  useAllJobs,
  useAllApplications,
  useCreateJobMutation,
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { getInterviewsFromApplication } from "@/lib/interviews";

function DashboardContent() {
  const router = useRouter();
  const { user } = useAuth();

  // TanStack Query - Real data from Database
  const { data: jobs = [], isLoading: jobsLoading } = useAllJobs(
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
    applications.map((a) =>
      (a.candidateEmail || a.candidateName).toLowerCase().trim(),
    ),
  ).size;
  const totalApplicationsCount = applications.filter((a) =>
    Boolean(a.jobId && String(a.jobId).trim() !== ""),
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
    const results: DashboardInterviewItem[] = [];

    for (const app of applications) {
      const all = getInterviewsFromApplication(app);
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
  const recentApplications = useMemo(() => {
    return applications
      .filter((a) => Boolean(a.jobId && String(a.jobId).trim() !== ""))
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime(),
      )
      .slice(0, 25);
  }, [applications]);

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
                  <div className="w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-10 space-y-6">
                    {/* Top Stat Cards Grid */}
                    <DashboardMetrics
                      openJobsCount={openJobsCount}
                      draftJobsCount={draftJobsCount}
                      totalCandidatesCount={totalCandidatesCount}
                      totalApplicationsCount={totalApplicationsCount}
                      toReviewCount={toReviewCount}
                    />

                    {/* Main 3-Column Equal Dashboard Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                      {/* COLUMN 1: QUY TRÌNH TUYỂN DỤNG (Hiring Pipeline) */}
                      <DashboardPipeline
                        pipelineJobs={pipelineJobs}
                        applications={applications}
                      />

                      {/* COLUMN 2: HỒ SƠ ỨNG TUYỂN GẦN ĐÂY (Recent Applications) */}
                      <DashboardRecentApplications
                        applications={recentApplications}
                        jobs={jobs}
                      />

                      {/* COLUMN 3: LỊCH PHỎNG VẤN SẮP TỚI (Upcoming Interviews) */}
                      <DashboardUpcomingInterviews
                        upcomingInterviews={upcomingInterviews}
                      />
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
