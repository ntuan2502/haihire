"use client";

import React from "react";
import Link from "next/link";

import { useI18n } from "@/i18n";

export interface CareersFooterProps {
  /** Company/Organization name (optional) */
  orgName?: string;
  /** Company/Organization slug (optional) */
  orgSlug?: string;
}

export function CareersFooter({ orgName, orgSlug }: CareersFooterProps) {
  const { t } = useI18n();
  const currentYear = new Date().getFullYear();
  const displayName = orgName || "ATS";

  return (
    <footer className="border-t border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs py-8 text-center text-xs text-slate-500 dark:text-slate-400 mt-auto transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
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
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-xs shadow-2xs">
                A
              </div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                ATS {t("careers.title")}
              </span>
            </div>
          )}
        </div>

        <div className="text-slate-500 dark:text-slate-400">
          {t("careers.poweredBy")}{" "}
          <Link
            href="/"
            className="font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            ATS Platform
          </Link>{" "}
          • © {t("careers.allRightsReserved", { year: currentYear, name: displayName })}
        </div>
      </div>
    </footer>
  );
}
