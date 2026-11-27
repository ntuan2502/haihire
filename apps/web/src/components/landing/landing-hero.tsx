"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";
import { BRAND_CONFIG } from "@haihire/shared";

export const LandingHero: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { t } = useI18n();

  return (
    <section className="relative overflow-hidden bg-background border-b border-border py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-5">
        {/* Eyebrow */}
        <p className="text-xs font-mono text-muted-foreground">
          {t("landing.heroBadge")}
        </p>

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-5xl font-medium tracking-tight leading-[1.08] text-foreground text-balance">
          {t("landing.heroTitlePart1", { brand: BRAND_CONFIG.name })}{" "}
          <span className="text-foreground">{t("landing.heroHiring")}</span>
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
              className="inline-flex items-center gap-2 rounded-lg bg-primary hover:bg-primary/90 min-h-11 max-w-full py-2.5 px-6 text-sm font-medium text-primary-foreground transition-colors cursor-pointer"
            >
              <span className="truncate">
                {user?.organization?.name
                  ? t("landing.goToWorkspace", { name: user.organization.name })
                  : user?.organizationId
                    ? t("landing.goToDashboard")
                    : t("landing.createWorkspace")}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          ) : (
            <>
              <Link
                href="/auth/register"
                prefetch={false}
                className="inline-flex items-center gap-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground h-11 px-6 text-sm font-medium transition-colors cursor-pointer"
              >
                <span>{t("landing.startFree")}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>

        {/* Feature Meta Line */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5 text-xs text-muted-foreground">
          <span>{t("landing.oneFreeRole")}</span>
          <span aria-hidden="true">·</span>
          <span>{t("landing.noCreditCard")}</span>
          <span aria-hidden="true">·</span>
          <span>{t("landing.heroQuickSetup")}</span>
          {!isAuthenticated && (
            <>
              <span aria-hidden="true">·</span>
              <Link
                href="/careers"
                className="text-foreground hover:underline underline-offset-4 transition-colors"
              >
                {t("landing.exploreCareers")}
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
