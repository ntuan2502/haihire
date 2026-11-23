"use client";

import { useEffect, useState } from "react";
import {
  ErrorFallback,
  FALLBACK_STRINGS,
  detectStandaloneLocale,
} from "@/components/shared/error-fallback";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<"vi" | "en">("en");

  useEffect(() => {
    setLocale(detectStandaloneLocale());
  }, []);

  const skipLabel = FALLBACK_STRINGS[locale].skipToMain;

  return (
    <html lang={locale}>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring font-semibold text-xs shadow-lg transition-colors"
        >
          {skipLabel}
        </a>
        <main id="main-content" className="flex-1 flex flex-col">
          <ErrorFallback error={error} reset={reset} variant="fullscreen" />
        </main>
      </body>
    </html>
  );
}
