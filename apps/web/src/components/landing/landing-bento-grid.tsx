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
    <section
      id="features"
      className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20"
    >
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">
          {t("landing.bentoEyebrow")}
        </p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight">
          {t("landing.bentoTitle")}
        </h2>
        <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed font-normal">
          {t("landing.bentoDesc")}
        </p>
      </div>

      {/* Bento Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: AI Resume Screening (Spans 2 cols) */}
        <div className="md:col-span-2 rounded-2xl border border-border bg-card text-card-foreground p-6 sm:p-8 relative overflow-hidden group hover:border-primary/40 transition-all shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider text-primary uppercase">
                {t("landing.bentoAiBadge")}
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                {t("landing.bentoAiTitle")}
              </h3>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mb-6 font-normal">
            {t("landing.bentoAiDesc")}
          </p>

          {/* Interactive Visual Element */}
          <div className="rounded-xl border border-border bg-muted/40 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  {t("landing.bentoAiMatch")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  95%
                </span>
                <div className="w-24 sm:w-32 h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-emerald-500 w-[95%]" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>{t("landing.bentoAiSkills")}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Standardized Scorecards (Spans 1 col) */}
        <div className="rounded-2xl border border-border bg-card text-card-foreground p-6 sm:p-8 relative overflow-hidden group hover:border-amber-500/40 transition-all flex flex-col justify-between shadow-xs">
          <div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 w-fit mb-4">
              <Award className="h-6 w-6" />
            </div>
            <span className="text-[11px] font-bold tracking-wider text-amber-600 dark:text-amber-400 uppercase">
              {t("landing.bentoScorecardBadge")}
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-1 mb-2">
              {t("landing.bentoScorecardTitle")}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6 font-normal">
              {t("landing.bentoScorecardDesc")}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex items-center gap-1 mb-2 text-amber-500">
              <Star className="h-4 w-4 fill-amber-500" />
              <Star className="h-4 w-4 fill-amber-500" />
              <Star className="h-4 w-4 fill-amber-500" />
              <Star className="h-4 w-4 fill-amber-500" />
              <Star className="h-4 w-4 fill-amber-500" />
            </div>
            <p className="text-[11px] font-semibold text-foreground">
              {t("landing.bentoScorecardCriteria")}
            </p>
          </div>
        </div>

        {/* Card 3: Instant Branded Careers (Spans 1 col) */}
        <div className="rounded-2xl border border-border bg-card text-card-foreground p-6 sm:p-8 relative overflow-hidden group hover:border-emerald-500/40 transition-all flex flex-col justify-between shadow-xs">
          <div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 w-fit mb-4">
              <Globe2 className="h-6 w-6" />
            </div>
            <span className="text-[11px] font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
              {t("landing.bentoCareersEyebrow")}
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-1 mb-2">
              {t("landing.bentoCareersTitle")}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6 font-normal">
              {t("landing.bentoCareersDesc")}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-4 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              {t("landing.bentoCareersBadge")}
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>

        {/* Card 4: Automated Comms & Calendar Sync (Spans 2 cols) */}
        <div className="md:col-span-2 rounded-2xl border border-border bg-card text-card-foreground p-6 sm:p-8 relative overflow-hidden group hover:border-sky-500/40 transition-all shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              <CalendarCheck className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider text-sky-600 dark:text-sky-400 uppercase">
                {t("landing.bentoCommsEyebrow")}
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                {t("landing.bentoCommsTitle")}
              </h3>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mb-6 font-normal">
            {t("landing.bentoCommsDesc")}
          </p>

          <div className="rounded-xl border border-border bg-muted/40 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-bold text-foreground">
                {t("landing.bentoCommsIntegration")}
              </span>
            </div>
            <span className="text-xs font-semibold text-sky-700 bg-sky-500/10 border border-sky-500/20 dark:text-sky-300 px-3 py-1 rounded-full">
              {t("landing.bentoCommsBadge")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
