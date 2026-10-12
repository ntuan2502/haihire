"use client";

import { ErrorFallback } from "@/components/shared/error-fallback";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      variant="compact"
      titleKey="errors.boundary.dashboardTitle"
      descriptionKey="errors.boundary.dashboardDescription"
      homeHref="/dashboard"
      homeLabelKey="nav.dashboard"
    />
  );
}
