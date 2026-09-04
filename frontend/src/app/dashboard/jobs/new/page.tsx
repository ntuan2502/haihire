"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { JobWizardEditor } from "@/components/jobs/job-wizard-editor";
import { useAuth } from "@/context/auth-context";

export default function CreateJobPage() {
  const router = useRouter();
  const { canEdit, loading } = useAuth();

  useEffect(() => {
    if (!loading && !canEdit) {
      router.replace("/dashboard/jobs");
    }
  }, [loading, canEdit, router]);

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
        <Navbar activeTab="jobs" />
        <JobWizardEditor mode="create" />
      </div>
    </AuthGuard>
  );
}
