"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "@/i18n";
import { BrandLogo } from "@/components/shared";

export const LandingFooter: React.FC = () => {
  const { t } = useI18n();

  return (
    <footer className="relative z-20 border-t border-border bg-card pt-16 pb-12 text-muted-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-border">
          {/* Logo & Tagline (2 cols) */}
          <div className="md:col-span-2 space-y-4">
            <BrandLogo size="md" />
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm leading-relaxed">
              {t("landing.footerTagline")}
            </p>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-foreground">
              {t("landing.footerColProduct")}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="#features"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("landing.footerPipeline")}
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("landing.footerAiScreening")}
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("landing.footerScorecards")}
                </a>
              </li>
              <li>
                <Link
                  href="/careers"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("landing.footerCareerPortals")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-foreground">
              {t("landing.footerColResources")}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/careers"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("landing.footerApiDocs")}
                </Link>
              </li>
              <li>
                <a
                  href="#features"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("landing.footerSecurity")}
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-foreground">
              {t("landing.footerColCompany")}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                  {t("landing.footerPrivacy")}
                </span>
              </li>
              <li>
                <span className="text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                  {t("landing.footerTerms")}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          {/* System Status Indicator */}
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500 animate-pulse"
              aria-hidden="true"
            />
            <span>{t("landing.footerSystemsNormal")}</span>
          </div>

          <p className="text-muted-foreground text-center sm:text-right">
            {t("landing.footerRights", { brand: "HaiHire" })}
          </p>
        </div>
      </div>
    </footer>
  );
};
