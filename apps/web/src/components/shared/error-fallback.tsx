"use client";

import { useEffect, useContext, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { I18nContext, type TranslationKey } from "@/i18n";

export interface ErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  variant?: "default" | "compact" | "fullscreen";
  titleKey?: TranslationKey;
  descriptionKey?: TranslationKey;
  homeHref?: string;
  homeLabelKey?: TranslationKey;
}

const FALLBACK_STRINGS = {
  en: {
    title: "Something went wrong",
    description: "We've logged the issue. Please try again.",
    tryAgain: "Try again",
    goHome: "Go home",
    dashboardTitle: "Dashboard Error",
    dashboardDescription: "Could not load dashboard. Please try again.",
    careersTitle: "Careers Page Error",
    careersDescription: "Could not load careers page. Please try again.",
  },
  vi: {
    title: "Có lỗi xảy ra",
    description: "Chúng tôi đã ghi nhận sự cố. Vui lòng thử lại.",
    tryAgain: "Thử lại",
    goHome: "Về trang chủ",
    dashboardTitle: "Lỗi Dashboard",
    dashboardDescription: "Không thể tải dashboard. Vui lòng thử lại.",
    careersTitle: "Lỗi trang tuyển dụng",
    careersDescription: "Không thể tải trang tuyển dụng. Vui lòng thử lại.",
  },
};

function detectStandaloneLocale(): "vi" | "en" {
  if (typeof window === "undefined") return "en";
  try {
    const stored = localStorage.getItem("haihire_locale");
    if (stored === "vi" || stored === "en") return stored;
    if (document.cookie.includes("NEXT_LOCALE=vi")) return "vi";
    if (document.cookie.includes("NEXT_LOCALE=en")) return "en";
    if (navigator.language?.toLowerCase().startsWith("vi")) return "vi";
  } catch {
    // Ignore storage restrictions
  }
  return "en";
}

export function ErrorFallback({
  error,
  reset,
  variant = "default",
  titleKey,
  descriptionKey,
  homeHref = "/",
  homeLabelKey,
}: ErrorFallbackProps) {
  const i18n = useContext(I18nContext);
  const [standaloneLocale, setStandaloneLocale] = useState<"vi" | "en">("en");

  useEffect(() => {
    setStandaloneLocale(detectStandaloneLocale());
  }, []);

  useEffect(() => {
    console.error("Error boundary caught:", error);
  }, [error]);

  const dict = FALLBACK_STRINGS[standaloneLocale];

  // Resolve localized text
  const title = titleKey
    ? i18n?.t(titleKey) || (titleKey.includes("dashboard") ? dict.dashboardTitle : titleKey.includes("careers") ? dict.careersTitle : dict.title)
    : i18n?.t("errors.boundary.title") || dict.title;

  const description = descriptionKey
    ? i18n?.t(descriptionKey) || (descriptionKey.includes("dashboard") ? dict.dashboardDescription : descriptionKey.includes("careers") ? dict.careersDescription : dict.description)
    : i18n?.t("errors.boundary.description") || dict.description;

  const tryAgainText = i18n?.t("errors.boundary.tryAgain") || dict.tryAgain;
  const goHomeText = homeLabelKey
    ? i18n?.t(homeLabelKey) || dict.goHome
    : i18n?.t("errors.boundary.goHome") || dict.goHome;

  if (variant === "compact") {
    return (
      <div className="w-full p-4 sm:p-6 flex justify-center" data-testid="error-fallback-compact">
        <div className="w-full max-w-xl p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
          <div className="h-11 w-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>

          <div className="flex-1 space-y-1.5 min-w-0">
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {title}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {description}
            </p>
            {error.digest && (
              <p className="text-[11px] font-mono text-slate-400 select-all">
                Digest: {error.digest}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-2 justify-center sm:justify-start">
              <Button
                onClick={() => reset()}
                className="h-8 px-3 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer inline-flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{tryAgainText}</span>
              </Button>

              <Link
                href={homeHref}
                className="h-8 px-3 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 inline-flex items-center gap-1.5 transition-colors"
              >
                <Home className="h-3.5 w-3.5" />
                <span>{goHomeText}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const containerClasses =
    variant === "fullscreen"
      ? "min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans antialiased"
      : "min-h-[60vh] w-full flex flex-col items-center justify-center p-4 sm:p-6";

  return (
    <div className={containerClasses} data-testid={`error-fallback-${variant}`}>
      <div className="w-full max-w-lg p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col items-center text-center space-y-4">
        <div className="h-13 w-13 sm:h-14 sm:w-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-xs">
          <AlertTriangle className="h-6 w-6 sm:h-7 sm:w-7" />
        </div>

        <div className="space-y-2">
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
            {description}
          </p>
        </div>

        {error.digest && (
          <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400 select-all">
            Digest: {error.digest}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 w-full sm:w-auto">
          <Button
            onClick={() => reset()}
            className="h-10 px-5 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            <span>{tryAgainText}</span>
          </Button>

          <Link
            href={homeHref}
            className="h-10 px-4 rounded-xl text-xs sm:text-sm font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-[0.98] text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 inline-flex items-center justify-center gap-2 select-none transition-all"
          >
            <Home className="h-4 w-4" />
            <span>{goHomeText}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
