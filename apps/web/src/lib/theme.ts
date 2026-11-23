export const THEME_COOKIE_KEY = "haihire_theme";
export const RESOLVED_THEME_COOKIE_KEY = "haihire_resolved_theme";

export type ThemeMode = "light" | "dark" | "system";

/**
 * Synchronizes user theme selection and resolved color mode to cookies so SSR
 * renders matching `<html>` attributes and ThemeToggle icon from frame 0.
 */
export function syncThemeCookies(mode?: string, resolved?: string): void {
  if (typeof document === "undefined") return;
  try {
    if (mode === "light" || mode === "dark" || mode === "system") {
      document.cookie = `${THEME_COOKIE_KEY}=${mode}; path=/; max-age=31536000; SameSite=Lax`;
    }
    const nextResolved =
      resolved === "light" || resolved === "dark"
        ? resolved
        : mode === "light" || mode === "dark"
          ? mode
          : undefined;
    if (nextResolved) {
      document.cookie = `${RESOLVED_THEME_COOKIE_KEY}=${nextResolved}; path=/; max-age=31536000; SameSite=Lax`;
    }
  } catch {
    // Ignore cookie write errors in restricted browser environments
  }
}
