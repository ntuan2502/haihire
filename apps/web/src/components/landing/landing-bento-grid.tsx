"use client";

import React from "react";
import {
  Sparkles,
  Award,
  Globe2,
  CalendarCheck,
  CheckCircle2,
  Cpu,
  Star,
  ExternalLink,
} from "lucide-react";
import { useI18n } from "@/i18n";

export const LandingBentoGrid: React.FC = () => {
  const { t } = useI18n();

  return (
    <section id="features" className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-cyan-400 mb-2">
          {t("landing.bentoEyebrow")}
        </p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          {t("landing.bentoTitle")}
        </h2>
        <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300/80 leading-relaxed font-normal">
          {t("landing.bentoDesc")}
        </p>
      </div>

      {/* Bento Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: AI Resume Screening (Spans 2 cols) */}
        <div className="md:col-span-2 rounded-3xl border border-slate-200/90 dark:border-blue-500/20 bg-white/95 dark:bg-gradient-to-br dark:from-slate-900/90 dark:via-slate-950/90 dark:to-blue-950/30 p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden group hover:border-blue-500/40 transition-all shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30 dark:text-cyan-300">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider text-blue-600 dark:text-cyan-400 uppercase">
                {t("landing.bentoAiBadge")}
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {t("landing.bentoAiTitle")}
              </h3>
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl mb-6 font-normal">
            {t("landing.bentoAiDesc")}
          </p>

          {/* Interactive Visual Element */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/70 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-white/10 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {t("landing.bentoAiMatch")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">95%</span>
                <div className="w-24 sm:w-32 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 w-[95%]" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>{t("landing.bentoAiSkills")}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Standardized Scorecards (Spans 1 col) */}
        <div className="rounded-3xl border border-slate-200/90 dark:border-amber-500/20 bg-white/95 dark:bg-gradient-to-br dark:from-slate-900/90 dark:via-slate-950/90 dark:to-amber-950/20 p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden group hover:border-amber-500/40 transition-all flex flex-col justify-between shadow-sm">
          <div>
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400 w-fit mb-4">
              <Award className="h-6 w-6" />
            </div>
            <span className="text-[11px] font-bold tracking-wider text-amber-600 dark:text-amber-400 uppercase">
              {t("landing.bentoScorecardBadge")}
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1 mb-2">
              {t("landing.bentoScorecardTitle")}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6 font-normal">
              {t("landing.bentoScorecardDesc")}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/70 p-4">
            <div className="flex items-center gap-1 mb-2 text-amber-500">
              <Star className="h-4 w-4 fill-amber-500" />
              <Star className="h-4 w-4 fill-amber-500" />
              <Star className="h-4 w-4 fill-amber-500" />
              <Star className="h-4 w-4 fill-amber-500" />
              <Star className="h-4 w-4 fill-amber-500" />
            </div>
            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              {t("landing.bentoScorecardCriteria")}
            </p>
          </div>
        </div>

        {/* Card 3: Instant Branded Careers (Spans 1 col) */}
        <div className="rounded-3xl border border-slate-200/90 dark:border-emerald-500/20 bg-white/95 dark:bg-gradient-to-br dark:from-slate-900/90 dark:via-slate-950/90 dark:to-emerald-950/20 p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all flex flex-col justify-between shadow-sm">
          <div>
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400 w-fit mb-4">
              <Globe2 className="h-6 w-6" />
            </div>
            <span className="text-[11px] font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
              {t("landing.bentoCareersEyebrow")}
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1 mb-2">
              {t("landing.bentoCareersTitle")}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6 font-normal">
              {t("landing.bentoCareersDesc")}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/70 p-4 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              {t("landing.bentoCareersBadge")}
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>

        {/* Card 4: Automated Comms & Calendar Sync (Spans 2 cols) */}
        <div className="md:col-span-2 rounded-3xl border border-slate-200/90 dark:border-cyan-500/20 bg-white/95 dark:bg-gradient-to-br dark:from-slate-900/90 dark:via-slate-950/90 dark:to-cyan-950/30 p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden group hover:border-cyan-500/40 transition-all shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-200 dark:bg-cyan-600/20 dark:border-cyan-500/30 dark:text-cyan-300">
              <CalendarCheck className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider text-cyan-600 dark:text-cyan-400 uppercase">
                {t("landing.bentoCommsEyebrow")}
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {t("landing.bentoCommsTitle")}
              </h3>
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl mb-6 font-normal">
            {t("landing.bentoCommsDesc")}
          </p>

          <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/70 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {t("landing.bentoCommsIntegration")}
              </span>
            </div>
            <span className="text-xs font-semibold text-cyan-700 bg-cyan-50 border border-cyan-200 dark:text-cyan-300 dark:bg-cyan-950/50 dark:border-cyan-500/30 px-3 py-1 rounded-full">
              {t("landing.bentoCommsBadge")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
