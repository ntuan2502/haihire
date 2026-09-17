"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useAllPublicJobs } from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { CareersHeader } from "@/components/careers/careers-header";
import { CareersFooter } from "@/components/careers/careers-footer";
import { CustomSelect } from "@/components/shared/custom-select";
import {
  Briefcase,
  Building2,
  MapPin,
  Clock,
  DollarSign,
  Search,
  ArrowRight,
  Sparkles,
  Users,
  ChevronRight,
} from "lucide-react";
import { slugify } from "@/lib/utils";
import type { Job } from "@/types";
import { useI18n } from "@/i18n";

export default function CareersDirectoryPage() {
  const { t } = useI18n();
  const { data: jobs = [], isLoading } = useAllPublicJobs();

  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [viewMode, setViewMode] = useState<"companies" | "jobs">("companies");

  // Group published jobs by Organization
  const companiesList = useMemo(() => {
    const orgMap = new Map<
      string,
      {
        id: string;
        name: string;
        slug: string;
        jobs: Job[];
        departments: Set<string>;
        locations: Set<string>;
      }
    >();

    for (const job of jobs) {
      if (job.status !== "PUBLISHED") continue;

      const orgId = job.organization?.id || job.organizationId || "default";
      const orgName = job.organization?.name || "ATS Organization";
      const orgSlug = job.organization?.slug || (job.organization?.name ? slugify(job.organization.name) : "company");

      if (!orgMap.has(orgSlug)) {
        orgMap.set(orgSlug, {
          id: orgId,
          name: orgName,
          slug: orgSlug,
          jobs: [],
          departments: new Set(),
          locations: new Set(),
        });
      }

      const item = orgMap.get(orgSlug)!;
      item.jobs.push(job);
      if (job.department) item.departments.add(job.department);
      if (job.location) item.locations.add(job.location);
    }

    return Array.from(orgMap.values());
  }, [jobs]);

  // Unique departments across all public jobs
  const allDepartments = useMemo(() => {
    const depts = new Set<string>();
    jobs.forEach((j) => {
      if (j.status === "PUBLISHED" && j.department) {
        depts.add(j.department);
      }
    });
    return Array.from(depts);
  }, [jobs]);

  // Filtered companies
  const filteredCompanies = useMemo(() => {
    return companiesList.filter((company) => {
      const q = search.toLowerCase().trim();

      // Department filter
      if (selectedDept !== "all" && !company.departments.has(selectedDept)) {
        return false;
      }

      // Search match: matches company name, slug, department, or job title
      if (q) {
        const matchesName = company.name.toLowerCase().includes(q);
        const matchesSlug = company.slug.toLowerCase().includes(q);
        const matchesDept = Array.from(company.departments).some((d) =>
          d.toLowerCase().includes(q),
        );
        const matchesJobTitle = company.jobs.some((j) =>
          j.title.toLowerCase().includes(q),
        );
        if (!matchesName && !matchesSlug && !matchesDept && !matchesJobTitle) {
          return false;
        }
      }

      return true;
    });
  }, [companiesList, search, selectedDept]);

  // Filtered jobs for all jobs view
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (job.status !== "PUBLISHED") return false;

      const q = search.toLowerCase().trim();
      if (selectedDept !== "all" && job.department !== selectedDept) {
        return false;
      }

      if (q) {
        const orgName = job.organization?.name || "";
        const matchesTitle = job.title.toLowerCase().includes(q);
        const matchesDept = job.department.toLowerCase().includes(q);
        const matchesLoc = job.location.toLowerCase().includes(q);
        const matchesOrg = orgName.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDept && !matchesLoc && !matchesOrg) {
          return false;
        }
      }

      return true;
    });
  }, [jobs, search, selectedDept]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-white transition-colors duration-200">
      {/* Top Header */}
      <CareersHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-900 via-indigo-950 to-slate-950 text-white py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(56,189,248,0.15),rgba(255,255,255,0))]" />

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
            <span>{t("careers.heroBadge")}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            {t("careers.heroTitlePart1")}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              {t("careers.heroTitleHighlight")}
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
            {t("careers.heroDesc")}
          </p>

          {/* Search Box */}
          <div className="pt-4 max-w-2xl mx-auto">
            <div className="relative flex items-center rounded-2xl bg-white dark:bg-slate-900 shadow-2xl p-1.5 border border-slate-200/80 dark:border-slate-800">
              <Search className="h-5 w-5 text-slate-400 ml-3.5 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("careers.searchPlaceholder")}
                className="w-full bg-transparent px-3 py-2.5 text-xs sm:text-sm text-slate-800 dark:text-white outline-none placeholder:text-slate-400 font-medium"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="px-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {t("careers.clearSearch")}
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-300 font-medium">
            <span className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-cyan-400" />
              <strong className="text-white font-bold">{companiesList.length}</strong> {t("careers.metricsCompanies")}
            </span>
            <span className="flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-cyan-400" />
              <strong className="text-white font-bold">{jobs.filter((j) => j.status === "PUBLISHED").length}</strong> {t("careers.metricsPositions")}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-cyan-400" />
              <strong className="text-white font-bold">{allDepartments.length}</strong> {t("careers.metricsDepartments")}
            </span>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Filter and View Switcher Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
          {/* View Mode Toggle: Companies vs All Jobs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 w-fit">
            <button
              type="button"
              onClick={() => setViewMode("companies")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "companies"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>{t("careers.viewByCompanyWithCount", { count: companiesList.length })}</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("jobs")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "jobs"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              <span>{t("careers.viewAllJobsWithCount", { count: jobs.filter((j) => j.status === "PUBLISHED").length })}</span>
            </button>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 shrink-0">{t("careers.allDeptsLabel")}</span>
            <CustomSelect
              value={selectedDept}
              onChange={(val) => setSelectedDept(val)}
              options={[
                { value: "all", label: t("careers.allDepartmentsOption") },
                ...allDepartments.map((dept) => ({
                  value: dept,
                  label: dept,
                })),
              ]}
              className="w-48"
              triggerClassName="h-9 text-xs font-semibold"
            />
          </div>
        </div>

        {/* Content Loading State */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <LoadingSpinner />
            <p className="text-xs font-semibold text-slate-400">{t("careers.loadingCompanies")}</p>
          </div>
        ) : viewMode === "companies" ? (
          /* ========================================================
             VIEW MODE 1: COMPANIES DIRECTORY
             ======================================================== */
          filteredCompanies.length === 0 ? (
            <div className="py-20 text-center space-y-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-xs">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t("careers.noCompaniesFound")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {t("careers.companyNotFoundMatching", { query: search })}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCompanies.map((company) => {
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
                            <span>{Array.from(company.locations).slice(0, 2).join(", ")}</span>
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
                        <span>{t("careers.viewAllRolesAndApply", { count: company.jobs.length })}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* ========================================================
             VIEW MODE 2: ALL INDIVIDUAL JOBS
             ======================================================== */
          filteredJobs.length === 0 ? (
            <div className="py-20 text-center space-y-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-xs">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Briefcase className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t("careers.noJobsFound")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("careers.noJobsDesc")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredJobs.map((job) => {
                const orgName = job.organization?.name || "ATS Organization";
                const orgSlug = job.organization?.slug || (job.organization?.name ? slugify(job.organization.name) : "company");

                return (
                  <div
                    key={job.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            href={`/careers/${orgSlug}/${slugify(job.title)}`}
                            className="text-sm font-bold text-slate-900 dark:text-white hover:text-blue-600 transition-colors"
                          >
                            {job.title}
                          </Link>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <Building2 className="h-3 w-3 text-slate-400" />
                            <span>{orgName}</span>
                          </p>
                        </div>

                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-900/60 shrink-0">
                          {job.department}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap pt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{job.location}</span>
                        </span>
                        {job.salaryRange && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <DollarSign className="h-3 w-3 shrink-0" />
                            <span>{job.salaryRange}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{job.type}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                      <Link
                        href={`/careers/${orgSlug}`}
                        className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      >
                        {t("careers.companyPage")} &rarr;
                      </Link>

                      <Link
                        href={`/careers/${orgSlug}/${slugify(job.title)}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        <span>{t("careers.applyNow")}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </main>
      <CareersFooter />
    </div>
  );
}
