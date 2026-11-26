"use client";

import { useState } from "react";
import Link from "next/link";
import { Briefcase, Menu, X, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";
import { BRAND_CONFIG } from "@haihire/shared";
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
      <header className="sticky top-0 z-50 w-full h-16 bg-background/85 backdrop-blur-md border-b border-border transition-colors select-none">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Left: Brand Logo & Navigation Links */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              aria-label={BRAND_CONFIG.name}
              className="rounded-md hover:opacity-90 transition-opacity focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <BrandLogo size="md" />
            </Link>

            {/* Nav Links (Desktop) */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/careers"
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
              >
                <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
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
                  prefetch={false}
                  className="inline-flex items-center text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 cursor-pointer"
                >
                  <span>{t("landing.signIn")}</span>
                </Link>
                <Link
                  href="/auth/register"
                  prefetch={false}
                  className="inline-flex items-center justify-center rounded-md bg-primary hover:bg-primary/90 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-primary-foreground transition-colors cursor-pointer"
                >
                  <span>{t("landing.signUp")}</span>
                </Link>
              </div>
            )}

            {/* Mobile Menu Hamburger / Close Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
              aria-label={t("common.toggleNavigationMenu")}
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
                prefetch={false}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-semibold h-10 rounded-md transition-colors cursor-pointer"
              >
                <LogIn className="h-4 w-4" />
                <span>{t("landing.signIn")}</span>
              </Link>
              <Link
                href="/auth/register"
                prefetch={false}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold h-10 rounded-md shadow-xs transition-colors cursor-pointer"
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
          className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-xs font-semibold text-foreground/80 hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
          <span>{t("landing.navCareers")}</span>
        </Link>
      </MobileDrawer>
    </>
  );
};
