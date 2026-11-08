"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Check, Eye, Briefcase } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";
import { BRAND_CONFIG } from "@haihire/shared";

export const LandingHero: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { t } = useI18n();

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/50 to-slate-100/50 dark:from-slate-900 dark:via-slate-900/50 dark:to-slate-950 border-b border-slate-200/80 dark:border-slate-800 py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-radial-[circle_at_top_right] from-blue-500/5 dark:from-blue-500/10 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-5">
        {/* Eyebrow Badge */}
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>{t("landing.heroBadge")}</span>
          </div>
        </div>

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-slate-900 dark:text-white text-balance">
          {t("landing.heroTitlePart1", { brand: BRAND_CONFIG.name })}{" "}
          <span className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {t("landing.heroHiring")}
          </span>
          {t("landing.heroTitlePart2")}
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          {t("landing.heroSubtitle")}
        </p>

        {/* CTA Row */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3.5 sm:gap-4">
          {isAuthenticated ? (
            <Link
              href={user?.organizationId ? "/dashboard" : "/auth/onboarding"}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-7 py-3 text-xs sm:text-sm font-bold text-white shadow-xs hover:scale-102 active:scale-98 transition-all cursor-pointer"
            >
              <span>
                {user?.organization?.name
                  ? t("landing.goToWorkspace", { name: user.organization.name })
                  : user?.organizationId
                    ? t("landing.goToDashboard")
                    : t("landing.createWorkspace")}
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-7 py-3 text-xs sm:text-sm font-bold shadow-xs hover:scale-102 active:scale-98 transition-all cursor-pointer"
              >
                <span>{t("landing.startFree")}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <a
                href="#demo"
                className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-200 px-6 py-3 text-xs sm:text-sm font-semibold shadow-2xs transition-all hover:scale-102 active:scale-98 cursor-pointer"
              >
                <Eye className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <span>{t("landing.heroExploreDemo")}</span>
              </a>

              <Link
                href="/careers"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700/80 dark:text-slate-200 px-6 py-3 text-xs sm:text-sm font-semibold shadow-2xs hover:scale-102 active:scale-98 transition-all cursor-pointer"
              >
                <Briefcase className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <span>{t("landing.exploreCareers")}</span>
              </Link>
            </>
          )}
        </div>

        {/* Feature Micro-Badges */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-4 sm:gap-7 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[3]" />
            {t("landing.oneFreeRole")}
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[3]" />
            {t("landing.noCreditCard")}
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[3]" />
            {t("landing.heroQuickSetup")}
          </span>
        </div>
      </div>
    </section>
  );
};
