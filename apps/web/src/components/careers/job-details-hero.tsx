"use client";

import {
  Briefcase,
  Building2,
  Clock,
  DollarSign,
  Globe2,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import {
  getExperienceLevelLabel,
  getJobTypeLabel,
  getWorkplaceLabel,
} from "@/lib/jobs";
import type { Job } from "@/types";

interface JobDetailsHeroProps {
  job: Job;
  orgName: string;
  onApplyClick: () => void;
}

export function JobDetailsHero({
  job,
  orgName,
  onApplyClick,
}: JobDetailsHeroProps) {
  const { t } = useI18n();

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
              {job.department}
            </span>
            {job.workplace && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <Globe2 className="h-3.5 w-3.5 text-indigo-500" />
                {getWorkplaceLabel(job.workplace, t)}
              </span>
            )}
            {job.experienceLevel && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <Briefcase className="h-3.5 w-3.5 text-blue-500" />
                {getExperienceLevelLabel(job.experienceLevel, t)}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {job.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium pt-1">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-slate-400" />
              <span>{orgName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span>{job.location}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>{getJobTypeLabel(job.type, t)}</span>
            </div>
            {job.salaryRange && (
              <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                <DollarSign className="h-4 w-4" />
                <span>{job.salaryRange}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Action Button to scroll to apply form */}
        <div className="flex items-center gap-3">
          <Button
            onClick={onApplyClick}
            className="h-11 px-6 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 mr-2" />
            {t("careers.applyNow")}
          </Button>
        </div>
      </div>
    </div>
  );
}
