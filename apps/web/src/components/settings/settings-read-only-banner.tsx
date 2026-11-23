"use client";

import { Shield } from "lucide-react";
import { useI18n, type TranslationKey } from "@/i18n";
import { cn } from "@/lib/utils";

export interface SettingsReadOnlyBannerProps {
  messageKey?: TranslationKey;
  className?: string;
}

export function SettingsReadOnlyBanner({
  messageKey = "settings.readOnlyAdmin",
  className,
}: SettingsReadOnlyBannerProps) {
  const { t } = useI18n();

  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-2.5 rounded-lg border border-border bg-muted/60 px-3.5 py-2.5 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      <Shield className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{t(messageKey)}</span>
    </div>
  );
}
