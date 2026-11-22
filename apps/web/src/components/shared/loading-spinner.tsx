"use client";

import { useOptionalI18n } from "@/i18n/optional";

export interface LoadingSpinnerProps {
  text?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({
  text,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const { t } = useOptionalI18n();
  const displayText = text ?? t("common.loading");

  return (
    <div
      className={`flex flex-1 flex-col items-center justify-center w-full ${
        fullScreen ? "min-h-screen bg-background" : "min-h-[240px]"
      }`}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent shadow-xs" />
        <p className="text-xs text-muted-foreground font-medium animate-pulse">
          {displayText}
        </p>
      </div>
    </div>
  );
}
