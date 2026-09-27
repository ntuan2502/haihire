"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Briefcase, Menu, X, ShieldCheck, UserPlus, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";
import { BrandLogo } from "@/components/shared";
import { LanguageDropdown } from "@/components/shared/language-dropdown";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { MobileDrawer } from "@/components/layout/mobile-drawer";

export const LandingNavbar = () => {
  const { isAuthenticated, user } = useAuth();
  const { t } = useI18n();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);



  return (
    <header
      className={`sticky top-0 z-50 w-full h-16 transition-all duration-300 select-none ${
        isScrolled
          ? "bg-white/85 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand Logo */}
        <Link href="/" className="hover:opacity-90 transition-opacity focus:outline-hidden">
          <BrandLogo size="md" />
        </Link>

        {/* Center Nav Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-4 text-sm font-semibold">
          <Link
            href="/careers"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/5 hover:bg-slate-900/10 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white font-semibold border border-slate-300/80 dark:border-white/15 shadow-2xs transition-all hover:scale-105"
          >
            <Briefcase className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-300" />
            <span>{t("landing.navCareers")}</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </Link>
        </nav>

        {/* Right Controls & Auth Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Theme & Language Switchers (Desktop Only) */}
          <div className="hidden md:flex items-center gap-1.5">
            <ThemeToggle />
            <LanguageDropdown />
          </div>

          {/* Auth Controls */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 sm:gap-2.5">
              <Link
                href={user?.organizationId ? "/dashboard" : "/onboarding/create-org"}
                className="hidden md:inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 px-3.5 py-1.5 text-xs font-bold shadow-xs hover:scale-105 active:scale-95 transition-all"
              >
                <span>{t("landing.enterDashboard")}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <UserMenu />
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2 sm:gap-3">
              <Link
                href="/login"
                className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors px-3 py-2"
              >
                {t("landing.signIn")}
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all"
              >
                {t("landing.signUp")}
              </Link>
            </div>
          )}

          {/* Mobile Menu Hamburger / Close Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5 stroke-[2]" />
            ) : (
              <Menu className="h-5 w-5 stroke-[2]" />
            )}
          </button>
        </div>
      </div>

      {/* Reusable Mobile Drawer */}
      <MobileDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        footer={
          isAuthenticated ? (
            <Link
              href={user?.organizationId ? "/dashboard" : "/onboarding/create-org"}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-10 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <span>{t("landing.enterDashboard")}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-10 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                <span>{t("landing.signUp")}</span>
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold h-9 rounded-xl transition-colors cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>{t("landing.signIn")}</span>
              </Link>
            </div>
          )
        }
      >
        <Link
          href="/careers"
          onClick={() => setMobileMenuOpen(false)}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white transition-colors"
        >
          <div className="flex items-center gap-3">
            <Briefcase className="h-4 w-4 text-slate-500" />
            <span>{t("landing.navCareers")}</span>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </Link>
      </MobileDrawer>
    </header>
  );
};
