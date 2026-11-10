"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Navbar } from "@/components/layout";
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

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
        <Navbar activeTab="jobs" />
        <JobWizardEditor mode="create" />
      </div>
    </AuthGuard>
  );
}
