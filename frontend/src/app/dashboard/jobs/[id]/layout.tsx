"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, usePathname } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/context/auth-context";
import {
  useJob,
  useJobs,
  useAllApplications,
  useUpdateJobMutation,
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Briefcase,
  ArrowLeft,
  Columns3,
  Megaphone,
  Table,
  Download,
  Mail,
  FileText,
  Zap,
  BarChart2,
  Sparkles,
  Settings,
  Plus,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApplyModal } from "@/components/applications/apply-modal";
import { useI18n } from "@/i18n";

function JobDetailLayoutContent({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const rawJobId = params?.id;
  const jobId = Array.isArray(rawJobId) ? rawJobId[0] : (rawJobId as string);

  const { user } = useAuth();
  const { t } = useI18n();
  const { data: jobs = [] } = useJobs(user?.organizationId);
  const { data: job, isLoading: jobLoading } = useJob(jobId);
  const { data: allApplications = [] } = useAllApplications();
  const updateJobMutation = useUpdateJobMutation();

  const [applyModalOpen, setApplyModalOpen] = useState(false);

  // Active tab based on pathname
  const activeNavTab = React.useMemo(() => {
    if (pathname.includes("/table")) return "table";
    if (pathname.includes("/pipeline")) return "pipeline";
    if (pathname.includes("/promote")) return "promote";
    if (pathname.includes("/settings")) return "settings";
    return "pipeline";
  }, [pathname]);

  const handleToggleJobStatus = async () => {
    if (!job) return;
    const newStatus = job.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      await updateJobMutation.mutateAsync({
        id: job.id,
        data: { status: newStatus },
      });
    } catch (err) {
      console.error("Failed to update job status", err);
    }
  };

  const handleNavTabClick = (tabId: string) => {
    if (tabId === "pipeline") {
      router.push(`/dashboard/jobs/${jobId}/pipeline`);
    } else if (tabId === "table") {
      router.push(`/dashboard/jobs/${jobId}/table`);
    } else if (tabId === "settings") {
      router.push(`/dashboard/jobs/${jobId}/settings`);
    } else {
      router.push(`/dashboard/jobs/${jobId}/pipeline`);
    }
  };

  if (jobLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <LoadingSpinner fullScreen />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="h-screen w-full flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
        <Navbar
          activeTab="jobs"
          onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
          onOpenApplyModal={() => setApplyModalOpen(true)}
          jobsCount={jobs.length}
          candidatesCount={allApplications.length}
        />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
            <Briefcase className="h-6 w-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Job Not Found
          </h2>
          <p className="text-xs text-slate-400 max-w-sm">
            The job you are looking for does not exist or may have been removed.
          </p>
          <Button
            onClick={() => router.push("/dashboard/jobs")}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs cursor-pointer"
          >
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  const jobTypeLabel =
    job.type === "FULL_TIME"
      ? t("jobs.fullTime")
      : job.type === "PART_TIME"
        ? t("jobs.partTime")
        : job.type === "CONTRACT"
          ? t("jobs.contract")
          : t("jobs.internship");

  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden transition-colors duration-200">
      {/* Global Navbar */}
      <div className="shrink-0">
        <Navbar
          activeTab="jobs"
          onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
          onOpenApplyModal={() => setApplyModalOpen(true)}
          jobsCount={jobs.length}
          candidatesCount={allApplications.length}
        />
      </div>

      {/* 1. Job Workspace Header (Matching Screenshot Row 1) */}
      <header className="shrink-0 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 sm:px-6 z-20 shadow-2xs">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left: Back button & Job Title */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/jobs"
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t("jobs.allJobs")}</span>
            </Link>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <Briefcase className="h-3.5 w-3.5" />
              </div>
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-[240px] sm:max-w-md">
                {job.title}{" "}
                <span className="font-normal text-slate-500 dark:text-slate-400">
                  ({jobTypeLabel})
                </span>
              </h1>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  job.status === "PUBLISHED"
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900/60"
                    : "bg-amber-50 text-amber-600 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900/60"
                }`}
              >
                {job.status === "PUBLISHED" ? t("jobs.openStatus") : t("jobs.draftStatus")}
              </span>
            </div>
          </div>

          {/* Middle: Job Feature Tabs */}
          <div className="hidden lg:flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {[
              { id: "pipeline", label: t("jobs.tabs.pipeline"), icon: Columns3, implemented: true },
              { id: "promote", label: t("jobs.tabs.promote"), icon: Megaphone, implemented: false },
              { id: "table", label: t("jobs.tabs.table"), icon: Table, implemented: true },
              { id: "import", label: t("jobs.tabs.import"), icon: Download, implemented: false },
              { id: "inbox", label: t("jobs.tabs.inbox"), icon: Mail, implemented: false },
              { id: "form", label: t("jobs.tabs.applicationForm"), icon: FileText, implemented: false },
              { id: "automation", label: t("jobs.tabs.automation"), icon: Zap, implemented: false },
              { id: "tracking", label: t("jobs.tabs.sourceTracking"), icon: BarChart2, implemented: false },
              { id: "ai", label: t("jobs.tabs.aiAnalysis"), icon: Sparkles, implemented: false },
              { id: "settings", label: t("jobs.tabs.settings"), icon: Settings, implemented: true },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeNavTab === tab.id;
              const isImplemented = tab.implemented;
              return (
                <button
                  key={tab.id}
                  type="button"
                  disabled={!isImplemented}
                  onClick={() => isImplemented && handleNavTabClick(tab.id)}
                  title={!isImplemented ? `${tab.label} (${t("common.comingSoon")})` : undefined}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    !isImplemented
                      ? "opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600"
                      : isActive
                        ? "bg-slate-100 text-slate-900 font-bold dark:bg-slate-800 dark:text-white cursor-pointer"
                        : "hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-slate-800/60 dark:hover:text-slate-200 cursor-pointer"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setApplyModalOpen(true)}
              className="h-7 px-2.5 text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 shadow-2xs rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="h-3 w-3" />
              <span>{t("candidates.addCandidate")}</span>
            </Button>

            <button
              type="button"
              onClick={handleToggleJobStatus}
              className={`h-7 px-3 text-xs font-bold rounded-lg shadow-2xs cursor-pointer transition-colors ${
                job.status === "PUBLISHED"
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {job.status === "PUBLISHED" ? t("jobs.closed") : t("jobs.openStatus")}
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(`/dashboard/candidates?jobId=${job.id}`)
              }
              className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={t("jobs.moreOptions")}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Area (Sub-pages render here) */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {children}
      </div>

      {/* Apply Modal */}
      <ApplyModal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        jobs={jobs}
        selectedJobId={job.id}
      />
    </div>
  );
}

export default function JobDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <JobDetailLayoutContent>{children}</JobDetailLayoutContent>
      </Suspense>
    </AuthGuard>
  );
}
