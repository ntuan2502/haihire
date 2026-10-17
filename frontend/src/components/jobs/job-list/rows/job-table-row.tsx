"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Share2, Check, Eye, Pencil, Trash2 } from "lucide-react";
import type { Job } from "@/types";
import { JobStatusBadge } from "@/components/shared/job-status-badge";
import { useI18n } from "@/i18n";
import { getJobTypeLabel } from "@/lib/jobs";
import type { JobStageCounts, VisibleColumns } from "../types";
import { JobStageBadgeGroup } from "./job-stage-badge-group";

export interface JobTableRowProps {
  job: Job;
  counts: JobStageCounts;
  visibleColumns: VisibleColumns;
  copiedJobId: string | null;
  onCopyLink: (job: Job) => void;
  onDeleteJob: (jobId: string) => void;
}

export function JobTableRow({
  job,
  counts,
  visibleColumns,
  copiedJobId,
  onCopyLink,
  onDeleteJob,
}: JobTableRowProps) {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group">
      {/* 1. Job Title & Meta (Always Visible) */}
      <td className="py-4 px-5">
        <div className="space-y-1">
          <Link
            href={`/dashboard/jobs/${job.id}/pipeline`}
            className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors block"
          >
            {job.title}
          </Link>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 flex-wrap">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {job.department || "General"}
            </span>
            <span>•</span>
            <span>{getJobTypeLabel(job.type, t)}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-0.5">
              <MapPin
                className="h-3 w-3 text-slate-400 shrink-0"
                aria-hidden="true"
              />
              {job.location || "Remote"}
            </span>
          </div>
        </div>
      </td>

      {/* 2. Status Badge */}
      {visibleColumns.status && (
        <td className="py-4 px-4 whitespace-nowrap">
          <JobStatusBadge status={job.status} />
        </td>
      )}

      {/* 3. Pipeline Funnel Progress Bar & Stage Pills */}
      {visibleColumns.pipeline && (
        <td className="py-4 px-4">
          <JobStageBadgeGroup jobId={job.id} counts={counts} />
        </td>
      )}

      {/* 4. New Applicants / To Review */}
      {visibleColumns.applicants && (
        <td className="py-4 px-4 whitespace-nowrap">
          {counts.new > 0 ? (
            <button
              type="button"
              onClick={() =>
                router.push(`/dashboard/jobs/${job.id}/pipeline?stage=APPLIED`)
              }
              aria-label={`${counts.new} ${t("jobs.newApplicants").toLowerCase()} - ${job.title}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/60 cursor-pointer hover:bg-amber-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <span
                className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"
                aria-hidden="true"
              />
              <span>
                {counts.new} {t("jobs.newApplicants").toLowerCase()}
              </span>
            </button>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 text-xs font-medium">
              {counts.total} {t("pipeline.stageCounts")}
            </span>
          )}
        </td>
      )}

      {/* 5. Actions */}
      <td className="py-4 px-5 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCopyLink(job);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={t("jobs.copyPublicApplyLink")}
            aria-label={`${t("jobs.copyPublicApplyLink")}: ${job.title}`}
          >
            {copiedJobId === job.id ? (
              <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            ) : (
              <Share2 className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          {/* Quick View (Pipeline/Overview) */}
          <Link
            href={`/dashboard/jobs/${job.id}/pipeline`}
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center"
            title={t("common.view")}
            aria-label={`${t("common.view")}: ${job.title}`}
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
          </Link>

          {/* Quick Edit (Settings) */}
          <Link
            href={`/dashboard/jobs/${job.id}/settings`}
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center"
            title={t("common.edit")}
            aria-label={`${t("common.edit")}: ${job.title}`}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Link>

          {/* Quick Delete */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteJob(job.id);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer inline-flex items-center"
            title={t("common.delete")}
            aria-label={`${t("common.delete")}: ${job.title}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  );
}
