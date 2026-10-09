"use client";

import Link from "next/link";
import { CareersHeader } from "@/components/careers/careers-header";
import { CareersFooter } from "@/components/careers/careers-footer";
import { useI18n } from "@/i18n";
import { buttonVariants } from "@/components/ui/button";
import { getJobTypeLabel, getWorkplaceLabel } from "@/lib/jobs";
import {
  Briefcase,
  Building2,
  MapPin,
  ArrowRight,
  Archive,
  ChevronLeft,
} from "lucide-react";
import type { Job, Organization } from "@/types";

export interface JobClosedProps {
  job: Job;
  org?: Organization | null;
  orgSlug: string;
}

export function JobClosed({ job, org, orgSlug }: JobClosedProps) {
  const { t } = useI18n();
  const orgName = org?.name || orgSlug;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <CareersHeader orgName={orgName} orgSlug={orgSlug} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href={`/careers/${orgSlug}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{t("careers.allJobsAt")} {orgName}</span>
          </Link>
        </div>

        {/* Closed Job Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm p-6 sm:p-10 text-center">
          {/* Status Icon */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-6 shadow-sm">
            <Archive className="w-8 h-8" />
          </div>

          {/* Closed Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200/50 dark:border-amber-700/50 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            {t("careers.jobClosed.title")}
          </div>

          {/* Job Title & Organization */}
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
            {job.title}
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-400 font-medium mb-6">
            {orgName}
          </p>

          {/* Meta Information Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 mb-8 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {job.department && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                <Briefcase className="w-3.5 h-3.5" />
                {job.department}
              </span>
            )}
            {job.location && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                <MapPin className="w-3.5 h-3.5" />
                {job.location}
              </span>
            )}
            {job.workplace && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                <Building2 className="w-3.5 h-3.5" />
                {getWorkplaceLabel(job.workplace, t)}
              </span>
            )}
            {job.type && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                {getJobTypeLabel(job.type, t)}
              </span>
            )}
          </div>

          {/* Informational Message */}
          <p className="max-w-lg mx-auto text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
            {t("careers.jobClosed.description")}
          </p>

          {/* CTA Button */}
          <div className="flex items-center justify-center">
            <Link
              href={`/careers/${orgSlug}`}
              className={buttonVariants({
                size: "lg",
                className: "rounded-xl px-6 font-semibold shadow-sm gap-2 inline-flex items-center",
              })}
            >
              <span>{t("careers.jobClosed.viewOtherJobs")}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      <CareersFooter />
    </div>
  );
}
