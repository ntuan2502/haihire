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
      <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/10 via-card to-card p-8 sm:p-14 text-center shadow-md">
        {/* Glow Effects */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/15 blur-[100px] rounded-full" />

        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>{t("landing.ctaBadge")}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight leading-tight">
            {t("landing.ctaTitle")}
          </h2>

          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed font-normal">
            {t("landing.ctaDesc", { brand: "HaiHire" })}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
            {isAuthenticated ? (
              <Link
                href={user?.organizationId ? "/dashboard" : "/auth/onboarding"}
                className="inline-flex items-center gap-2 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-sm font-black shadow-sm hover:scale-105 active:scale-95 transition-all"
              >
                <span>{t("landing.enterDashboard")}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/auth/register"
                prefetch={false}
                className="inline-flex items-center gap-2 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-sm font-black shadow-sm hover:scale-105 active:scale-95 transition-all"
              >
                <span>{t("landing.ctaButton")}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          <p className="mt-5 text-xs text-muted-foreground font-medium">
            {t("landing.ctaHint")}
          </p>
        </div>
      </div>
    </section>
  );
};
