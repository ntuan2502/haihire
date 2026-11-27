"use client";

import Link from "next/link";
import { Building2, MapPin, ArrowRight } from "lucide-react";
import { OrganizationLogo } from "@/components/shared/organization-logo";
import { slugify } from "@/lib/utils";
import type { Job } from "@/types";
import { useI18n } from "@/i18n";

export interface CompanyDirectoryItem {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  jobs: Job[];
  departments: Set<string>;
  locations: Set<string>;
}

interface CareersDirectoryCompaniesProps {
  companies: CompanyDirectoryItem[];
  searchQuery: string;
}

export function CareersDirectoryCompanies({
  companies,
  searchQuery,
}: CareersDirectoryCompaniesProps) {
  const { t } = useI18n();

  if (companies.length === 0) {
    return (
      <div className="py-20 text-center space-y-3 bg-card text-card-foreground rounded-2xl border border-border p-8 shadow-xs">
        <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <Building2 className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">
          {t("careers.noCompaniesFound")}
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          {t("careers.companyNotFoundMatching", { query: searchQuery })}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {companies.map((company) => {
        return (
          <div
            key={company.slug}
            className="rounded-xl border border-border bg-card text-card-foreground p-6 hover:border-foreground/20 transition-colors flex flex-col justify-between space-y-5 group"
          >
            <div className="space-y-4">
              {/* Company Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <OrganizationLogo
                    name={company.name}
                    logoUrl={company.logoUrl}
                    size="xl"
                    decorative
                  />
                  <div className="min-w-0">
                    <Link
                      href={`/careers/${company.slug}`}
                      className="text-base font-medium text-foreground group-hover:text-primary transition-colors block break-words"
                    >
                      {company.name}
                    </Link>
                    <span className="text-xs text-muted-foreground font-mono block truncate">
                      /careers/{company.slug}
                    </span>
                  </div>
                </div>

                {/* Active hiring badge */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500" />
                  <span>{t("careers.hiringBadge")}</span>
                </span>
              </div>

              {/* Locations & Departments */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                {company.locations.size > 0 && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>
                      {Array.from(company.locations).slice(0, 2).join(", ")}
                    </span>
                  </span>
                )}
                <span>•</span>
                <span className="font-medium font-mono tabular-nums text-foreground">
                  {company.jobs.length} {t("careers.metricsPositions")}
                </span>
              </div>

              {/* Departments Tags */}
              {company.departments.size > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {Array.from(company.departments).map((dept) => (
                    <span
                      key={dept}
                      className="px-2 py-0.5 rounded-md bg-secondary text-xs font-medium text-secondary-foreground"
                    >
                      {dept}
                    </span>
                  ))}
                </div>
              )}

              {/* Top 2 Open Jobs Preview */}
              <div className="space-y-2 pt-3 border-t border-border">
                <span className="text-xs font-medium text-muted-foreground block">
                  {t("careers.featuredRoles")}
                </span>
                {company.jobs.slice(0, 2).map((job) => (
                  <Link
                    key={job.id}
                    href={`/careers/${company.slug}/${slugify(job.title)}`}
                    className="block p-2.5 rounded-lg bg-muted/50 hover:bg-accent/60 border border-border transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-foreground truncate">
                        {job.title}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium shrink-0">
                        {t("careers.applyArrow")}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                      <span>{job.department}</span>
                      {job.salaryRange && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium font-mono tabular-nums">
                            {job.salaryRange}
                          </span>
                        </>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Bottom CTA to Company Portal */}
            <div className="pt-4 border-t border-border">
              <Link
                href={`/careers/${company.slug}`}
                className="w-full py-2.5 px-4 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>
                  {t("careers.viewAllRolesAndApply", {
                    count: company.jobs.length,
                  })}
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
