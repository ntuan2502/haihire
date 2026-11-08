"use client";

import Link from "next/link";
import { X, MapPin, DollarSign, Calendar, ExternalLink, Pencil } from "lucide-react";
import { SlideOver } from "@/components/shared/slide-over";
import { JobStatusBadge } from "@/components/shared/job-status-badge";
import { useI18n } from "@/i18n";
import { getJobTypeLabel, getWorkplaceLabel, getExperienceLevelLabel } from "@/lib/jobs";
import type { Job } from "@/types";

export interface JobQuickDetailDrawerProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
}

export function JobQuickDetailDrawer({
  job,
  isOpen,
  onClose,
}: JobQuickDetailDrawerProps) {
  const { t } = useI18n();

  if (!job) return null;

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      panelClassName="justify-between"
    >
      {/* Header */}
      <div className="p-6 border-b border-slate-200/80 dark:border-slate-800 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <JobStatusBadge status={job.status} />
            <span className="text-[11px] font-medium text-slate-500">
              {job.department || "General"}
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {job.title}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
        {/* Meta Grid */}
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>{job.location || "Remote"}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <DollarSign className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>{job.salaryRange || "Competitive"}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>{getJobTypeLabel(job.type, t)}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <span>{getWorkplaceLabel(job.workplace, t)}</span>
            <span>•</span>
            <span>{getExperienceLevelLabel(job.experienceLevel, t)}</span>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            {t("jobs.description")}
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
            {job.description || "No description provided."}
          </p>
        </div>

        {/* Requirements */}
        {job.requirements && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t("jobs.requirements")}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {job.requirements}
            </p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
        <Link
          href={`/dashboard/jobs/${job.id}/settings`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
          <span>{t("common.edit")}</span>
        </Link>

        <Link
          href={`/dashboard/jobs/${job.id}/pipeline`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
        >
          <span>{t("dashboard.hiringPipeline")}</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </SlideOver>
  );
}
