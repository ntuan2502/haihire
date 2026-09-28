"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { usePublicOrg, usePublicJobs } from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CareersHeader } from "@/components/careers/careers-header";
import { CareersFooter } from "@/components/careers/careers-footer";
import { CustomSelect } from "@/components/shared/custom-select";
import { slugify } from "@/lib/utils";
import {
  Briefcase,
  Building2,
  MapPin,
  Clock,
  DollarSign,
  Search,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Globe2,
  ChevronRight,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { getJobTypeLabel, getWorkplaceLabel, getExperienceLevelLabel } from "@/lib/jobs";

export default function OrgCareersPage() {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const rawOrgSlug = params?.orgSlug;
  const orgSlug = Array.isArray(rawOrgSlug) ? rawOrgSlug[0] : (rawOrgSlug as string);

  const { data: org, isLoading: isOrgLoading, isError: isOrgError } = usePublicOrg(orgSlug);
  const { data: jobs, isLoading: isJobsLoading } = usePublicJobs(orgSlug);

  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [copiedLink, setCopiedLink] = useState(false);

  // Departments list
  const departments = useMemo(() => {
    if (!jobs) return [];
    const depts = new Set<string>();
    jobs.forEach((j) => {
      if (j.department) depts.add(j.department);
    });
    return Array.from(depts);
  }, [jobs]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    if (!jobs) return [];
    return jobs.filter((job) => {
      // Must be PUBLISHED
      if (job.status !== "PUBLISHED") return false;

      // Search match
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesTitle = job.title.toLowerCase().includes(query);
        const matchesDept = job.department.toLowerCase().includes(query);
        const matchesLoc = job.location.toLowerCase().includes(query);
        const matchesDesc = job.description.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDept && !matchesLoc && !matchesDesc) {
          return false;
        }
      }

      // Dept filter
      if (selectedDept !== "all" && job.department !== selectedDept) {
        return false;
      }

      // Type filter
      if (selectedType !== "all" && job.type !== selectedType) {
        return false;
      }

      return true;
    });
  }, [jobs, search, selectedDept, selectedType]);

  const handleCopyPortalLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  if (isOrgLoading || isJobsLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <LoadingSpinner />
        <p className="mt-4 text-xs font-semibold text-slate-500">{t("careers.loadingPortal")}</p>
      </div>
    );
  }

  if (isOrgError || !org) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
        <div className="h-14 w-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t("careers.orgNotFound")}</h1>
        <p className="mt-2 text-sm text-slate-500 max-w-md">
          {t("careers.orgNotFoundDesc", { slug: orgSlug })}
        </p>
        <Button
          onClick={() => router.push("/")}
          className="mt-6 h-9 rounded-xl text-xs font-semibold cursor-pointer"
          variant="outline"
        >
          {t("careers.backToHome")}
        </Button>
      </div>
    );
  }

  const orgName = org.name || t("careers.companyPage");

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/60 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 antialiased selection:bg-blue-500 selection:text-white transition-colors duration-200">
      {/* Top Navbar */}
      <CareersHeader
        orgName={orgName}
        orgSlug={orgSlug}
        showShareButton={true}
        onShare={handleCopyPortalLink}
        copiedLink={copiedLink}
        shareLabel={t("careers.share")}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/50 to-slate-100/50 dark:from-slate-900 dark:via-slate-900/50 dark:to-slate-950 border-b border-slate-200/80 dark:border-slate-800 py-16 sm:py-20">
        <div className="absolute inset-0 bg-radial-[circle_at_top_right] from-blue-500/5 dark:from-blue-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-5 relative">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t("careers.hiringTalentBadge")}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {t("careers.buildCareerWith")}{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {orgName}
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {t("careers.companyHeroDesc")}
          </p>

          {/* Quick Metrics */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <div className="px-4 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-blue-600" />
              <span>
                <strong className="text-slate-900 dark:text-white font-extrabold">{filteredJobs.length}</strong> {t("careers.openPositions")}
              </span>
            </div>
            {departments.length > 0 && (
              <div className="px-4 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-600" />
                <span>
                  <strong className="text-slate-900 dark:text-white font-extrabold">{departments.length}</strong> {t("careers.departmentsCount")}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content: Search, Filter, Jobs Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Search & Filter Bar */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder={t("careers.searchInCompany")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            {/* Department Filter */}
            {departments.length > 0 && (
              <CustomSelect
                value={selectedDept}
                onChange={(val) => setSelectedDept(val)}
                options={[
                  { value: "all", label: t("careers.allDepartmentsOption") },
                  ...departments.map((dept) => ({
                    value: dept,
                    label: dept,
                  })),
                ]}
                className="w-full md:w-48"
                triggerClassName="h-10 text-xs font-semibold"
              />
            )}

            {/* Type Filter */}
            <CustomSelect
              value={selectedType}
              onChange={(val) => setSelectedType(val)}
              options={[
                { value: "all", label: t("careers.allTypesOption") },
                { value: "FULL_TIME", label: t("jobs.fullTime") },
                { value: "PART_TIME", label: t("jobs.partTime") },
                { value: "CONTRACT", label: t("jobs.contract") },
                { value: "INTERNSHIP", label: t("jobs.internship") },
              ]}
              className="w-full md:w-44"
              triggerClassName="h-10 text-xs font-semibold"
            />
          </div>
        </div>

        {/* Jobs List / Cards */}
        {filteredJobs.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Briefcase className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t("careers.noCompanyJobs")}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {t("careers.noCompanyJobsDesc")}
            </p>
            {(search || selectedDept !== "all" || selectedType !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSelectedDept("all");
                  setSelectedType("all");
                }}
                className="mt-2 text-xs rounded-xl cursor-pointer"
              >
                {t("careers.resetFilter")}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredJobs.map((job) => {
              const jobSlug = slugify(job.title) || job.id;
              const jobUrl = `/careers/${orgSlug}/${jobSlug}`;

              return (
                <Link
                  key={job.id}
                  href={jobUrl}
                  className="group relative flex flex-col justify-between p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all duration-200"
                >
                  <div className="space-y-3.5">
                    {/* Tags */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
                        {job.department}
                      </span>
                      {job.workplace && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          <Globe2 className="h-3 w-3 text-indigo-500" />
                          {getWorkplaceLabel(job.workplace, t)}
                        </span>
                      )}
                      {job.experienceLevel && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          <Briefcase className="h-3 w-3 text-blue-500" />
                          {getExperienceLevelLabel(job.experienceLevel, t)}
                        </span>
                      )}
                      {job.salaryRange && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">
                          <DollarSign className="h-3 w-3 text-emerald-600" />
                          {job.salaryRange}
                        </span>
                      )}
                    </div>

                    {/* Job Title */}
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                      {job.title}
                    </h2>

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span>{job.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{getJobTypeLabel(job.type, t)}</span>
                      </div>
                    </div>

                    {/* Snippet */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed pt-1">
                      {job.description}
                    </p>
                  </div>

                  {/* Card Action footer */}
                  <div className="pt-6 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      {t("careers.viewDetailAndApply")}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                    <div className="h-8 w-8 rounded-full bg-slate-50 dark:bg-slate-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-950 text-slate-400 group-hover:text-blue-600 flex items-center justify-center transition-colors">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <CareersFooter orgName={orgName} orgSlug={orgSlug} />
    </div>
  );
}
