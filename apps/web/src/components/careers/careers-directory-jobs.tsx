"use client";

import Link from "next/link";
import {
  Briefcase,
  Clock,
  DollarSign,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { OrganizationLogo } from "@/components/shared/organization-logo";
import { getJobTypeLabel } from "@/lib/jobs";
import { slugify } from "@/lib/utils";
import type { Job } from "@/types";
import { useI18n } from "@/i18n";

interface CareersDirectoryJobsProps {
  jobs: Job[];
}

export function CareersDirectoryJobs({ jobs }: CareersDirectoryJobsProps) {
  const { t } = useI18n();

  if (jobs.length === 0) {
    return (
      <div className="py-20 text-center space-y-3 bg-card text-card-foreground rounded-2xl border border-border p-8 shadow-xs">
        <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <Briefcase className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">
          {t("careers.noJobsFound")}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t("careers.noJobsDesc")}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {jobs.map((job) => {
        const orgName =
          job.organization?.name || t("common.organizationFallback");
        const orgSlug =
          job.organization?.slug ||
          (job.organization?.name ? slugify(job.organization.name) : "company");

        return (
          <div
            key={job.id}
            className="p-5 rounded-xl bg-card text-card-foreground border border-border hover:border-foreground/20 transition-colors flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/careers/${orgSlug}/${slugify(job.title)}`}
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors break-words block"
                  >
                    {job.title}
                  </Link>
                  <div className="text-xs font-medium text-muted-foreground mt-0.5 flex items-center gap-1.5 min-w-0">
                    <OrganizationLogo
                      name={orgName}
                      logoUrl={job.organization?.logoUrl}
                      size="xs"
                      decorative
                    />
                    <span className="truncate">{orgName}</span>
                  </div>
                </div>

                <span className="rounded-md px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground shrink-0 max-w-[45%] truncate">
                  {job.department}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 stroke-[1.5]" />
                  <span>{job.location}</span>
                </span>
                {job.salaryRange && (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium font-mono tabular-nums">
                    <DollarSign className="h-3.5 w-3.5 shrink-0 stroke-[1.5]" />
                    <span>{job.salaryRange}</span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0 stroke-[1.5]" />
                  <span>{getJobTypeLabel(job.type, t)}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <Link
                href={`/careers/${orgSlug}`}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("careers.companyPage")} &rarr;
              </Link>

              <Link
                href={`/careers/${orgSlug}/${slugify(job.title)}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors cursor-pointer"
              >
                <span>{t("careers.applyNow")}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
