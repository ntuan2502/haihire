"use client";

import { useMemo, Suspense, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter, usePathname } from "next/navigation";
import { AuthGuard } from "@/components/shared/auth-guard";
import { Navbar } from "@/components/layout";
import { useAuth } from "@/context/auth-context";
import {
  useJob,
  useAllJobs,
  useCandidates,
  useUpdateJobMutation,
} from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
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
  MoreHorizontal,
  ExternalLink,
  ChevronDown,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobStatusBadge } from "@/components/shared/job-status-badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { JobStatus } from "@/types";
import { getJobPublicUrl } from "@/lib/utils";
import { getJobTypeLabel } from "@/lib/jobs";
import { useI18n } from "@/i18n";

function JobDetailLayoutContent({ children }: { children: ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const rawJobId = params?.id;
  const jobId = Array.isArray(rawJobId) ? rawJobId[0] : (rawJobId as string);

  const { user } = useAuth();
  const { t } = useI18n();
  const { data: jobs = [] } = useAllJobs(user?.organizationId);
  const { data: job, isLoading: jobLoading } = useJob(jobId);
  const { data: candidatesData } = useCandidates(user?.organizationId);
  const updateJobMutation = useUpdateJobMutation();

  // Active tab based on pathname
  const activeNavTab = useMemo(() => {
    if (pathname.includes("/table")) return "table";
    if (pathname.includes("/pipeline")) return "pipeline";
    if (pathname.includes("/promote")) return "promote";
    if (pathname.includes("/settings")) return "settings";
    return "pipeline";
  }, [pathname]);

  const handleUpdateJobStatus = async (newStatus: JobStatus) => {
    if (!job || job.status === newStatus) return;
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
          jobsCount={jobs.length}
        />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
            <Briefcase className="h-6 w-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {t("careers.jobNotFound")}
          </h2>
          <p className="text-xs text-slate-400 max-w-sm">
            {t("careers.jobNotFoundDesc")}
          </p>
          <Button
            onClick={() => router.push("/dashboard/jobs")}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs cursor-pointer"
          >
            {t("jobs.allJobs")}
          </Button>
        </div>
      </div>
    );
  }

  const jobTypeLabel = getJobTypeLabel(job.type, t);

  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden transition-colors duration-200">
      {/* Global Navbar */}
      <div className="shrink-0">
        <Navbar
          activeTab="jobs"
          onOpenCreateJob={() => router.push("/dashboard/jobs/new")}
          jobsCount={jobs.length}
          candidatesCount={candidatesData?.total || 0}
        />
      </div>

      {/* 1. Job Workspace Header: Two-tier Navigation */}
      <header className="shrink-0 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 z-20 shadow-2xs">
        {/* Tier 1: Context & Primary Actions */}
        <div className="flex items-center justify-between gap-4 px-4 py-2 sm:px-6 border-b border-slate-100 dark:border-slate-800/60">
          {/* Left: Back button & Job Title */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard/jobs"
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t("jobs.allJobs")}</span>
            </Link>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shrink-0">
                <Briefcase className="h-3.5 w-3.5" />
              </div>
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-md lg:max-w-xl">
                {job.title}{" "}
                <span className="font-normal text-slate-500 dark:text-slate-400">
                  ({jobTypeLabel})
                </span>
              </h1>
              <div className="shrink-0">
                <JobStatusBadge status={job.status} />
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={getJobPublicUrl(job)}
              target="_blank"
              rel="noopener noreferrer"
              className="h-7 px-2.5 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/80 border border-blue-200/80 dark:border-blue-800/80 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
              title={t("jobs.openPublicCareerPage")}
            >
              <ExternalLink className="h-3 w-3" />
              <span className="hidden sm:inline">{t("jobs.careerPage")}</span>
            </a>

            {/* 3-Status Switcher Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={`h-7 px-2.5 text-xs font-bold rounded-lg shadow-2xs cursor-pointer transition-colors flex items-center gap-1.5 border whitespace-nowrap ${
                  job.status === "PUBLISHED"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900/60"
                    : job.status === "CLOSED"
                      ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                      : "bg-amber-50 text-amber-700 border-amber-200/80 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900/60"
                }`}
                title={t("jobs.changeJobStatus")}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    job.status === "PUBLISHED"
                      ? "bg-emerald-500"
                      : job.status === "CLOSED"
                        ? "bg-slate-400"
                        : "bg-amber-500"
                  }`}
                />
                <span>
                  {job.status === "PUBLISHED"
                    ? t("jobs.openStatus")
                    : job.status === "CLOSED"
                      ? t("jobs.closed")
                      : t("jobs.draftStatus")}
                </span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => handleUpdateJobStatus("PUBLISHED")}
                  className="text-xs flex items-center justify-between cursor-pointer py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                      {t("jobs.openStatus")}
                    </span>
                  </div>
                  {job.status === "PUBLISHED" && (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleUpdateJobStatus("DRAFT")}
                  className="text-xs flex items-center justify-between cursor-pointer py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="font-semibold text-amber-700 dark:text-amber-300">
                      {t("jobs.draftStatus")}
                    </span>
                  </div>
                  {job.status === "DRAFT" && (
                    <Check className="h-3.5 w-3.5 text-amber-600" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleUpdateJobStatus("CLOSED")}
                  className="text-xs flex items-center justify-between cursor-pointer py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {t("jobs.closed")}
                    </span>
                  </div>
                  {job.status === "CLOSED" && (
                    <Check className="h-3.5 w-3.5 text-slate-600" />
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              onClick={() =>
                router.push(`/dashboard/candidates?jobId=${job.id}`)
              }
              className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title={t("jobs.moreOptions")}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Tier 2: Feature Navigation Tabs (Dedicated horizontal scrollable bar) */}
        <div className="flex items-center gap-1 px-4 py-1.5 sm:px-6 overflow-x-auto no-scrollbar bg-slate-50/60 dark:bg-slate-950/40 text-xs font-medium text-slate-500 dark:text-slate-400">
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
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  !isImplemented
                    ? "opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600"
                    : isActive
                      ? "bg-white text-blue-600 font-bold dark:bg-slate-800 dark:text-blue-400 shadow-2xs border border-slate-200/80 dark:border-slate-700/80 cursor-pointer"
                      : "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800/60 dark:hover:text-slate-200 cursor-pointer"
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Workspace Area (Sub-pages render here) */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default function JobDetailLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthGuard>
      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <JobDetailLayoutContent>{children}</JobDetailLayoutContent>
      </Suspense>
    </AuthGuard>
  );
}
