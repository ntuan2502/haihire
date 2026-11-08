"use client";

import Link from "next/link";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";
import { useI18n } from "@/i18n";

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div
      className="min-h-[75vh] w-full flex flex-col items-center justify-center p-4 sm:p-6"
      data-testid="not-found-page"
    >
      <div className="w-full max-w-lg p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col items-center text-center space-y-5">
        {/* Visual Badge & Icon */}
        <div className="relative">
          <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-xs">
            <FileQuestion className="h-8 w-8 sm:h-9 sm:w-9" />
          </div>
          <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs">
            404
          </span>
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t("errors.notFound.title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
            {t("errors.notFound.description")}
          </p>
        </div>

        {/* Navigation CTAs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 w-full sm:w-auto">
          <Link
            href="/"
            className="h-10 px-5 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Home className="h-4 w-4" />
            <span>{t("errors.notFound.goHome")}</span>
          </Link>

          <Link
            href="/dashboard"
            className="h-10 px-4 rounded-xl text-xs sm:text-sm font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-[0.98] text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 inline-flex items-center justify-center gap-2 select-none transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t("nav.dashboard")}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
