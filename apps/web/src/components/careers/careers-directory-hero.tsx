"use client";

import { Search, Sparkles, Building2, Briefcase, Users } from "lucide-react";
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
    <section className="relative overflow-hidden bg-gradient-to-b from-background via-muted/40 to-muted/70 border-b border-border py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-radial-[circle_at_top_right] from-primary/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-5">
        {/* Eyebrow Badge */}
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>{t("careers.heroBadge")}</span>
          </div>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-foreground text-balance">
          {t("careers.heroTitlePart1")}{" "}
          <span className="inline-block bg-gradient-to-r from-primary to-sky-500 bg-clip-text text-transparent">
            {t("careers.heroTitleHighlight")}
          </span>
        </h1>

        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {t("careers.heroDesc")}
        </p>

        {/* Search Box */}
        <div className="pt-2 max-w-2xl mx-auto">
          <div className="relative flex items-center rounded-xl bg-card shadow-md p-1.5 border border-border focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 transition-all">
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
        <div className="pt-3 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs font-semibold text-muted-foreground">
          <div className="px-4 py-2 rounded-xl bg-card text-card-foreground border border-border shadow-2xs flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span>
              <strong className="text-foreground font-extrabold">
                {companiesCount}
              </strong>{" "}
              {t("careers.metricsCompanies")}
            </span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-card text-card-foreground border border-border shadow-2xs flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            <span>
              <strong className="text-foreground font-extrabold">
                {publishedJobsCount}
              </strong>{" "}
              {t("careers.metricsPositions")}
            </span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-card text-card-foreground border border-border shadow-2xs flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span>
              <strong className="text-foreground font-extrabold">
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
