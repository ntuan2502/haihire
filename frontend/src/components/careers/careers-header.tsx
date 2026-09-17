"use client";

import React from "react";
import Link from "next/link";
import { LanguageDropdown } from "@/components/language-dropdown";
import { ThemeToggle } from "@/components/theme-toggle";
import { useI18n } from "@/i18n";
import {
  Building2,
  Share2,
  Check,
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
  const activeShareLabel = shareLabel || t("careers.share");

  // Case 1: Organization or Job Detail page (Identical Navbar)
  if (orgSlug && orgName) {
    return (
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Left: Branding */}
          <Link
            href={`/careers/${orgSlug}`}
            className="flex items-center gap-3 min-w-0 group hover:opacity-90 transition-opacity"
          >
            <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
              {orgName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                <span>Careers Portal</span>
              </div>
              <div className="text-base font-extrabold text-slate-900 dark:text-white leading-tight truncate">
                {orgName}
              </div>
            </div>
          </Link>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick link back to the general careers directory */}
            <Link
              href="/careers"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors"
              title={t("careers.allCompanies")}
            >
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              <span>{t("careers.allCompanies")}</span>
            </Link>

            {/* Share button */}
            {showShareButton && onShare && (
              <button
                onClick={onShare}
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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

            <ThemeToggle />

            <LanguageDropdown />
          </div>
        </div>
      </header>
    );
  }

  // Case 2: General /careers directory
  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 p-0.5 shadow-sm group-hover:scale-105 transition-transform">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-900">
                <span className="font-black text-sm text-cyan-300">A</span>
              </div>
            </div>
            <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
              ATS Careers
            </span>
          </Link>

          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
            {t("careers.portalSubtitle")}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />

          <LanguageDropdown />

          <Link
            href="/login"
            className="text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white px-2.5 py-1.5 transition-colors hidden sm:inline-block"
          >
            {t("careers.forEmployers")} &rarr;
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:scale-102 transition-all cursor-pointer"
          >
            <span>{t("careers.goToDashboard")}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
