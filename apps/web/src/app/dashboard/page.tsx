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
  useApplicationStats,
  useApplications,
  useCandidates,
  useCreateJobMutation,
  useInterviews,
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import type { Application } from "@/types";
import { useI18n } from "@/i18n";

function DashboardContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();

  // TanStack Query - Real data from Database
  const { data: jobs = [], isLoading: jobsLoading } = useAllJobs(
    user?.organizationId,
  );
  const { data: appStats, isLoading: statsLoading } = useApplicationStats(
    user?.organizationId,
  );
  const { data: recentAppsData, isLoading: recentAppsLoading } =
    useApplications({
      organizationId: user?.organizationId,
      page: 1,
      limit: 25,
    });
  const { data: candidatesData, isLoading: candidatesLoading } = useCandidates(
    user?.organizationId,
    { limit: 1 },
  );
  const { data: upcomingInterviewsData, isLoading: interviewsLoading } =
    useInterviews({
      organizationId: user?.organizationId,
      tab: "UPCOMING",
      limit: 25,
    });
  const createJobMutation = useCreateJobMutation();

  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const loading =
    jobsLoading ||
    statsLoading ||
    recentAppsLoading ||
    candidatesLoading ||
    interviewsLoading;

  // Real database metrics computation (server SQL stats + total counts, never truncated to 100)
  const openJobsCount = jobs.filter((j) => j.status === "PUBLISHED").length;
  const draftJobsCount = jobs.filter((j) => j.status === "DRAFT").length;
  const totalCandidatesCount = candidatesData?.total ?? 0;
  const totalApplicationsCount = appStats?.totalApplications ?? 0;
  const toReviewCount = appStats?.byStage.APPLIED ?? 0;

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

  // Upcoming interviews from paginated server query
  const upcomingInterviews = useMemo(() => {
    const results: DashboardInterviewItem[] = [];

    for (const intv of upcomingInterviewsData?.data ?? []) {
      const app: Application = intv.application ?? {
        id: intv.applicationId,
        candidateId: "",
        jobId: intv.jobId || "",
        candidateName: intv.candidateName || "",
        candidateEmail: intv.candidateEmail || "",
        resumeUrl: "",
        resumeFileName: "",
        stage: "INTERVIEW",
        orderIndex: 0,
        createdAt: intv.createdAt,
        updatedAt: intv.updatedAt,
      };
      const job = jobs.find((j) => j.id === (app.jobId || intv.jobId));

      const scheduledInfo: ScheduledInterviewInfo = {
        id: intv.id,
        applicationId: intv.applicationId,
        scheduledAt: intv.scheduledAt,
        type: intv.type,
        format: intv.format,
        linkOrLocation: intv.linkOrLocation,
        interviewer: intv.interviewer,
        notes: intv.notes ?? undefined,
        round: intv.round,
        scorecard: intv.scorecard ?? undefined,
      };

      results.push({
        application: app,
        interview: scheduledInfo,
        job,
      });
    }

    results.sort((a, b) => {
      const msA = a.interview.scheduledAt
        ? new Date(a.interview.scheduledAt).getTime()
        : 0;
      const msB = b.interview.scheduledAt
        ? new Date(b.interview.scheduledAt).getTime()
        : 0;
      return msA - msB;
    });

    return results;
  }, [upcomingInterviewsData?.data, jobs]);

  // Recent applications (only active job applications)
  const recentApplications = useMemo(() => {
    return (recentAppsData?.data ?? []).filter((a) =>
      Boolean(a.jobId && String(a.jobId).trim() !== ""),
    );
  }, [recentAppsData?.data]);

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
      <main id="main-content" className="flex-1">
        <h1 className="sr-only">{t("dashboard.title")}</h1>
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
                      {/* COLUMN 1: HIRING PIPELINE */}
                      <DashboardPipeline
                        pipelineJobs={pipelineJobs}
                        statsByJob={appStats?.byJob}
                      />

                      {/* COLUMN 2: RECENT APPLICATIONS */}
                      <DashboardRecentApplications
                        applications={recentApplications}
                        jobs={jobs}
                      />

                      {/* COLUMN 3: UPCOMING INTERVIEWS */}
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
