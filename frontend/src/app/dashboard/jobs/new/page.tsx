"use client";

import React from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { JobWizardEditor } from "@/components/jobs/job-wizard-editor";

export default function CreateJobPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
        <Navbar activeTab="jobs" />
        <JobWizardEditor mode="create" />
      </div>
    </AuthGuard>
  );
}
