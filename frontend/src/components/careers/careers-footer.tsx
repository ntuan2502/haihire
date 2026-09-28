"use client";

import Link from "next/link";

import { useI18n } from "@/i18n";
import { BRAND_CONFIG } from "@haihire/shared";

import { cn } from "cn";

export interface CareersFooterProps {
  /** Company/Organization name (optional) */
  orgName?: string;
  /** Company/Organization slug (optional) */
  orgSlug?: string;
  /** Custom additional CSS classes */
  className?: string;
  /** Custom max-width container class (default: max-w-7xl) */
  maxWidthClassName?: string;
}

export function CareersFooter({
  orgName,
  orgSlug,
  className,
  maxWidthClassName = "max-w-7xl",
}: CareersFooterProps) {
  const { t } = useI18n();
  const currentYear = new Date().getFullYear();
  const displayName = orgName || BRAND_CONFIG.name;

  return (
    <footer
      className={cn(
        "border-t border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs py-6 sm:py-8 text-center text-xs text-slate-500 dark:text-slate-400 mt-auto transition-colors select-none",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4",
          maxWidthClassName,
        )}
      >
        <div className="flex items-center gap-2.5">
          {orgSlug ? (
            <Link
              href={`/careers/${orgSlug}`}
              className="flex items-center gap-2 group hover:opacity-85 transition-opacity"
            >
              <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-2xs group-hover:scale-105 transition-transform">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {displayName} {t("careers.title")}
              </span>
            </Link>
          ) : (
            <Link
              href="/"
              className="flex items-center gap-2 group hover:opacity-85 transition-opacity"
            >
              <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-xs shadow-2xs group-hover:scale-105 transition-transform">
                {BRAND_CONFIG.monogram}
              </div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {BRAND_CONFIG.name}
              </span>
            </Link>
          )}
        </div>

        <div className="text-slate-500 dark:text-slate-400">
          {t("careers.poweredBy")}{" "}
          <Link
            href="/"
            className="font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {BRAND_CONFIG.legalName}
          </Link>{" "}
          • © {currentYear} {displayName}. {t("careers.allRightsReserved")}
        </div>
      </div>
    </footer>
  );
}

export const PublicFooter = CareersFooter;
export type PublicFooterProps = CareersFooterProps;

