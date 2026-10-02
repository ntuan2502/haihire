import type { TranslationKey } from "@/i18n";
import type { ApiErrorPayload } from "@haihire/shared";

export type AppErrorSource =
  | { code: string; params?: Record<string, string | number>; message?: string }
  | { response?: { data?: ApiErrorPayload } }
  | Error
  | string
  | unknown;

/**
 * Extract localized error message from API error response or client error descriptor,
 * mapping machine-readable error codes to localized translation strings.
 */
export function getApiErrorMessage(
  error: AppErrorSource,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
  defaultFallbackKey: TranslationKey = "errors.generic",
): string {
  if (!error) return "";

  if (typeof error === "object" && error !== null) {
    // 1. Axios / HTTP error response with response.data
    if ("response" in error && (error as { response?: unknown }).response) {
      const axiosErr = error as { response?: { data?: unknown } };
      let data = axiosErr.response?.data;

      // Handle cases where response body might be a JSON string
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          // Keep as string
        }
      }

      const status = (axiosErr.response as { status?: number })?.status;

      if (data && typeof data === "object") {
        const payload = data as ApiErrorPayload & { message?: string | string[] };
        if (payload.code && typeof payload.code === "string") {
          const errorKey = `errors.${payload.code}` as TranslationKey;
          try {
            const translated = t(errorKey, payload.params);
            if (translated && translated !== errorKey) {
              return translated;
            }
          } catch {
            // Fallthrough to message
          }
        }

        if (Array.isArray(payload.message)) {
          return payload.message.join("; ");
        }

        if (payload.message && typeof payload.message === "string") {
          return payload.message;
        }
      } else if (typeof data === "string" && data.trim()) {
        return data;
      }

      // Status code fallback if no payload code/message provided
      if (status) {
        if (status === 429) return t("errors.TOO_MANY_REQUESTS");
        if (status === 401) return t("errors.UNAUTHORIZED");
        if (status === 403) return t("errors.FORBIDDEN");
        if (status === 404) return t("errors.RESOURCE_NOT_FOUND");
        if (status === 500) return t("errors.GENERIC_ERROR");
      }
    }

    // 2. Direct code descriptor: { code: "ORG_NAME_REQUIRED", params?: ... }
    // Only check if it's NOT an Axios internal error code (e.g. ERR_BAD_REQUEST, ERR_NETWORK)
    if (
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string" &&
      !("response" in error)
    ) {
      const errObj = error as {
        code: string;
        params?: Record<string, string | number>;
        message?: string;
      };
      const errorKey = `errors.${errObj.code}` as TranslationKey;
      try {
        const translated = t(errorKey, errObj.params);
        if (translated && translated !== errorKey) {
          return translated;
        }
      } catch {
        // Fallthrough
      }
      if (errObj.message) return errObj.message;
    }
  }

  // 3. Error instance
  if (error instanceof Error) {
    if (error.message.includes("Network Error")) {
      return t("errors.networkError");
    }
    return error.message;
  }

  // 4. Plain string fallback
  if (typeof error === "string") {
    return error;
  }

  return t(defaultFallbackKey);
}
