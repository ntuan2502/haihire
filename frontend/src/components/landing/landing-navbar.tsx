"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Briefcase, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";
import { BrandLogo } from "@/components/shared";
import { LanguageDropdown } from "@/components/shared/language-dropdown";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export const LandingNavbar: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { t } = useI18n();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? "bg-white/85 dark:bg-[#030b1e]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 shadow-sm dark:shadow-black/20"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 sm:px-8">
        {/* Brand Logo */}
        <BrandLogo size="md" />

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <a
            href="#features"
            className="hover:text-blue-600 dark:hover:text-cyan-300 transition-colors"
          >
            {t("landing.navFeatures")}
          </a>
          <a
            href="#workflow"
            className="hover:text-blue-600 dark:hover:text-cyan-300 transition-colors"
          >
            {t("landing.navWorkflow")}
          </a>
          <a
            href="#comparison"
            className="hover:text-blue-600 dark:hover:text-cyan-300 transition-colors"
          >
            {t("landing.navComparison")}
          </a>
          <Link
            href="/careers"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/5 hover:bg-slate-900/10 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white font-semibold border border-slate-300/80 dark:border-white/15 shadow-2xs transition-all hover:scale-105"
          >
            <Briefcase className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-300" />
            <span>{t("landing.navCareers")}</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </Link>
        </nav>

        {/* Right CTA Button, ThemeToggle & Language Dropdown */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            href="/careers"
            className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/5 dark:bg-white/10 text-xs font-bold text-slate-800 dark:text-white border border-slate-200 dark:border-white/10"
          >
            <Briefcase className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-300" />
            <span>{t("landing.careers")}</span>
          </Link>

          {/* Theme Switcher */}
          <ThemeToggle variant="landing" />

          {/* Language Switcher */}
          <LanguageDropdown variant="landing" />

          {isAuthenticated ? (
            <Link
              href={user?.organizationId ? "/dashboard" : "/onboarding/create-org"}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 px-5 py-2.5 text-xs sm:text-sm font-bold shadow-md hover:scale-105 transition-all"
            >
              <span>{t("landing.enterDashboard")}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/login"
                className="hidden sm:inline-flex text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors px-3 py-2"
              >
                {t("landing.signIn")}
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all"
              >
                {t("landing.startFree")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
