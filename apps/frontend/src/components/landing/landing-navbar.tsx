"use client";

import { useState } from "react";
import Link from "next/link";
import { Briefcase, Menu, X, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";
import { BrandLogo } from "@/components/shared";
import { LanguageDropdown } from "@/components/shared/language-dropdown";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import {
  UserMenu,
  MobileDrawer,
  EnterDashboardButton,
} from "@/components/layout";

export const LandingNavbar = () => {
  const { isAuthenticated, user } = useAuth();
  const { t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full h-16 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 transition-colors select-none">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Left: Brand Logo & Navigation Links */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              aria-label="HaiHire Home"
              className="rounded-lg hover:opacity-90 transition-opacity focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            >
              <BrandLogo size="md" />
            </Link>

            {/* Nav Links (Desktop) */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/careers"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
              >
                <Briefcase className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                <span>{t("landing.navCareers")}</span>
              </Link>
            </nav>
          </div>

          {/* Right Controls & Auth Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Theme & Language Switchers (Desktop Only) */}
            <div className="hidden md:flex items-center gap-1.5">
              <ThemeToggle />
              <LanguageDropdown />
            </div>

            {/* Auth Controls */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <EnterDashboardButton className="hidden md:inline-flex" />
                <UserMenu />
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2 sm:gap-3">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors px-3 py-2 cursor-pointer"
                >
                  <LogIn className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <span>{t("landing.signIn")}</span>
                </Link>
                <Link
                  href="/auth/register"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 shadow-xs hover:scale-102 active:scale-98 transition-all cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>{t("landing.signUp")}</span>
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
      </header>

      {/* Reusable Mobile Drawer */}
      <MobileDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        footer={
          isAuthenticated ? (
            <EnterDashboardButton
              fullWidth
              onClick={() => setMobileMenuOpen(false)}
            />
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                href="/auth/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold h-10 rounded-xl transition-colors cursor-pointer"
              >
                <LogIn className="h-4 w-4" />
                <span>{t("landing.signIn")}</span>
              </Link>
              <Link
                href="/auth/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-xs font-bold h-10 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                <span>{t("landing.signUp")}</span>
              </Link>
            </div>
          )
        }
      >
        <Link
          href="/careers"
          onClick={() => setMobileMenuOpen(false)}
          className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white transition-colors"
        >
          <Briefcase className="h-4 w-4 text-slate-500 shrink-0" />
          <span>{t("landing.navCareers")}</span>
        </Link>
      </MobileDrawer>
    </>
  );
};
