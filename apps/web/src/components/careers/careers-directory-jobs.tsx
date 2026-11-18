"use client";

import Link from "next/link";
import {
  Briefcase,
  Building2,
  Clock,
  DollarSign,
  MapPin,
  ChevronRight,
} from "lucide-react";
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
            className="p-5 rounded-xl bg-card text-card-foreground border border-border shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/careers/${orgSlug}/${slugify(job.title)}`}
                    className="text-sm font-bold text-foreground hover:text-primary transition-colors"
                  >
                    {job.title}
                  </Link>
                  <p className="text-xs font-semibold text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    <span>{orgName}</span>
                  </p>
                </div>

                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
                  {job.department}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span>{job.location}</span>
                </span>
                {job.salaryRange && (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <DollarSign className="h-3 w-3 shrink-0" />
                    <span>{job.salaryRange}</span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span>{job.type}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <Link
                href={`/careers/${orgSlug}`}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("careers.companyPage")} &rarr;
              </Link>

              <Link
                href={`/careers/${orgSlug}/${slugify(job.title)}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-colors cursor-pointer"
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
