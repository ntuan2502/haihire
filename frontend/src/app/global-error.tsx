"use client";

import { ErrorFallback } from "@/components/shared/error-fallback";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-xs shadow-lg transition-all"
        >
          {"Skip to main content"}
        </a>
        <main id="main-content" className="flex-1 flex flex-col">
          <ErrorFallback error={error} reset={reset} variant="fullscreen" />
        </main>
      </body>
    </html>
  );
}
