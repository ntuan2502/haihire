"use client";

import { useState, useMemo } from "react";
import { useAllPublicJobs } from "@/hooks/use-queries";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { CareersHeader } from "@/components/careers/careers-header";
import { CareersFooter } from "@/components/careers/careers-footer";
import { CustomSelect } from "@/components/shared/custom-select";
import { Briefcase, Building2 } from "lucide-react";
import { slugify } from "@/lib/utils";
import type { Job } from "@/types";
import { useI18n } from "@/i18n";
import {
  CareersDirectoryCompanies,
  type CompanyDirectoryItem,
} from "./careers-directory-companies";
import { CareersDirectoryJobs } from "./careers-directory-jobs";
import { CareersDirectoryHero } from "./careers-directory-hero";

interface CareersDirectoryClientProps {
  initialJobs?: Job[];
}

export function CareersDirectoryClient({
  initialJobs,
}: CareersDirectoryClientProps) {
  const { t } = useI18n();
  const { data: jobs = initialJobs ?? [], isLoading } =
    useAllPublicJobs(initialJobs);

  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [viewMode, setViewMode] = useState<"companies" | "jobs">("companies");

  // Group published jobs by Organization
  const companiesList = useMemo(() => {
    const orgMap = new Map<string, CompanyDirectoryItem>();

    for (const job of jobs) {
      if (job.status !== "PUBLISHED") continue;

      const orgId = job.organization?.id || job.organizationId || "default";
      const orgName =
        job.organization?.name || t("common.organizationFallback");
      const orgSlug =
        job.organization?.slug ||
        (job.organization?.name ? slugify(job.organization.name) : "company");

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
  }, [jobs, t]);

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

  const publishedJobsCount = useMemo(() => {
    return jobs.filter((j) => j.status === "PUBLISHED").length;
  }, [jobs]);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground transition-colors duration-200">
      {/* Top Header */}
      <CareersHeader />

      {/* Hero Section */}
      <CareersDirectoryHero
        search={search}
        onSearchChange={setSearch}
        companiesCount={companiesList.length}
        publishedJobsCount={publishedJobsCount}
        departmentsCount={allDepartments.length}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Filter and View Switcher Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          {/* View Mode Toggle: Companies vs All Jobs */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg border border-border w-fit">
            <button
              type="button"
              onClick={() => setViewMode("companies")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "companies"
                  ? "bg-background text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>
                {t("careers.viewByCompanyWithCount", {
                  count: companiesList.length,
                })}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("jobs")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "jobs"
                  ? "bg-background text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              <span>
                {t("careers.viewAllJobsWithCount", {
                  count: publishedJobsCount,
                })}
              </span>
            </button>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground shrink-0">
              {t("careers.allDeptsLabel")}
            </span>
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
            <p className="text-xs font-semibold text-muted-foreground">
              {t("careers.loadingCompanies")}
            </p>
          </div>
        ) : viewMode === "companies" ? (
          <CareersDirectoryCompanies
            companies={filteredCompanies}
            searchQuery={search}
          />
        ) : (
          <CareersDirectoryJobs jobs={filteredJobs} />
        )}
      </main>
      <CareersFooter />
    </div>
  );
}
