"use client";

import Link from "next/link";
import { Building2, MapPin, ArrowRight } from "lucide-react";
import { slugify } from "@/lib/utils";
import type { Job } from "@/types";
import { useI18n } from "@/i18n";

export interface CompanyDirectoryItem {
  id: string;
  name: string;
  slug: string;
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
      <div className="py-20 text-center space-y-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-xs">
        <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
          <Building2 className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {t("careers.noCompaniesFound")}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          {t("careers.companyNotFoundMatching", { query: searchQuery })}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {companies.map((company) => {
        const initial = company.name.charAt(0).toUpperCase();

        return (
          <div
            key={company.slug}
            className="rounded-3xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-5 group"
          >
            <div className="space-y-4">
              {/* Company Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  {/* Company Avatar with Gradient */}
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                    {initial}
                  </div>
                  <div>
                    <Link
                      href={`/careers/${company.slug}`}
                      className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors block"
                    >
                      {company.name}
                    </Link>
                    <span className="text-xs text-slate-400 font-mono">
                      /careers/{company.slug}
                    </span>
                  </div>
                </div>

                {/* Active hiring badge */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/60 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{t("careers.hiringBadge")}</span>
                </span>
              </div>

              {/* Locations & Departments */}
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                {company.locations.size > 0 && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>
                      {Array.from(company.locations).slice(0, 2).join(", ")}
                    </span>
                  </span>
                )}
                <span>•</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {company.jobs.length} {t("careers.metricsPositions")}
                </span>
              </div>

              {/* Departments Tags */}
              {company.departments.size > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {Array.from(company.departments).map((dept) => (
                    <span
                      key={dept}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300"
                    >
                      {dept}
                    </span>
                  ))}
                </div>
              )}

              {/* Top 2 Open Jobs Preview */}
              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  {t("careers.featuredRoles")}
                </span>
                {company.jobs.slice(0, 2).map((job) => (
                  <Link
                    key={job.id}
                    href={`/careers/${company.slug}/${slugify(job.title)}`}
                    className="block p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 border border-slate-200/60 dark:border-slate-800 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {job.title}
                      </span>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold shrink-0">
                        {t("careers.applyArrow")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                      <span>{job.department}</span>
                      {job.salaryRange && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
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
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <Link
                href={`/careers/${company.slug}`}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
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
