"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Check, Eye, Briefcase } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";

export const LandingHero: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { t } = useI18n();

  return (
    <section className="relative z-20 flex flex-col items-center justify-center px-4 pt-12 pb-16 sm:px-6 lg:px-8 text-center max-w-5xl mx-auto">
      {/* Eyebrow Pill */}
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-50/80 dark:border-blue-500/30 dark:bg-blue-950/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300 backdrop-blur-sm shadow-2xs">
        <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-400" />
        <span>{t("landing.heroBadge")}</span>
      </div>

      {/* Main Headline */}
      <h1 className="max-w-4xl text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.14]">
        {t("landing.heroTitlePart1")}
        <span className="inline-block rounded-2xl bg-blue-600 text-white dark:bg-white dark:text-slate-950 px-3.5 py-0.5 sm:px-5 sm:py-1 shadow-xl mx-1 align-baseline transform hover:scale-105 transition-transform">
          {t("landing.heroHiring")}
        </span>
        <br />
        {t("landing.heroTitlePart2")}
      </h1>

      {/* Subtitle */}
      <p className="mt-6 max-w-2xl text-base sm:text-lg text-slate-600 dark:text-slate-300/90 leading-relaxed font-normal">
        {t("landing.heroSubtitle")}
      </p>

      {/* CTA Row */}
      <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5 sm:gap-4">
        {isAuthenticated ? (
          <Link
            href={user?.organizationId ? "/dashboard" : "/onboarding/create-org"}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-500 px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all"
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
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 px-7 py-3.5 text-sm font-bold shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
              <span>{t("landing.startFree")}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <a
              href="#demo"
              className="inline-flex items-center gap-2 rounded-full bg-white/90 hover:bg-white text-slate-800 border border-slate-200/90 dark:bg-blue-950/70 dark:hover:bg-blue-900/80 dark:border-blue-500/30 dark:text-blue-200 px-6 py-3.5 text-sm font-bold shadow-sm transition-all hover:scale-105 active:scale-95"
            >
              <Eye className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
              <span>{t("landing.heroExploreDemo")}</span>
            </a>

            <Link
              href="/careers"
              className="inline-flex items-center gap-2 rounded-full bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200/90 text-slate-700 dark:bg-slate-900/80 dark:hover:bg-slate-800 dark:border-slate-700/80 dark:text-cyan-300 px-6 py-3.5 text-sm font-bold shadow-sm hover:scale-105 active:scale-95 transition-all"
            >
              <Briefcase className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
              <span>{t("landing.exploreCareers")}</span>
            </Link>
          </>
        )}
      </div>

      {/* Feature Micro-Badges */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-7 text-xs font-semibold text-slate-500 dark:text-slate-400">
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
    </section>
  );
};
