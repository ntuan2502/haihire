"use client";

import Link from "next/link";
import {
  X,
  MapPin,
  DollarSign,
  Calendar,
  ExternalLink,
  Pencil,
} from "lucide-react";
import { SlideOver } from "@/components/shared/slide-over";
import { JobStatusBadge } from "@/components/shared/job-status-badge";
import { useI18n } from "@/i18n";
import {
  getJobTypeLabel,
  getWorkplaceLabel,
  getExperienceLevelLabel,
} from "@/lib/jobs";
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
      <div className="p-6 border-b border-border flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <JobStatusBadge status={job.status} />
            <span className="text-[11px] font-medium text-muted-foreground">
              {job.department || t("jobs.wizard.generalDepartment")}
            </span>
          </div>
          <h3 className="text-base font-semibold text-foreground">
            {job.title}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-md p-1 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
        {/* Meta Grid */}
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2 text-foreground/90">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>{job.location || t("jobs.defaultLocation")}</span>
          </div>
          <div className="flex items-center gap-2 text-foreground/90">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>{job.salaryRange || t("jobs.competitiveSalary")}</span>
          </div>
          <div className="flex items-center gap-2 text-foreground/90">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>{getJobTypeLabel(job.type, t)}</span>
          </div>
          <div className="flex items-center gap-2 text-foreground/90">
            <span>{getWorkplaceLabel(job.workplace, t)}</span>
            <span>•</span>
            <span>{getExperienceLevelLabel(job.experienceLevel, t)}</span>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            {t("jobs.description")}
          </h4>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {job.description || t("jobs.noDescription")}
          </p>
        </div>

        {/* Requirements */}
        {job.requirements && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              {t("jobs.requirements")}
            </h4>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {job.requirements}
            </p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border flex items-center justify-between bg-muted/40">
        <Link
          href={`/jobs/${job.id}/settings`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
          <span>{t("common.edit")}</span>
        </Link>

        <Link
          href={`/jobs/${job.id}/pipeline`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs"
        >
          <span>{t("dashboard.hiringPipeline")}</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </SlideOver>
  );
}
