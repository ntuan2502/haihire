"use client";

import { useState } from "react";
import Link from "next/link";
import { LanguageDropdown } from "@/components/shared/language-dropdown";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { BrandLogo } from "@/components/shared/brand-logo";
import { OrganizationLogo } from "@/components/shared/organization-logo";
import {
  UserMenu,
  MobileDrawer,
  EnterDashboardButton,
} from "@/components/layout";
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
  /** Organization logo URL (if configured) */
  orgLogoUrl?: string | null;
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
  orgLogoUrl,
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
        <header className="sticky top-0 z-40 w-full h-16 bg-background/85 backdrop-blur-md border-b border-border transition-colors select-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
            {/* Left: Branding */}
            <Link
              href={`/careers/${orgSlug}`}
              className="flex items-center gap-3 min-w-0 group hover:opacity-90 transition-opacity"
            >
              <OrganizationLogo
                name={orgName}
                logoUrl={orgLogoUrl}
                variant="gradient"
                decorative
                className="h-9 w-9 rounded-lg text-base shadow-sm group-hover:scale-105 transition-transform"
              />
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                  <span>{t("careers.companyPage")}</span>
                </div>
                <div className="text-sm sm:text-base font-extrabold text-foreground leading-tight truncate">
                  {orgName}
                </div>
              </div>
            </Link>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Quick link back to the general careers directory */}
              <Link
                href="/careers"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-secondary/70 text-xs font-semibold text-secondary-foreground hover:bg-secondary transition-colors"
                title={t("careers.allCompanies")}
              >
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{t("careers.allCompanies")}</span>
              </Link>

              {/* Share button (desktop) */}
              {showShareButton && onShare && (
                <button
                  onClick={onShare}
                  type="button"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-card text-xs font-semibold text-foreground hover:bg-accent transition-colors cursor-pointer"
                  title={t("careers.copyLink")}
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {t("careers.copied")}
                      </span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="hidden sm:inline">
                        {activeShareLabel}
                      </span>
                    </>
                  )}
                </button>
              )}

              <div className="hidden md:flex items-center gap-1.5">
                <ThemeToggle />
                <LanguageDropdown />
              </div>

              {isAuthenticated && user && (
                <div className="flex items-center gap-2 sm:gap-3">
                  <EnterDashboardButton className="hidden md:inline-flex" />
                  <UserMenu />
                </div>
              )}

              {/* Mobile Menu Hamburger */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
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
            ) : undefined
          }
        >
          <Link
            href="/careers"
            onClick={() => setMobileMenuOpen(false)}
            className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-xs font-semibold text-foreground/80 hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{t("careers.allCompanies")}</span>
          </Link>

          {showShareButton && onShare && (
            <button
              type="button"
              onClick={() => {
                onShare();
                setMobileMenuOpen(false);
              }}
              className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-xs font-semibold text-foreground/80 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
            >
              <Share2 className="h-4 w-4 text-muted-foreground shrink-0" />
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
      <header className="sticky top-0 z-40 w-full h-16 bg-background/85 backdrop-blur-md border-b border-border transition-colors select-none">
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
              <div className="flex items-center gap-2 sm:gap-3">
                <EnterDashboardButton className="hidden md:inline-flex" />
                <UserMenu />
              </div>
            ) : (
              <Link
                href="/auth/login"
                prefetch={false}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <span>{t("careers.forEmployers")}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}

            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
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
          ) : undefined
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
        {!isAuthenticated && (
          <Link
            href="/auth/login"
            prefetch={false}
            onClick={() => setMobileMenuOpen(false)}
            className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-xs font-semibold text-foreground/80 hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{t("careers.forEmployers")}</span>
          </Link>
        )}
      </MobileDrawer>
    </>
  );
}
