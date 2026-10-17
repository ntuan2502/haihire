"use client";

import { useI18n } from "@/i18n";

export function SkipToContent() {
  const { t } = useI18n();

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-xs shadow-lg transition-all"
    >
      {t("common.skipToContent")}
    </a>
  );
}
