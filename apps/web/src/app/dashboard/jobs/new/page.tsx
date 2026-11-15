"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { JobWizardEditor } from "@/components/jobs/job-wizard-editor";
import { useAuth } from "@/context/auth-context";
import { useHasPermission } from "@/hooks/use-has-permission";

export default function CreateJobPage() {
  const router = useRouter();
  const { loading } = useAuth();
  const canCreateJob = useHasPermission("job:create");

  useEffect(() => {
    if (!loading && !canCreateJob) {
      router.replace("/dashboard/jobs");
    }
  }, [loading, canCreateJob, router]);

  return <JobWizardEditor mode="create" />;
}
