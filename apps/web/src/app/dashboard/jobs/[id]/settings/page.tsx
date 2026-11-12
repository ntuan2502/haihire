"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { useJob } from "@/hooks/use-queries";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useI18n } from "@/i18n";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { StatusState } from "@/components/shared/status-state";
import { JobWizardEditor } from "@/components/jobs/job-wizard-editor";

function JobSettingsPageContent() {
  const params = useParams();
  const rawJobId = params?.id;
  const jobId = Array.isArray(rawJobId) ? rawJobId[0] : (rawJobId as string);

  const { t } = useI18n();
  const canUpdateJob = useHasPermission("job:update");
  const { data: job, isLoading } = useJob(jobId);

  if (!canUpdateJob) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <StatusState
          status="403"
          variant="card"
          title={t("common.accessDenied")}
          description={t("errors.FORBIDDEN_READ_ONLY")}
          actionLabel={t("jobs.allJobs")}
          actionHref={`/dashboard/jobs/${jobId}/pipeline`}
          className="w-full max-w-lg"
        />
      </div>
    );
  }

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
