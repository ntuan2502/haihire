import {
  toast as reactToastify,
  type Id,
  type ToastContent,
  type ToastOptions,
} from "react-toastify";

export type AppToastOptions<TData = unknown> = ToastOptions<TData>;

/**
 * Unified application notification API backed by react-toastify.
 * Always import `@/lib/toast` instead of calling `react-toastify` directly.
 */
export const toast = {
  success<TData = unknown>(
    content: ToastContent<TData>,
    options?: AppToastOptions<TData>,
  ): Id {
    return reactToastify.success(content, options);
  },

  error<TData = unknown>(
    content: ToastContent<TData>,
    options?: AppToastOptions<TData>,
  ): Id {
    return reactToastify.error(content, options);
  },

  info<TData = unknown>(
    content: ToastContent<TData>,
    options?: AppToastOptions<TData>,
  ): Id {
    return reactToastify.info(content, options);
  },

  warning<TData = unknown>(
    content: ToastContent<TData>,
    options?: AppToastOptions<TData>,
  ): Id {
    return reactToastify.warning(content, options);
  },

  dismiss(id?: Id): void {
    reactToastify.dismiss(id);
  },

  isActive(id: Id): boolean {
    return reactToastify.isActive(id);
  },
};
