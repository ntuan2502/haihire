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
    <tr className="hover:bg-muted/40 transition-colors group">
      {/* 1. Job Title & Meta (Always Visible) */}
      <td className="py-4 px-5">
        <div className="space-y-1">
          <Link
            href={`/jobs/${job.id}/pipeline`}
            className="text-sm font-semibold text-foreground group-hover:underline underline-offset-4 transition-colors block"
          >
            {job.title}
          </Link>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
            <span className="font-medium text-foreground/80">
              {job.department || t("jobs.wizard.generalDepartment")}
            </span>
            <span>•</span>
            <span>{getJobTypeLabel(job.type, t)}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-0.5">
              <MapPin
                className="h-3 w-3 text-muted-foreground shrink-0"
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
            className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title={t("jobs.viewPublicPage")}
            aria-label={`${t("jobs.viewPublicPage")}: ${job.title}`}
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>

          {/* Quick View (Pipeline/Overview) */}
          <Link
            href={`/jobs/${job.id}/pipeline`}
            onClick={(e) => e.stopPropagation()}
            className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              className="h-8 w-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
