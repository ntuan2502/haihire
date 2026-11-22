"use client";

import Link from "next/link";
import { CareersHeader } from "@/components/careers/careers-header";
import { CareersFooter } from "@/components/careers/careers-footer";
import { useI18n } from "@/i18n";
import {
  getJobTypeLabel,
  getWorkplaceLabel,
  getExperienceLevelLabel,
} from "@/lib/jobs";
import {
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  Globe2,
  ArrowRight,
  Archive,
  ChevronLeft,
} from "lucide-react";
import { OrganizationLogo } from "@/components/shared/organization-logo";
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
    <div className="min-h-screen flex flex-col bg-background font-sans text-foreground antialiased selection:bg-primary selection:text-primary-foreground transition-colors duration-200">
      {/* Top Navbar */}
      <CareersHeader
        orgName={orgName}
        orgSlug={orgSlug}
        orgLogoUrl={org?.logoUrl}
      />

      {/* Main Container */}
      <main
        id="main-content"
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6"
      >
        {/* Back Link */}
        <div>
          <Link
            href={`/careers/${orgSlug}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>{t("careers.allJobsAt", { org: orgName })}</span>
          </Link>
        </div>

        {/* Job Header Hero Card */}
        <div className="p-6 sm:p-8 rounded-xl bg-card text-card-foreground border border-border space-y-6">
          <div className="space-y-3">
            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2">
              {job.department && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-foreground border border-border">
                  {job.department}
                </span>
              )}
              {job.workplace && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground">
                  <Globe2 className="h-3.5 w-3.5 text-muted-foreground stroke-[1.5]" />
                  {getWorkplaceLabel(job.workplace, t)}
                </span>
              )}
              {job.experienceLevel && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground stroke-[1.5]" />
                  {getExperienceLevelLabel(job.experienceLevel, t)}
                </span>
              )}
              {/* Closed Status Badge */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {t("careers.jobClosed.title")}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-4xl font-medium text-foreground tracking-tight leading-tight">
              {job.title}
            </h1>

            {/* Meta Row */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground font-medium pt-1">
              <div className="flex items-center gap-1.5">
                <OrganizationLogo
                  name={orgName}
                  logoUrl={org?.logoUrl}
                  size="xs"
                  decorative
                />
                <span>{orgName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 stroke-[1.5]" />
                <span>{job.location}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0 stroke-[1.5]" />
                <span>{getJobTypeLabel(job.type, t)}</span>
              </div>
              {job.salaryRange && (
                <div className="flex items-center gap-1.5 font-medium font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="h-4 w-4 shrink-0 stroke-[1.5]" />
                  <span>{job.salaryRange}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Closed Notice Card with Responsive Action Buttons */}
        <div className="relative overflow-hidden rounded-xl bg-card text-card-foreground border border-border p-6 sm:p-8 md:p-10">
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6 sm:gap-8">
            {/* Left: Icon & Explanatory Text */}
            <div className="flex items-start gap-4 sm:gap-5 flex-1 min-w-0">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <Archive className="h-6 w-6 sm:h-7 sm:w-7 stroke-[1.5]" />
              </div>

              <div className="space-y-1.5 sm:space-y-2 flex-1">
                <h2 className="text-base sm:text-lg font-medium text-foreground tracking-tight">
                  {t("careers.jobClosed.title")}
                </h2>

                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
                  {t("careers.jobClosed.description")}
                </p>
              </div>
            </div>

            {/* Right: Primary Action Button (Responsive full-width on mobile, auto on desktop) */}
            <div className="flex items-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border">
              <Link
                href={`/careers/${orgSlug}`}
                className="w-full sm:w-auto h-11 px-5 sm:px-6 rounded-lg text-xs sm:text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground inline-flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
              >
                <span>{t("careers.jobClosed.viewOtherJobs")}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      <CareersFooter
        orgName={orgName}
        orgSlug={orgSlug}
        orgLogoUrl={org?.logoUrl}
      />
    </div>
  );
}
