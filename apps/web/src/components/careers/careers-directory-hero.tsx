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
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/50 to-slate-100/50 dark:from-slate-900 dark:via-slate-900/50 dark:to-slate-950 border-b border-slate-200/80 dark:border-slate-800 py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-radial-[circle_at_top_right] from-blue-500/5 dark:from-blue-500/10 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-5">
        {/* Eyebrow Badge */}
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>{t("careers.heroBadge")}</span>
          </div>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-slate-900 dark:text-white text-balance">
          {t("careers.heroTitlePart1")}{" "}
          <span className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {t("careers.heroTitleHighlight")}
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          {t("careers.heroDesc")}
        </p>

        {/* Search Box */}
        <div className="pt-2 max-w-2xl mx-auto">
          <div className="relative flex items-center rounded-2xl bg-white dark:bg-slate-900 shadow-md p-1.5 border border-slate-200/80 dark:border-slate-800 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
            <Search
              className="h-5 w-5 text-slate-400 ml-3.5 shrink-0"
              aria-hidden="true"
            />
            <input
              type="text"
              name="careers-search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("careers.searchPlaceholder")}
              aria-label={t("careers.searchPlaceholder")}
              className="w-full bg-transparent px-3 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="px-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {t("careers.clearSearch")}
              </button>
            )}
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="pt-3 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <div className="px-4 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
            <span>
              <strong className="text-slate-900 dark:text-white font-extrabold">
                {companiesCount}
              </strong>{" "}
              {t("careers.metricsCompanies")}
            </span>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
            <span>
              <strong className="text-slate-900 dark:text-white font-extrabold">
                {publishedJobsCount}
              </strong>{" "}
              {t("careers.metricsPositions")}
            </span>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
            <span>
              <strong className="text-slate-900 dark:text-white font-extrabold">
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
