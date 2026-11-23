"use client";

import { Search, Building2, Briefcase, Users } from "lucide-react";
import { useI18n } from "@/i18n";

interface CareersDirectoryHeroProps {
  search: string;
  onSearchChange: (value: string) => void;
  companiesCount: number;
  publishedJobsCount: number;
  departmentsCount: number;
}

export function CareersDirectoryHero({
  search,
  onSearchChange,
  companiesCount,
  publishedJobsCount,
  departmentsCount,
}: CareersDirectoryHeroProps) {
  const { t } = useI18n();

  return (
    <section className="relative overflow-hidden bg-background border-b border-border py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-5">
        {/* Eyebrow */}
        <p className="text-xs font-mono text-muted-foreground">
          {t("careers.heroBadge")}
        </p>

        <h1 className="text-3xl sm:text-5xl font-medium tracking-tight leading-[1.08] text-foreground text-balance">
          {t("careers.heroTitlePart1")}{" "}
          <span className="text-foreground">
            {t("careers.heroTitleHighlight")}
          </span>
        </h1>

        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {t("careers.heroDesc")}
        </p>

        {/* Search Box */}
        <div className="pt-2 max-w-2xl mx-auto">
          <div className="relative flex items-center rounded-xl bg-card shadow-xs p-1.5 border border-border focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 transition-colors">
            <Search
              className="h-5 w-5 text-muted-foreground ml-3.5 shrink-0"
              aria-hidden="true"
            />
            <input
              type="text"
              name="careers-search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("careers.searchPlaceholder")}
              aria-label={t("careers.searchPlaceholder")}
              className="w-full bg-transparent px-3 py-2.5 text-xs sm:text-sm text-foreground outline-none placeholder:text-muted-foreground font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {t("careers.clearSearch")}
              </button>
            )}
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="pt-3 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs font-medium text-muted-foreground">
          <div className="px-4 py-2 rounded-lg bg-card text-card-foreground border border-border flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground stroke-[1.5]" />
            <span>
              <strong className="text-foreground font-medium font-mono tabular-nums">
                {companiesCount}
              </strong>{" "}
              {t("careers.metricsCompanies")}
            </span>
          </div>
          <div className="px-4 py-2 rounded-lg bg-card text-card-foreground border border-border flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground stroke-[1.5]" />
            <span>
              <strong className="text-foreground font-medium font-mono tabular-nums">
                {publishedJobsCount}
              </strong>{" "}
              {t("careers.metricsPositions")}
            </span>
          </div>
          <div className="px-4 py-2 rounded-lg bg-card text-card-foreground border border-border flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground stroke-[1.5]" />
            <span>
              <strong className="text-foreground font-medium font-mono tabular-nums">
                {departmentsCount}
              </strong>{" "}
              {t("careers.metricsDepartments")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
