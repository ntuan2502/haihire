"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { JobWizardEditor } from "@/components/jobs/job-wizard-editor";
import { useAuth } from "@/context/auth-context";
import { usePermissionState } from "@/hooks/use-has-permission";

export default function CreateJobPage() {
  const router = useRouter();
  const { loading } = useAuth();
  const { allowed: canCreateJob, isLoading: permLoading } =
    usePermissionState("job:create");

  useEffect(() => {
    if (!loading && !permLoading && !canCreateJob) {
      router.replace("/jobs");
    }
  }, [loading, permLoading, canCreateJob, router]);

  return <JobWizardEditor mode="create" />;
}
