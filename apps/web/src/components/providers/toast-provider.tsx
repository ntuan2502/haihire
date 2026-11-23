"use client";

import { Toaster } from "@/components/ui/sonner";
import { useI18n } from "@/i18n";

/**
 * Global toast container synchronized with next-themes and the active locale.
 */
export function ToastProvider() {
  const { t } = useI18n();

  return (
    <Toaster
      position="bottom-right"
      richColors
      closeButton
      visibleToasts={5}
      duration={4000}
      containerAriaLabel={t("common.systemNotifications")}
    />
  );
}
