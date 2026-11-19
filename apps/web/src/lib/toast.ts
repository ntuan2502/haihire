import type { ReactNode } from "react";
import { toast as sonnerToast, type ExternalToast } from "sonner";

export type ToastId = string | number;

export type AppToastOptions = Omit<ExternalToast, "id"> & {
  id?: ToastId;
  toastId?: ToastId;
};

function normalizeToastOptions(
  options?: AppToastOptions,
): ExternalToast | undefined {
  if (!options) return undefined;
  const { toastId, id, ...rest } = options;
  const resolvedId = id ?? toastId;
  if (resolvedId !== undefined) {
    return { ...rest, id: resolvedId };
  }
  return Object.keys(rest).length > 0 ? rest : undefined;
}

/**
 * Unified application notification API backed by Sonner (`@/components/ui/sonner`).
 * Always import `@/lib/toast` instead of calling `sonner` directly.
 */
export const toast = {
  success(content: ReactNode, options?: AppToastOptions): ToastId {
    return sonnerToast.success(content, normalizeToastOptions(options));
  },

  error(content: ReactNode, options?: AppToastOptions): ToastId {
    return sonnerToast.error(content, normalizeToastOptions(options));
  },

  info(content: ReactNode, options?: AppToastOptions): ToastId {
    return sonnerToast.info(content, normalizeToastOptions(options));
  },

  warning(content: ReactNode, options?: AppToastOptions): ToastId {
    return sonnerToast.warning(content, normalizeToastOptions(options));
  },

  dismiss(id?: ToastId): void {
    sonnerToast.dismiss(id);
  },

  isActive(id: ToastId): boolean {
    if (typeof sonnerToast.getToasts !== "function") return false;
    return sonnerToast
      .getToasts()
      .some((item) => item.id === id && !("dismiss" in item && item.dismiss));
  },
};
