"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "@/i18n";
import { BrandLogo } from "@/components/shared";

export const LandingFooter: React.FC = () => {
  const { t } = useI18n();

  return (
    <footer className="relative z-20 border-t border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-slate-950/90 pt-16 pb-12 text-slate-500 dark:text-slate-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-slate-200/80 dark:border-white/10">
          {/* Logo & Tagline (2 cols) */}
          <div className="md:col-span-2 space-y-4">
            <BrandLogo size="md" />
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed">
              {t("landing.footerTagline")}
            </p>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              {t("landing.footerColProduct")}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#demo" className="text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-cyan-300 transition-colors">
                  {t("landing.footerPipeline")}
                </a>
              </li>
              <li>
                <a href="#features" className="text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-cyan-300 transition-colors">
                  {t("landing.footerAiScreening")}
                </a>
              </li>
              <li>
                <a href="#features" className="text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-cyan-300 transition-colors">
                  {t("landing.footerScorecards")}
                </a>
              </li>
              <li>
                <Link href="/careers" className="text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-cyan-300 transition-colors">
                  {t("landing.footerCareerPortals")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              {t("landing.footerColResources")}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/careers" className="text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-cyan-300 transition-colors">
                  {t("landing.footerApiDocs")}
                </Link>
              </li>
              <li>
                <a href="#features" className="text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-cyan-300 transition-colors">
                  {t("landing.footerSecurity")}
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              {t("landing.footerColCompany")}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-cyan-300 transition-colors cursor-pointer">
                  {t("landing.footerPrivacy")}
                </span>
              </li>
              <li>
                <span className="text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-cyan-300 transition-colors cursor-pointer">
                  {t("landing.footerTerms")}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          {/* System Status Indicator */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 font-medium text-emerald-700 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{t("landing.footerSystemsNormal")}</span>
          </div>

          <p className="text-slate-500 dark:text-slate-400">
            {t("landing.footerRights", { brand: "HaiHire" })}
          </p>
        </div>
      </div>
    </footer>
  );
};
