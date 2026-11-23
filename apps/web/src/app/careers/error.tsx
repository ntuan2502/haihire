"use client";

import { ErrorFallback } from "@/components/shared/error-fallback";

export default function CareersError({
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
      variant="default"
      titleKey="errors.boundary.careersTitle"
      descriptionKey="errors.boundary.careersDescription"
      homeHref="/careers"
      homeLabelKey="errors.boundary.goHome"
    />
  );
}
