"use client";

import {
  Briefcase,
  Calendar,
  Clock,
  DollarSign,
  Globe2,
  MapPin,
  Users,
} from "lucide-react";
import { OrganizationLogo } from "@/components/shared/organization-logo";
import { useLocalization } from "@/components/providers/localization-provider";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import {
  formatDateOnlyDisplay,
  getExperienceLevelLabel,
  getJobTypeLabel,
  getWorkplaceLabel,
} from "@/lib/jobs";
import type { Job } from "@/types";

interface JobDetailsHeroProps {
  job: Job;
  orgName: string;
  orgLogoUrl?: string | null;
  onApplyClick: () => void;
}

export function JobDetailsHero({
  job,
  orgName,
  orgLogoUrl,
  onApplyClick,
}: JobDetailsHeroProps) {
  const { t, locale } = useI18n();
  const { localization } = useLocalization();
  const formattedDeadline = formatDateOnlyDisplay(
    job.applicationDeadline,
    localization,
    locale,
  );
  const formattedStartDate = formatDateOnlyDisplay(
    job.startDate,
    localization,
    locale,
  );

  return (
    <div className="p-6 sm:p-8 rounded-xl bg-card text-card-foreground border border-border space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-foreground border border-border">
              {job.department}
            </span>
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
          </div>

          <h1 className="text-2xl sm:text-4xl font-medium text-foreground tracking-tight leading-tight break-words">
            {job.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground font-medium pt-1">
            <div className="flex items-center gap-1.5">
              <OrganizationLogo
                name={orgName}
                logoUrl={orgLogoUrl}
                size="xs"
                decorative
              />
              <span>{orgName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-muted-foreground stroke-[1.5]" />
              <span>{job.location}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground stroke-[1.5]" />
              <span>{getJobTypeLabel(job.type, t)}</span>
            </div>
            {job.salaryRange && (
              <div className="flex items-center gap-1.5 font-medium font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                <DollarSign className="h-4 w-4 stroke-[1.5]" />
                <span>{job.salaryRange}</span>
              </div>
            )}
            {formattedDeadline && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground stroke-[1.5]" />
                <span>
                  {t("careers.applicationDeadline", {
                    date: formattedDeadline,
                  })}
                </span>
              </div>
            )}
            {formattedStartDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground stroke-[1.5]" />
                <span>
                  {t("careers.startDate", {
                    date: formattedStartDate,
                  })}
                </span>
              </div>
            )}
            {job.openings !== undefined && job.openings > 0 && (
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-muted-foreground stroke-[1.5]" />
                <span>
                  {t("careers.openingsCount", { count: job.openings })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Action Button to scroll to apply form */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            onClick={onApplyClick}
            className="w-full md:w-auto h-11 px-6 rounded-lg text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
          >
            {t("careers.applyNow")}
          </Button>
        </div>
      </div>
    </div>
  );
}
