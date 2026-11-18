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
    <section className="relative overflow-hidden bg-gradient-to-b from-background via-muted/30 to-muted/50 border-b border-border py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-radial-[circle_at_top_right] from-primary/10 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-5">
        {/* Eyebrow Badge */}
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>{t("landing.heroBadge")}</span>
          </div>
        </div>

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-foreground text-balance">
          {t("landing.heroTitlePart1", { brand: BRAND_CONFIG.name })}{" "}
          <span className="inline-block bg-gradient-to-r from-primary to-sky-500 bg-clip-text text-transparent">
            {t("landing.heroHiring")}
          </span>
          {t("landing.heroTitlePart2")}
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {t("landing.heroSubtitle")}
        </p>

        {/* CTA Row */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3.5 sm:gap-4">
          {isAuthenticated ? (
            <Link
              href={user?.organizationId ? "/dashboard" : "/auth/onboarding"}
              className="inline-flex items-center gap-2 rounded-md bg-primary hover:bg-primary/90 px-7 py-3 text-xs sm:text-sm font-bold text-primary-foreground shadow-xs hover:scale-102 active:scale-98 transition-all cursor-pointer"
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
                prefetch={false}
                className="inline-flex items-center gap-2 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground px-7 py-3 text-xs sm:text-sm font-bold shadow-xs hover:scale-102 active:scale-98 transition-all cursor-pointer"
              >
                <span>{t("landing.startFree")}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <a
                href="#demo"
                className="inline-flex items-center gap-2 rounded-md bg-background hover:bg-accent text-foreground border border-input px-6 py-3 text-xs sm:text-sm font-semibold shadow-2xs transition-all hover:scale-102 active:scale-98 cursor-pointer"
              >
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span>{t("landing.heroExploreDemo")}</span>
              </a>

              <Link
                href="/careers"
                className="inline-flex items-center gap-2 rounded-md bg-secondary hover:bg-secondary/80 border border-border text-secondary-foreground px-6 py-3 text-xs sm:text-sm font-semibold shadow-2xs hover:scale-102 active:scale-98 transition-all cursor-pointer"
              >
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span>{t("landing.exploreCareers")}</span>
              </Link>
            </>
          )}
        </div>

        {/* Feature Micro-Badges */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-4 sm:gap-7 text-xs font-semibold text-muted-foreground">
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
