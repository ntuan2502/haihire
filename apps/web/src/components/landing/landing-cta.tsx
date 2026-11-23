"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";

export const LandingCta: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { t } = useI18n();

  return (
    <section className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-8 sm:p-12 text-center">
        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
          <p className="text-xs font-mono text-muted-foreground mb-3">
            {t("landing.ctaBadge")}
          </p>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-foreground tracking-tight leading-tight">
            {t("landing.ctaTitle")}
          </h2>

          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed font-normal">
            {t("landing.ctaDesc", { brand: "HaiHire" })}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
            {isAuthenticated ? (
              <Link
                href={user?.organizationId ? "/dashboard" : "/auth/onboarding"}
                className="inline-flex items-center gap-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-6 h-11 text-sm font-medium transition-colors"
              >
                <span>{t("landing.enterDashboard")}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/auth/register"
                prefetch={false}
                className="inline-flex items-center gap-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-6 h-11 text-sm font-medium transition-colors"
              >
                <span>{t("landing.ctaButton")}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          <p className="mt-5 text-xs text-muted-foreground">
            {t("landing.ctaHint")}
          </p>
        </div>
      </div>
    </section>
  );
};
