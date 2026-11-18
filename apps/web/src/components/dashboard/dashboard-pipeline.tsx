"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, Briefcase, ArrowRight } from "lucide-react";
import { usePipelineStages } from "@/lib/stages";
import { useI18n } from "@/i18n";
import type { Job, Application, ApplicationStage } from "@/types";
import type { ApplicationStats } from "@haihire/shared";

interface DashboardPipelineProps {
  pipelineJobs: Job[];
  applications?: Application[];
  statsByJob?: ApplicationStats["byJob"];
  canCreateJob?: boolean;
}

export function DashboardPipeline({
  pipelineJobs,
  applications = [],
  statsByJob,
  canCreateJob = true,
}: DashboardPipelineProps) {
  const router = useRouter();
  const { t } = useI18n();
  const pipelineStages = usePipelineStages();

  return (
    <div className="flex flex-col h-[600px] rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 pb-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
          <h3 className="text-sm font-bold text-foreground truncate">
            {t("dashboard.hiringPipeline")}
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/60 shrink-0">
            {pipelineJobs.length}
          </span>
        </div>
        <Link
          href="/jobs"
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 transition-colors shrink-0"
        >
          <span>{t("dashboard.allJobs")}</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Scrollable Pipeline Jobs Content */}
      {pipelineJobs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center space-y-2">
          <Briefcase className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground font-medium">
            {t("dashboard.noActiveJobs")}
          </p>
          {canCreateJob && (
            <Link
              href="/jobs"
              className="text-xs font-semibold text-primary hover:underline"
            >
              {t("jobs.createJob")}
            </Link>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pt-3 pr-1.5 -mr-1.5 space-y-3">
          {pipelineJobs.map((job) => {
            const jobStats = statsByJob?.[job.id];
            const stageCounts: Record<ApplicationStage, number> = {
              APPLIED: jobStats?.byStage.APPLIED ?? 0,
              SCREENING: jobStats?.byStage.SCREENING ?? 0,
              INTERVIEW: jobStats?.byStage.INTERVIEW ?? 0,
              OFFER: jobStats?.byStage.OFFER ?? 0,
              HIRED: jobStats?.byStage.HIRED ?? 0,
              REJECTED: jobStats?.byStage.REJECTED ?? 0,
            };
            let totalPipeline = jobStats?.total ?? 0;

            if (!statsByJob) {
              const jobApps = applications.filter((a) => a.jobId === job.id);
              totalPipeline = jobApps.length;
              for (const a of jobApps) {
                if (stageCounts[a.stage] !== undefined) {
                  stageCounts[a.stage]++;
                }
              }
            }

            return (
              <div
                key={job.id}
                className="p-3.5 rounded-lg border border-border/80 bg-muted/30 space-y-2.5 transition-colors hover:border-border"
              >
                {/* Job Title & Total Candidates */}
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/jobs/${job.id}/pipeline`}
                    className="text-xs font-bold text-foreground hover:text-primary transition-colors truncate"
                    title={job.title}
                  >
                    {job.title}
                  </Link>
                  <span className="text-[10px] font-semibold text-muted-foreground shrink-0 bg-background px-2 py-0.5 rounded-full border border-border">
                    {totalPipeline} {t("pipeline.stageCounts")}
                  </span>
                </div>

                {/* Multi-segment Progress Bar */}
                <div className="h-1.5 w-full rounded-full bg-muted flex overflow-hidden">
                  {pipelineStages.map((stage) => {
                    const count = stageCounts[stage.id] || 0;
                    const pct =
                      totalPipeline > 0 ? (count / totalPipeline) * 100 : 0;
                    if (pct <= 0) return null;
                    return (
                      <div
                        key={stage.id}
                        style={{ width: `${pct}%` }}
                        className={`${stage.barColor} h-full`}
                        title={`${stage.label}: ${count}`}
                      />
                    );
                  })}
                </div>

                {/* 6 Stage Metric Cards (Streamlined Compact Pills) */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 pt-0.5">
                  {pipelineStages.map((stage) => {
                    const count = stageCounts[stage.id] || 0;
                    const displayLabel = stage.label;

                    return (
                      <button
                        type="button"
                        key={stage.id}
                        onClick={() =>
                          router.push(
                            `/jobs/${job.id}/pipeline?stage=${stage.id}`,
                          )
                        }
                        className={`flex items-center justify-between px-1.5 py-1 rounded-md ${stage.cardBg} border ${stage.cardBorder} cursor-pointer ${stage.cardHover} transition-all hover:scale-[1.02] text-left`}
                        title={`${stage.label}: ${count}`}
                        aria-label={`${stage.label}: ${count}`}
                      >
                        <span
                          className={`text-[9px] font-semibold ${stage.textColor} opacity-85 truncate mr-0.5`}
                        >
                          {displayLabel}
                        </span>
                        <span
                          className={`text-[11px] font-black ${stage.textColor} shrink-0`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
