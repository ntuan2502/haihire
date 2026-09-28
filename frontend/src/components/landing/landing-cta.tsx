"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";

export const LandingCta: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { t } = useI18n();

  return (
    <section className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
      <div className="relative overflow-hidden rounded-3xl border border-blue-200/90 dark:border-blue-500/30 bg-gradient-to-b from-blue-100/90 via-blue-50/50 to-white dark:from-blue-900/40 dark:via-slate-900/90 dark:to-slate-950 p-8 sm:p-14 text-center shadow-xl dark:shadow-2xl backdrop-blur-xl">
        {/* Glow Effects */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/15 dark:bg-blue-500/20 blur-[100px] rounded-full" />

        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-300/80 bg-blue-50 dark:border-blue-400/30 dark:bg-blue-950/60 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-cyan-300">
            <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-400" />
            <span>{t("landing.ctaBadge")}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {t("landing.ctaTitle")}
          </h2>

          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300/90 max-w-xl leading-relaxed font-normal">
            {t("landing.ctaDesc", { brand: "HaiHire" })}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
            {isAuthenticated ? (
              <Link
                href={user?.organizationId ? "/dashboard" : "/auth/onboarding"}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 px-8 py-4 text-sm font-black shadow-xl hover:scale-105 active:scale-95 transition-all"
              >
                <span>{t("landing.enterDashboard")}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-500 px-8 py-4 text-sm font-black text-white shadow-xl shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all"
              >
                <span>{t("landing.ctaButton")}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          <p className="mt-5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            {t("landing.ctaHint")}
          </p>
        </div>
      </div>
    </section>
  );
};
