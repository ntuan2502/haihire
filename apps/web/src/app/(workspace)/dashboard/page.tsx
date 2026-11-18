"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  DashboardMetrics,
  DashboardPipeline,
  DashboardRecentApplications,
  DashboardUpcomingInterviews,
  StartRecruiting,
  type DashboardInterviewItem,
} from "@/components/dashboard";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { useAuth } from "@/context/auth-context";
import { useHasPermission } from "@/hooks/use-has-permission";
import {
  useAllJobs,
  useApplications,
  useApplicationStats,
  useCandidates,
  useInterviews,
} from "@/hooks/use-queries";
import { useI18n } from "@/i18n";
import type { ScheduledInterviewInfo } from "@/lib/interviews";
import type { Application } from "@/types";

function DashboardContent() {
  const router = useRouter();
  const { user } = useAuth();
  const canViewCandidates = useHasPermission("candidate:view");
  const { t } = useI18n();

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
    { limit: 1, enabled: canViewCandidates },
  );
  const { data: upcomingInterviewsData, isLoading: interviewsLoading } =
    useInterviews({
      organizationId: user?.organizationId,
      tab: "UPCOMING",
      limit: 25,
    });

  const loading =
    jobsLoading ||
    statsLoading ||
    recentAppsLoading ||
    candidatesLoading ||
    interviewsLoading;

  const openJobsCount = jobs.filter((j) => j.status === "PUBLISHED").length;
  const draftJobsCount = jobs.filter((j) => j.status === "DRAFT").length;
  const totalCandidatesCount = candidatesData?.total ?? 0;
  const totalApplicationsCount = appStats?.totalApplications ?? 0;
  const toReviewCount = appStats?.byStage.APPLIED ?? 0;

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

  const recentApplications = useMemo(() => {
    return (recentAppsData?.data ?? []).filter((a) =>
      Boolean(a.jobId && String(a.jobId).trim() !== ""),
    );
  }, [recentAppsData?.data]);

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="sr-only">{t("dashboard.title")}</h1>
      {loading ? (
        <div className="flex flex-1 items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : jobs.length === 0 ? (
        <StartRecruiting onOpenCreateJob={() => router.push("/jobs/new")} />
      ) : (
        <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
          <DashboardMetrics
            openJobsCount={openJobsCount}
            draftJobsCount={draftJobsCount}
            totalCandidatesCount={totalCandidatesCount}
            totalApplicationsCount={totalApplicationsCount}
            toReviewCount={toReviewCount}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-stretch">
            <DashboardPipeline
              pipelineJobs={pipelineJobs}
              statsByJob={appStats?.byJob}
            />
            <DashboardRecentApplications
              applications={recentApplications}
              jobs={jobs}
            />
            <DashboardUpcomingInterviews
              upcomingInterviews={upcomingInterviews}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
