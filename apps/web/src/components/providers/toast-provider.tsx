"use client";

import { useTheme } from "next-themes";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useI18n } from "@/i18n";

/**
 * Global toast container synchronized with next-themes and the active locale.
 */
export function ToastProvider() {
  const { resolvedTheme } = useTheme();
  const { t } = useI18n();

  return (
    <ToastContainer
      position="bottom-right"
      autoClose={4000}
      newestOnTop
      closeOnClick
      pauseOnHover
      draggable
      limit={5}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      aria-label={t("common.systemNotifications")}
    />
  );
}
