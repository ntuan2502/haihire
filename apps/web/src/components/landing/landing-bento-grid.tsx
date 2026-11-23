"use client";

import React from "react";
import {
  Award,
  Globe2,
  CalendarCheck,
  CheckCircle2,
  Cpu,
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
        <p className="text-xs font-mono text-muted-foreground mb-2">
          {t("landing.bentoEyebrow")}
        </p>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-foreground tracking-tight">
          {t("landing.bentoTitle")}
        </h2>
        <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed font-normal">
          {t("landing.bentoDesc")}
        </p>
      </div>

      {/* Bento Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: AI Resume Screening (Spans 2 cols) */}
        <div className="md:col-span-2 rounded-xl border border-border bg-card text-card-foreground p-6 sm:p-8 relative overflow-hidden group hover:border-foreground/20 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-lg bg-secondary text-foreground border border-border">
              <Cpu className="h-5 w-5 stroke-[1.5]" />
            </div>
            <div>
              <span className="text-xs font-mono text-muted-foreground">
                {t("landing.bentoAiBadge")}
              </span>
              <h3 className="text-lg sm:text-xl font-medium text-foreground">
                {t("landing.bentoAiTitle")}
              </h3>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mb-6 font-normal">
            {t("landing.bentoAiDesc")}
          </p>

          {/* Interactive Visual Element */}
          <div className="rounded-lg border border-border bg-muted/40 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 mb-3">
              <span className="text-xs font-medium text-foreground">
                {t("landing.bentoAiMatch")}
              </span>
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-mono font-medium tabular-nums text-foreground">
                  95%
                </span>
                <div className="w-24 sm:w-32 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-foreground w-[95%]" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500 shrink-0 stroke-[1.5]" />
              <span>{t("landing.bentoAiSkills")}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Standardized Scorecards (Spans 1 col) */}
        <div className="rounded-xl border border-border bg-card text-card-foreground p-6 sm:p-8 relative overflow-hidden group hover:border-foreground/20 transition-colors flex flex-col justify-between">
          <div>
            <div className="p-2.5 rounded-lg bg-secondary text-foreground border border-border w-fit mb-4">
              <Award className="h-5 w-5 stroke-[1.5]" />
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {t("landing.bentoScorecardBadge")}
            </span>
            <h3 className="text-lg sm:text-xl font-medium text-foreground mt-1 mb-2">
              {t("landing.bentoScorecardTitle")}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6 font-normal">
              {t("landing.bentoScorecardDesc")}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-4 flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-foreground">
              {t("landing.bentoScorecardCriteria")}
            </p>
            <span className="text-xs font-mono tabular-nums text-muted-foreground shrink-0">
              4.8 / 5.0
            </span>
          </div>
        </div>

        {/* Card 3: Instant Branded Careers (Spans 1 col) */}
        <div className="rounded-xl border border-border bg-card text-card-foreground p-6 sm:p-8 relative overflow-hidden group hover:border-foreground/20 transition-colors flex flex-col justify-between">
          <div>
            <div className="p-2.5 rounded-lg bg-secondary text-foreground border border-border w-fit mb-4">
              <Globe2 className="h-5 w-5 stroke-[1.5]" />
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {t("landing.bentoCareersEyebrow")}
            </span>
            <h3 className="text-lg sm:text-xl font-medium text-foreground mt-1 mb-2">
              {t("landing.bentoCareersTitle")}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6 font-normal">
              {t("landing.bentoCareersDesc")}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-4 flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground">
              {t("landing.bentoCareersBadge")}
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground stroke-[1.5]" />
          </div>
        </div>

        {/* Card 4: Automated Comms & Calendar Sync (Spans 2 cols) */}
        <div className="md:col-span-2 rounded-xl border border-border bg-card text-card-foreground p-6 sm:p-8 relative overflow-hidden group hover:border-foreground/20 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-lg bg-secondary text-foreground border border-border">
              <CalendarCheck className="h-5 w-5 stroke-[1.5]" />
            </div>
            <div>
              <span className="text-xs font-mono text-muted-foreground">
                {t("landing.bentoCommsEyebrow")}
              </span>
              <h3 className="text-lg sm:text-xl font-medium text-foreground">
                {t("landing.bentoCommsTitle")}
              </h3>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mb-6 font-normal">
            {t("landing.bentoCommsDesc")}
          </p>

          <div className="rounded-lg border border-border bg-muted/40 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-500" />
              <span className="text-xs font-medium text-foreground">
                {t("landing.bentoCommsIntegration")}
              </span>
            </div>
            <span className="text-xs font-mono text-muted-foreground bg-secondary px-2.5 py-1 rounded-md">
              {t("landing.bentoCommsBadge")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
