"use client";

import React, { Suspense } from "react";
import { useParams } from "next/navigation";
import { useJob } from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { JobWizardEditor } from "@/components/jobs/job-wizard-editor";

function JobSettingsPageContent() {
  const params = useParams();
  const rawJobId = params?.id;
  const jobId = Array.isArray(rawJobId) ? rawJobId[0] : (rawJobId as string);

  const { data: job, isLoading } = useJob(jobId);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!job) {
    return null;
  }

  return <JobWizardEditor mode="edit" initialJob={job} />;
}

export default function JobSettingsPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <JobSettingsPageContent />
    </Suspense>
  );
}
