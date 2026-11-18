"use client";

import Link from "next/link";
import { MapPin, ExternalLink, Eye, Pencil, Trash2 } from "lucide-react";
import type { Job } from "@/types";
import { JobStatusBadge } from "@/components/shared/job-status-badge";
import { useI18n } from "@/i18n";
import { getJobTypeLabel } from "@/lib/jobs";
import { getJobPublicUrl } from "@/lib/utils";
import type { JobStageCounts, VisibleColumns } from "../types";
import { JobStageBadgeGroup } from "./job-stage-badge-group";
import { useHasPermission } from "@/hooks/use-has-permission";

export interface JobTableRowProps {
  job: Job;
  counts: JobStageCounts;
  visibleColumns: VisibleColumns;
  onDeleteJob: (jobId: string) => void;
}

export function JobTableRow({
  job,
  counts,
  visibleColumns,
  onDeleteJob,
}: JobTableRowProps) {
  const canUpdateJob = useHasPermission("job:update");
  const canDeleteJob = useHasPermission("job:delete");
  const { t } = useI18n();

  return (
    <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group">
      {/* 1. Job Title & Meta (Always Visible) */}
      <td className="py-4 px-5">
        <div className="space-y-1">
          <Link
            href={`/jobs/${job.id}/pipeline`}
            className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors block"
          >
            {job.title}
          </Link>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 flex-wrap">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {job.department || t("jobs.wizard.generalDepartment")}
            </span>
            <span>•</span>
            <span>{getJobTypeLabel(job.type, t)}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-0.5">
              <MapPin
                className="h-3 w-3 text-slate-400 shrink-0"
                aria-hidden="true"
              />
              {job.location || t("jobs.defaultLocation")}
            </span>
          </div>
        </div>
      </td>

      {/* 2. Pipeline Funnel Progress Bar & Stage Pills */}
      {visibleColumns.pipeline && (
        <td className="py-4 px-4">
          <JobStageBadgeGroup jobId={job.id} counts={counts} />
        </td>
      )}

      {/* 3. Status Badge */}
      {visibleColumns.status && (
        <td className="py-4 px-4 whitespace-nowrap">
          <JobStatusBadge status={job.status} />
        </td>
      )}

      {/* 4. Actions */}
      <td className="py-4 px-5 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={getJobPublicUrl(job)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center"
            title={t("jobs.viewPublicPage")}
            aria-label={`${t("jobs.viewPublicPage")}: ${job.title}`}
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>

          {/* Quick View (Pipeline/Overview) */}
          <Link
            href={`/jobs/${job.id}/pipeline`}
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center"
            title={t("common.view")}
            aria-label={`${t("common.view")}: ${job.title}`}
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
          </Link>

          {/* Quick Edit (Settings) */}
          {canUpdateJob && (
            <Link
              href={`/jobs/${job.id}/settings`}
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center"
              title={t("common.edit")}
              aria-label={`${t("common.edit")}: ${job.title}`}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}

          {/* Quick Delete */}
          {canDeleteJob && (
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
          )}
        </div>
      </td>
    </tr>
  );
}
