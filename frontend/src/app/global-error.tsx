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
        <ErrorFallback error={error} reset={reset} variant="fullscreen" />
      </body>
    </html>
  );
}
