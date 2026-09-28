"use client";

import { useState } from "react";
import Link from "next/link";
import { LanguageDropdown } from "@/components/shared/language-dropdown";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { BrandLogo } from "@/components/shared/brand-logo";
import { UserMenu } from "@/components/layout/user-menu";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";
import {
  Building2,
  Share2,
  Check,
  Menu,
  X,
  ArrowRight,
  Briefcase,
} from "lucide-react";

export interface CareersHeaderProps {
  /** Company/Organization name (if viewing a company or job page) */
  orgName?: string;
  /** Organization slug (if viewing a company or job page) */
  orgSlug?: string;
  /** Whether to show the share button */
  showShareButton?: boolean;
  /** Share click handler */
  onShare?: () => void;
  /** Whether the share link was just copied */
  copiedLink?: boolean;
  /** Label for share button (default from i18n) */
  shareLabel?: string;
}

export function CareersHeader({
  orgName,
  orgSlug,
  showShareButton = false,
  onShare,
  copiedLink = false,
  shareLabel,
}: CareersHeaderProps) {
  const { t } = useI18n();
  const { isAuthenticated, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeShareLabel = shareLabel || t("careers.share");

  // Case 1: Organization or Job Detail page (Identical Navbar)
  if (orgSlug && orgName) {
    return (
      <>
        <header className="sticky top-0 z-40 w-full h-16 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors select-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
            {/* Left: Branding */}
            <Link
              href={`/careers/${orgSlug}`}
              className="flex items-center gap-3 min-w-0 group hover:opacity-90 transition-opacity"
            >
              <div className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-base shadow-sm group-hover:scale-105 transition-transform">
                {orgName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                  <span>{t("careers.companyPage")}</span>
                </div>
                <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight truncate">
                  {orgName}
                </div>
              </div>
            </Link>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Quick link back to the general careers directory */}
              <Link
                href="/careers"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors"
                title={t("careers.allCompanies")}
              >
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                <span>{t("careers.allCompanies")}</span>
              </Link>

              {/* Share button (desktop) */}
              {showShareButton && onShare && (
                <button
                  onClick={onShare}
                  type="button"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title={t("careers.copyLink")}
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">{t("careers.copied")}</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-3.5 w-3.5 text-slate-400" />
                      <span className="hidden sm:inline">{activeShareLabel}</span>
                    </>
                  )}
                </button>
              )}

              <div className="hidden md:flex items-center gap-1.5">
                <ThemeToggle />
                <LanguageDropdown />
              </div>

              {isAuthenticated && user && (
                <div className="flex items-center gap-2">
                  <Link
                    href="/dashboard"
                    className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <span>{t("landing.enterDashboard")}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <UserMenu />
                </div>
              )}

              {/* Mobile Menu Hamburger */}
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
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-10 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <span>{t("landing.enterDashboard")}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : undefined
          }
        >
          <Link
            href="/careers"
            onClick={() => setMobileMenuOpen(false)}
            className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white transition-colors"
          >
            <Building2 className="h-4 w-4 text-slate-500 shrink-0" />
            <span>{t("careers.allCompanies")}</span>
          </Link>

          {showShareButton && onShare && (
            <button
              type="button"
              onClick={() => {
                onShare();
                setMobileMenuOpen(false);
              }}
              className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <Share2 className="h-4 w-4 text-slate-500 shrink-0" />
              <span>{activeShareLabel}</span>
            </button>
          )}
        </MobileDrawer>
      </>
    );
  }

  // Case 2: General /careers directory
  return (
    <>
      <header className="sticky top-0 z-40 w-full h-16 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <BrandLogo size="md" />
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="hidden md:flex items-center gap-1.5">
              <ThemeToggle />
              <LanguageDropdown />
            </div>

            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-xs font-bold shadow-xs hover:scale-102 transition-all cursor-pointer"
                >
                  <span>{t("landing.enterDashboard")}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <UserMenu />
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors"
              >
                <span>{t("careers.forEmployers")}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}

            {/* Mobile Menu Hamburger */}
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
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-10 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <span>{t("landing.enterDashboard")}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : undefined
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
        {!isAuthenticated && (
          <Link
            href="/login"
            onClick={() => setMobileMenuOpen(false)}
            className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white transition-colors"
          >
            <Building2 className="h-4 w-4 text-slate-500 shrink-0" />
            <span>{t("careers.forEmployers")}</span>
          </Link>
        )}
      </MobileDrawer>
    </>
  );
}
