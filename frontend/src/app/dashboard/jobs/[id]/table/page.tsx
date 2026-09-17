"use client";

import React, { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  useJob,
  useJobs,
  useAllApplications,
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ApplicationsDataTable } from "@/components/applications/applications-data-table";

function JobTablePageContent() {
  const params = useParams();
  const router = useRouter();
  const rawJobId = params?.id;
  const jobId = Array.isArray(rawJobId) ? rawJobId[0] : (rawJobId as string);

  const { user } = useAuth();
  const { data: jobs = [] } = useJobs(user?.organizationId);
  const { data: job, isLoading: jobLoading } = useJob(jobId);
  const { data: allApplications = [], isLoading: appsLoading } =
    useAllApplications();

  const jobApplications = React.useMemo(() => {
    if (!jobId) return [];
    return allApplications.filter((a) => String(a.jobId) === String(jobId));
  }, [allApplications, jobId]);

  if (jobLoading || appsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!job) return null;

  return (
    <main className="flex-1 min-h-0 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto space-y-4">
      <ApplicationsDataTable
        applications={jobApplications}
        jobs={jobs}
        loading={jobLoading || appsLoading}
        fixedJobId={job.id}
        onViewInPipeline={(_appId, stage) => {
          router.push(`/dashboard/jobs/${jobId}/pipeline?stage=${stage}`);
        }}
      />
    </main>
  );
}

export default function JobTablePage() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <JobTablePageContent />
    </Suspense>
  );
}
