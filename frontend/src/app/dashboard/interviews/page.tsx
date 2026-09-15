"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { ApplyModal } from "@/components/applications/apply-modal";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { useJobs, useAllApplications } from "@/hooks/use-queries";
import { Calendar, Sparkles } from "lucide-react";
import { useI18n } from "@/i18n";

function InterviewsPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const { data: jobs = [] } = useJobs(user?.organizationId);
  const { data: rawApplications = [] } = useAllApplications();

  const [applyModalOpen, setApplyModalOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Navbar */}
      <Navbar
        onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
        onOpenApplyModal={() => setApplyModalOpen(true)}
        jobsCount={jobs.length}
        candidatesCount={rawApplications.length}
      />

      {/* Main Content: Coming Soon */}
      <main className="flex-1 flex items-center justify-center p-6 max-w-7xl w-full mx-auto">
        <div className="w-full max-w-md p-8 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs text-center space-y-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 mx-auto">
            <Calendar className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
              <Sparkles className="h-3 w-3" />
              <span>{t("interviews.badge")}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t("interviews.title")}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t("interviews.description")}
            </p>
          </div>
          <div className="pt-2">
            <Button
              onClick={() => router.push("/dashboard")}
              className="w-full h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              {t("interviews.backToDashboard")}
            </Button>
          </div>
        </div>
      </main>

      {/* Modals */}
      <ApplyModal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        jobs={jobs}
      />
    </div>
  );
}

export default function InterviewsPage() {
  return (
    <AuthGuard>
      <InterviewsPageContent />
    </AuthGuard>
  );
}
