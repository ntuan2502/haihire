"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { useJob } from "@/hooks/use-queries";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useI18n } from "@/i18n";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
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
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          {t("common.accessDenied")}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
          {t("errors.FORBIDDEN_READ_ONLY")}
        </p>
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
