"use client";

import { useMemo, Suspense, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useJob, useUpdateJobMutation } from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { StatusState } from "@/components/shared/status-state";
import {
  Briefcase,
  ArrowLeft,
  Columns3,
  Table,
  BarChart2,
  Settings,
  ExternalLink,
  ChevronDown,
  Check,
} from "lucide-react";
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

  const { t } = useI18n();
  const canViewSourcing = useHasPermission("sourcing:view");
  const canUpdateJob = useHasPermission("job:update");

  const { data: job, isLoading: jobLoading } = useJob(jobId);
  const updateJobMutation = useUpdateJobMutation();

  // Active tab based on pathname
  const activeNavTab = useMemo(() => {
    if (pathname.includes("/table")) return "table";
    if (pathname.includes("/pipeline")) return "pipeline";
    if (pathname.includes("/promote")) return "promote";
    if (pathname.includes("/settings")) return "settings";
    if (pathname.includes("/source-tracking")) return "source-tracking";
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
      router.push(`/jobs/${jobId}/pipeline`);
    } else if (tabId === "table") {
      router.push(`/jobs/${jobId}/table`);
    } else if (tabId === "settings") {
      router.push(`/jobs/${jobId}/settings`);
    } else if (tabId === "source-tracking") {
      router.push(`/jobs/${jobId}/source-tracking`);
    } else {
      router.push(`/jobs/${jobId}/pipeline`);
    }
  };

  if (jobLoading) {
    return <LoadingSpinner />;
  }

  if (!job) {
    return (
      <div className="flex-1 min-h-0 w-full flex flex-col bg-background text-foreground font-sans">
        <StatusState
          status="404"
          variant="page"
          title={t("careers.jobNotFound")}
          description={t("careers.jobNotFoundDesc")}
          actionLabel={t("jobs.allJobs")}
          actionHref="/jobs"
        />
      </div>
    );
  }

  const jobTypeLabel = getJobTypeLabel(job.type, t);

  return (
    <div className="h-[calc(100dvh-4rem)] group-has-data-[collapsible=icon]/sidebar-wrapper:h-[calc(100dvh-3rem)] min-h-0 w-full flex flex-col bg-background text-foreground font-sans overflow-hidden transition-colors duration-200">
      {/* 1. Job Workspace Header: Two-tier Navigation */}
      <header className="shrink-0 border-b border-border bg-card text-card-foreground z-20">
        {/* Tier 1: Context & Primary Actions */}
        <div className="flex items-center justify-between gap-4 px-4 py-2 sm:px-6 border-b border-border/60">
          {/* Left: Back button & Job Title */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/jobs"
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t("jobs.allJobs")}</span>
            </Link>

            <div className="h-4 w-px bg-border shrink-0" />

            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-foreground border border-border/60 shrink-0">
                <Briefcase className="h-3.5 w-3.5" />
              </div>
              <h1 className="text-xs sm:text-sm font-semibold text-foreground truncate max-w-[200px] sm:max-w-md lg:max-w-xl">
                {job.title}{" "}
                <span className="font-normal text-muted-foreground">
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
              className="h-7 px-2.5 text-xs font-medium bg-background text-foreground hover:bg-accent hover:text-accent-foreground border border-input rounded-md flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
              title={t("jobs.openPublicCareerPage")}
            >
              <ExternalLink className="h-3 w-3" />
              <span className="hidden sm:inline">{t("jobs.careerPage")}</span>
            </a>

            {/* 3-Status Switcher Dropdown (Only for users who can update jobs) */}
            {canUpdateJob && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={`h-7 px-2.5 text-xs font-semibold rounded-md shadow-2xs cursor-pointer transition-colors flex items-center gap-1.5 border whitespace-nowrap ${
                    job.status === "PUBLISHED"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900/60"
                      : job.status === "CLOSED"
                        ? "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
                        : job.status === "ARCHIVED"
                          ? "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                          : "bg-amber-50 text-amber-700 border-amber-200/80 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900/60"
                  }`}
                  title={t("jobs.changeJobStatus")}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      job.status === "PUBLISHED"
                        ? "bg-emerald-500"
                        : job.status === "CLOSED" || job.status === "ARCHIVED"
                          ? "bg-muted-foreground"
                          : "bg-amber-500"
                    }`}
                  />
                  <span>
                    {job.status === "PUBLISHED"
                      ? t("jobs.openStatus")
                      : job.status === "CLOSED"
                        ? t("jobs.closed")
                        : job.status === "ARCHIVED"
                          ? t("jobs.archivedStatus")
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
                      <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                      <span className="font-semibold text-foreground">
                        {t("jobs.closed")}
                      </span>
                    </div>
                    {job.status === "CLOSED" && (
                      <Check className="h-3.5 w-3.5 text-foreground" />
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Tier 2: Feature Navigation Tabs (Dedicated horizontal scrollable bar) */}
        <div className="flex items-center gap-1 px-4 py-1.5 sm:px-6 overflow-x-auto no-scrollbar bg-muted/30 text-xs font-medium text-muted-foreground">
          {[
            {
              id: "pipeline",
              label: t("jobs.tabs.pipeline"),
              icon: Columns3,
            },
            {
              id: "table",
              label: t("jobs.tabs.table"),
              icon: Table,
            },
            ...(canViewSourcing
              ? [
                  {
                    id: "source-tracking",
                    label: t("jobs.tabs.sourceTracking"),
                    icon: BarChart2,
                  },
                ]
              : []),
            ...(canUpdateJob
              ? [
                  {
                    id: "settings",
                    label: t("jobs.tabs.settings"),
                    icon: Settings,
                  },
                ]
              : []),
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeNavTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleNavTabClick(tab.id)}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-background text-foreground font-semibold shadow-2xs border border-border"
                    : "hover:bg-accent hover:text-accent-foreground"
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

export default function JobDetailLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <JobDetailLayoutContent>{children}</JobDetailLayoutContent>
    </Suspense>
  );
}
